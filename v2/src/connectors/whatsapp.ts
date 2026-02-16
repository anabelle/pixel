/**
 * WhatsApp Connector — Baileys wired to Pi agent-core
 *
 * Pattern: receive message → identify user → promptWithHistory → send response
 * Each WhatsApp user gets persistent conversation context via JSONL.
 *
 * Auth: Uses pairing code (no QR scanning needed).
 * Session: Persisted to /app/data/whatsapp-auth/ so it survives container restarts.
 *
 * IMPORTANT: Works with WhatsApp Personal OR WhatsApp Business App.
 * Does NOT work with WhatsApp Business API (Cloud API / WABA) — different protocol.
 * Phone number must be digits-only with country code (e.g., 573001234567, NOT +573001234567).
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
  type GroupMetadata,
  Browsers,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { promptWithHistory } from "../agent.js";
import { transcribeAudio } from "../services/audio.js";
import { textToSpeech, isSuitableForVoice } from "../services/tts.js";
import { existsSync, rmSync } from "fs";

let sock: WASocket | null = null;
/** Mutable ref so cachedGroupMetadata closure can call sock.groupMetadata */
let sockRef: WASocket | null = null;
/** True once connection.update fires with connection === "open" */
let isConnectedAndReady = false;
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR ?? "/app/data/whatsapp-auth";

/** Group metadata cache — avoids live queries on every group send */
const groupMetadataCache = new Map<string, { metadata: GroupMetadata; timestamp: number }>();
const GROUP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Reconnect attempt counter for exponential backoff */
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// ─── Group message batching (like Telegram) ────────────────────
// Every group message is queued; after a quiet window the batch is
// sent to the LLM which decides whether to reply or output [SILENT].
const WA_BATCH_WINDOW_MS = 20_000; // 20 seconds
const WA_BATCH_MAX = 10;           // max messages per batch
const WA_BATCH_MAX_CHARS = 2000;   // max chars sent to LLM

/** Strip LLM artifacts that leak from batch/control prompts */
function cleanResponse(text: string): string {
  return text.replace(/^\[BATCHED\]\s*/i, "").replace(/^\[BATCH\]\s*/i, "").trim();
}

interface WaBatchEntry {
  items: string[];
  timer: ReturnType<typeof setTimeout> | null;
  groupJid: string;
  conversationId: string;
}
const waGroupBuffers = new Map<string, WaBatchEntry>();

/** Queue a group message for batched processing */
function queueGroupMessage(groupJid: string, conversationId: string, line: string): void {
  const entry = waGroupBuffers.get(groupJid) ?? { items: [], timer: null, groupJid, conversationId };
  entry.items.push(line);

  if (entry.items.length > WA_BATCH_MAX) {
    entry.items = entry.items.slice(-WA_BATCH_MAX);
  }

  if (entry.timer) clearTimeout(entry.timer);

  entry.timer = setTimeout(() => {
    flushGroupMessages(groupJid).catch((err) => {
      console.error("[whatsapp] Group flush failed:", err.message);
    });
  }, WA_BATCH_WINDOW_MS);

  waGroupBuffers.set(groupJid, entry);
}

/** Flush batched group messages — send to LLM, respect [SILENT] */
async function flushGroupMessages(groupJid: string): Promise<void> {
  const entry = waGroupBuffers.get(groupJid);
  if (!entry || entry.items.length === 0) return;

  const items = entry.items.slice();
  entry.items = [];
  entry.timer = null;
  waGroupBuffers.set(groupJid, entry);

  const joined = items.join("\n");
  const trimmed = joined.length > WA_BATCH_MAX_CHARS
    ? joined.slice(-WA_BATCH_MAX_CHARS)
    : joined;

  const prompt = `Recent WhatsApp group messages (batched):\n${trimmed}\n\nRespond once to the batch if useful. If nothing to add, output [SILENT].`;

  try {
    await sock?.sendPresenceUpdate("composing", groupJid);

    const rawResponse = await promptWithHistory(
      { userId: entry.conversationId, platform: "whatsapp", chatId: groupJid },
      prompt
    );

    await sock?.sendPresenceUpdate("paused", groupJid);

    if (!rawResponse || rawResponse.includes("[SILENT]")) {
      console.log(`[whatsapp] Group ${groupJid} — [SILENT] (${items.length} msgs batched)`);
      return;
    }

    const response = cleanResponse(rawResponse);
    if (response) {
      try {
        await sock!.sendMessage(groupJid, { text: response });
      } catch (sendErr: any) {
        if (sendErr?.message?.includes("No sessions") || sendErr?.message?.includes("not-acceptable")) {
          console.log(`[whatsapp] Group send failed (${sendErr.message}) — clearing cache and retrying...`);
          groupMetadataCache.delete(groupJid);
          await new Promise(r => setTimeout(r, 2000));
          await sock!.sendMessage(groupJid, { text: response });
        } else {
          throw sendErr;
        }
      }
      console.log(`[whatsapp] Group reply to ${groupJid} (${response.length} chars, ${items.length} msgs batched)`);
    }
  } catch (err: any) {
    console.error(`[whatsapp] Group flush error for ${groupJid}:`, err.message, err.stack?.split("\n").slice(0, 3).join("\n"));
    try { await sock?.sendPresenceUpdate("paused", groupJid); } catch {}
  }
}

/** Last pairing code for API retrieval */
let lastPairingCode: string | null = null;
let lastPairingTime: number = 0;

/** Current QR code string for web-based scanning */
let currentQrString: string | null = null;
let qrTimestamp: number = 0;

/** Whether to use QR mode (true) or pairing code mode (false) */
let useQrMode = true;

/** Track whether this is the first connection attempt (for stale creds check) */
let isFirstConnect = true;

/** Clean phone number to digits only (strip +, spaces, dashes) */
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Clear auth state to force fresh pairing */
function clearAuthState(): void {
  try {
    if (existsSync(AUTH_DIR)) {
      rmSync(AUTH_DIR, { recursive: true, force: true });
      console.log("[whatsapp] Cleared auth state for fresh pairing");
    }
  } catch (err: any) {
    console.error("[whatsapp] Failed to clear auth state:", err.message);
  }
}

// NOTE: We do NOT auto-clear auth on logout. This prevents unexpected QR invalidation.

/** Start the WhatsApp connector */
export async function startWhatsApp(): Promise<void> {
  const rawPhone = process.env.WHATSAPP_PHONE_NUMBER;
  if (!rawPhone) {
    console.log("[whatsapp] No WHATSAPP_PHONE_NUMBER set, skipping");
    return;
  }

  const phoneNumber = cleanPhoneNumber(rawPhone);
  console.log(`[whatsapp] Phone number: ${phoneNumber} (cleaned from ${rawPhone})`);

  await connectToWhatsApp(phoneNumber);
}

/** Join a WhatsApp group by invite code */
export async function joinWhatsAppGroup(inviteCode: string): Promise<{ ok: boolean; jid?: string; error?: string }> {
  if (!sock) {
    return { ok: false, error: "WhatsApp socket not initialized" };
  }
  if (!isConnectedAndReady) {
    return { ok: false, error: "WhatsApp not connected (pairing required)" };
  }
  try {
    const code = inviteCode.trim();
    const jid = await sock.groupAcceptInvite(code);
    console.log(`[whatsapp] Joined group via invite (${code}) -> ${jid}`);
    return { ok: true, jid };
  } catch (err: any) {
    console.error("[whatsapp] Failed to join group:", err.message);
    return { ok: false, error: err?.message ?? "unknown error" };
  }
}

/** Connect (and reconnect) to WhatsApp */
async function connectToWhatsApp(phoneNumber: string): Promise<void> {
  // On first connect, just log the state — we no longer clear "stale" creds
  // because registered=false with me.id is a valid Baileys state after pairing
  if (isFirstConnect) {
    isFirstConnect = false;
    try {
      const credsPath = `${AUTH_DIR}/creds.json`;
      if (existsSync(credsPath)) {
        const raw = await Bun.file(credsPath).text();
        const creds = JSON.parse(raw);
        console.log(`[whatsapp] First boot: registered=${creds.registered}, has me=${!!creds.me}`);
      }
    } catch {}
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`[whatsapp] Using Baileys version: ${version.join(".")}, registered: ${state.creds.registered}`);

  sock = makeWASocket({
    version,
    auth: state,
    // CRITICAL: Must use macOS/Chrome for pairing code to work.
    // Baileys wiki: "only set a valid/logical browser config, otherwise the pair will fail"
    browser: Browsers.macOS("Chrome"),
    printQRInTerminal: true,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    // Return undefined to SKIP retries — returning { conversation: "" } causes
    // sender-key-memory resets that cascade into "No sessions" errors for groups
    getMessage: async (_key: any) => {
      return undefined;
    },
    // Provide cached group metadata so relayMessage doesn't do live queries
    // on every group send. Also ensures participant list is available for
    // assertSessions() to establish Signal sessions.
    cachedGroupMetadata: async (jid: string) => {
      const cached = groupMetadataCache.get(jid);
      if (cached && Date.now() - cached.timestamp < GROUP_CACHE_TTL) {
        return cached.metadata;
      }
      if (!sockRef) return undefined;
      try {
        const metadata = await sockRef.groupMetadata(jid);
        groupMetadataCache.set(jid, { metadata, timestamp: Date.now() });
        return metadata;
      } catch {
        return undefined;
      }
    },
  });
  sockRef = sock;

  // Track if we've already requested pairing code to avoid duplicates
  let pairingCodeRequested = false;

  // Connection updates
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      isConnectedAndReady = false;
      console.log(
        `[whatsapp] Connection closed (status: ${statusCode}), reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        // Exponential backoff: 3s, 6s, 12s, 24s... max 60s
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 60000);
        console.log(`[whatsapp] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => connectToWhatsApp(phoneNumber), delay);
      } else if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        console.log("[whatsapp] Logged out — auth state preserved. Manual repair required to re-pair.");
        reconnectAttempts = 0;
      } else {
        console.log(`[whatsapp] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
      }
    } else if (connection === "open") {
      console.log("[whatsapp] ✅ Connected successfully!");
      isConnectedAndReady = true;
      reconnectAttempts = 0; // Reset on successful connection

      // Pre-warm group metadata cache so first group send has Signal sessions ready
      try {
        const groups = await sock!.groupFetchAllParticipating();
        for (const [jid, metadata] of Object.entries(groups)) {
          groupMetadataCache.set(jid, { metadata, timestamp: Date.now() });
          // Debug: log participant IDs to understand format (LID vs phone)
          const pids = metadata.participants.map((p: any) => p.id).join(", ");
          console.log(`[whatsapp] Group ${jid} participants: ${pids}`);
        }
        console.log(`[whatsapp] Cached metadata for ${Object.keys(groups).length} groups`);
      } catch (err: any) {
        console.error("[whatsapp] Failed to pre-warm group cache:", err.message);
      }
    }

    // When we get a QR code event
    if (qr && !state.creds.registered) {
      // Always store the QR string for web-based scanning
      currentQrString = qr;
      qrTimestamp = Date.now();
      console.log(`[whatsapp] QR code updated — scan at https://pixel.xx.kg/v2/api/whatsapp/qr`);

      if (!useQrMode && !pairingCodeRequested) {
        // Pairing code mode — request a code instead of QR
        pairingCodeRequested = true;
        try {
          console.log(`[whatsapp] Requesting pairing code for ${phoneNumber}...`);
          const code = await sock!.requestPairingCode(phoneNumber);
          lastPairingCode = code;
          lastPairingTime = Date.now();
          console.log(`[whatsapp] ========================================`);
          console.log(`[whatsapp] 🔑 PAIRING CODE: ${code}`);
          console.log(`[whatsapp]`);
          console.log(`[whatsapp] On your phone, open WhatsApp and go to:`);
          console.log(`[whatsapp]   Settings > Linked Devices > Link a Device`);
          console.log(`[whatsapp]   Then tap "Link with phone number instead"`);
          console.log(`[whatsapp]   Enter the code above`);
          console.log(`[whatsapp]`);
          console.log(`[whatsapp] ⏰ Code expires in ~60 seconds!`);
          console.log(`[whatsapp] ========================================`);
        } catch (err: any) {
          console.error(`[whatsapp] Failed to request pairing code:`, err.message);
          console.log(`[whatsapp] Falling back to QR mode — scan at https://pixel.xx.kg/v2/api/whatsapp/qr`);
        }
      }
    }
  });

  // Save credentials when updated
  sock.ev.on("creds.update", saveCreds);

  // Invalidate group cache when participants change so next send fetches fresh metadata
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    console.log(`[whatsapp] Group ${id} participants ${action}: ${participants.join(", ")}`);
    groupMetadataCache.delete(id);
  });

  // Handle incoming messages
  sock.ev.on("messages.upsert", async (event) => {
    if (event.type !== "notify") return;

    for (const msg of event.messages) {
      // Skip messages from self, status broadcasts, or protocol messages
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;
      if (!msg.message) continue;

      // DEBUG: Log every incoming message JID to understand group format
      const rawJid = msg.key.remoteJid ?? "(none)";
      const rawParticipant = msg.key.participant ?? "(none)";
      const msgType = Object.keys(msg.message).filter(k => k !== "messageContextInfo").join(",") || "unknown";
      console.log(`[whatsapp] RAW incoming — jid: ${rawJid}, participant: ${rawParticipant}, type: ${msgType}`);

      // Extract text from various message types
      const text = extractWhatsAppText(msg.message);

      const jid = msg.key.remoteJid!;
      // User ID: phone number without @s.whatsapp.net
      const userId = `wa-${jid.replace("@s.whatsapp.net", "").replace("@g.us", "").replace("@lid", "")}`;
      const isGroup = jid.endsWith("@g.us") || (msg.key.participant !== undefined && msg.key.participant !== null);

      // Handle audio messages separately (need async transcription)
      if (!text && msg.message?.audioMessage) {
        try {
          console.log(`[whatsapp] Audio message from ${userId} (group=${isGroup})`);
          await sock!.sendPresenceUpdate("composing", jid);

          const audioBuffer = await downloadMediaMessage(msg, "buffer", {}) as Buffer;
          const mimeType = msg.message.audioMessage.mimetype ?? "audio/ogg";
          const duration = msg.message.audioMessage.seconds ?? 0;

          const transcription = await transcribeAudio(audioBuffer, mimeType);
          if (!transcription) {
            await sock!.sendPresenceUpdate("paused", jid);
            if (!isGroup) {
              await sock!.sendMessage(jid, { text: "I couldn't understand that voice message. Could you type it out?" });
            }
            continue;
          }

          if (isGroup) {
            // Groups: send transcription to LLM with sender context + [SILENT] check
            const senderName = msg.pushName ?? msg.key.participant?.split("@")[0] ?? "someone";
            const conversationId = `wa-group-${jid.replace("@g.us", "")}`;
            const formatted = `${senderName}: [voice message, ${duration}s]: ${transcription}`;

            const rawResponse = await promptWithHistory(
              { userId: conversationId, platform: "whatsapp", chatId: jid },
              formatted
            );

            await sock!.sendPresenceUpdate("paused", jid);

            if (!rawResponse || rawResponse.includes("[SILENT]")) {
              console.log(`[whatsapp] Group voice — [SILENT]`);
              continue;
            }

            const response = cleanResponse(rawResponse);
            if (response) {
              try {
                await sock!.sendMessage(jid, { text: response });
              } catch (sendErr: any) {
                if (sendErr?.message?.includes("No sessions") || sendErr?.message?.includes("not-acceptable")) {
                  groupMetadataCache.delete(jid);
                  await new Promise(r => setTimeout(r, 2000));
                  await sock!.sendMessage(jid, { text: response });
                } else {
                  throw sendErr;
                }
              }
              console.log(`[whatsapp] Group voice reply to ${jid} (${response.length} chars)`);
            }
          } else {
            // DMs: direct prompt + optional voice reply
            const formatted = `[voice message, ${duration}s]: ${transcription}`;
            const response = await promptWithHistory(
              { userId, platform: "whatsapp", chatId: jid.replace("@s.whatsapp.net", "") },
              formatted
            );

            await sock!.sendPresenceUpdate("paused", jid);

            if (!response) {
              await sock!.sendMessage(jid, { text: "Brain glitch. Try again in a moment." });
              continue;
            }

            // Voice in → voice out (if content is suitable)
            if (isSuitableForVoice(response)) {
              try {
                const voiceBuffer = await textToSpeech(response);
                if (voiceBuffer) {
                  await sock!.sendMessage(jid, { audio: voiceBuffer, mimetype: "audio/ogg; codecs=opus", ptt: true });
                  // Also send text for accessibility
                  await sock!.sendMessage(jid, { text: response }).catch(() => {});
                  console.log(`[whatsapp] Voice reply to ${userId} (${voiceBuffer.byteLength} bytes)`);
                  continue;
                }
              } catch (ttsErr: any) {
                console.error(`[whatsapp] TTS failed, falling back to text:`, ttsErr.message);
              }
            }

            await sock!.sendMessage(jid, { text: response });
            console.log(`[whatsapp] Replied to voice from ${userId} (${response.length} chars)`);
          }
        } catch (err: any) {
          console.error(`[whatsapp] Audio error for ${userId}:`, err.message);
          try {
            await sock!.sendPresenceUpdate("paused", jid);
            if (!isGroup) {
              await sock!.sendMessage(jid, { text: "Something broke while processing that voice message." });
            }
          } catch {}
        }
        continue;
      }

      // Handle image messages (vision) — download + send to LLM with caption
      const imageMsg = msg.message?.imageMessage;
      if (imageMsg) {
        const caption = imageMsg.caption?.trim() ?? "";
        const baseText = caption ? `Image with caption: ${caption}` : "Image received.";

        try {
          console.log(`[whatsapp] Image message from ${userId} (caption: "${caption.slice(0, 40)}")`);

          const imgBuffer = await downloadMediaMessage(msg, "buffer", {}) as Buffer;
          const rawMime = imageMsg.mimetype ?? "image/jpeg";
          const mimeType = rawMime.split(";")[0] || "image/jpeg";
          const base64 = imgBuffer.toString("base64");

          console.log(`[whatsapp] Image downloaded: ${imgBuffer.byteLength} bytes, ${mimeType}`);

          if (isGroup) {
            // Groups: queue with image note (can't batch binary images, but the LLM
            // gets the image via promptWithHistory and the batch gets the text note)
            const senderName = msg.pushName ?? msg.key.participant?.split("@")[0] ?? "someone";
            const conversationId = `wa-group-${jid.replace("@g.us", "")}`;
            const line = `${senderName}: [sent an image${caption ? `: ${caption}` : ""}]`;

            // For group images, send directly to LLM (not batched) since we have binary data
            console.log(`[whatsapp] Group image from ${senderName} in ${jid}`);
            await sock!.sendPresenceUpdate("composing", jid);

            const rawResponse = await promptWithHistory(
              { userId: conversationId, platform: "whatsapp", chatId: jid },
              line,
              [{ type: "image", data: base64, mimeType }]
            );

            await sock!.sendPresenceUpdate("paused", jid);

            if (!rawResponse || rawResponse.includes("[SILENT]")) {
              console.log(`[whatsapp] Group image — [SILENT]`);
              continue;
            }

            const response = cleanResponse(rawResponse);
            if (response) {
              try {
                await sock!.sendMessage(jid, { text: response });
              } catch (sendErr: any) {
                if (sendErr?.message?.includes("No sessions") || sendErr?.message?.includes("not-acceptable")) {
                  groupMetadataCache.delete(jid);
                  await new Promise(r => setTimeout(r, 2000));
                  await sock!.sendMessage(jid, { text: response });
                } else {
                  throw sendErr;
                }
              }
              console.log(`[whatsapp] Group image reply to ${jid} (${response.length} chars)`);
            }
          } else {
            // DMs: send image directly to LLM
            await sock!.sendPresenceUpdate("composing", jid);

            const response = await promptWithHistory(
              { userId, platform: "whatsapp", chatId: jid.replace("@s.whatsapp.net", "") },
              baseText,
              [{ type: "image", data: base64, mimeType }]
            );

            await sock!.sendPresenceUpdate("paused", jid);

            if (!response) {
              await sock!.sendMessage(jid, { text: "Brain glitch. Try again in a moment." });
              continue;
            }

            await sock!.sendMessage(jid, { text: response });
            console.log(`[whatsapp] Image reply to ${userId} (${response.length} chars)`);
          }
        } catch (err: any) {
          console.error(`[whatsapp] Image error for ${userId}:`, err.message, err.stack?.split("\n").slice(0, 3).join("\n"));
          try {
            await sock!.sendPresenceUpdate("paused", jid);
            if (!isGroup) {
              await sock!.sendMessage(jid, { text: "Something broke while looking at that image." });
            }
          } catch {}
        }
        continue;
      }

      if (!text) continue;

      // ─── GROUP MESSAGES: batch like Telegram ───────────────────
      if (isGroup) {
        const senderName = msg.pushName ?? msg.key.participant?.split("@")[0] ?? "someone";
        const conversationId = `wa-group-${jid.replace("@g.us", "")}`;

        // Check if bot was @mentioned or replied-to (for context annotation)
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo
          ?? msg.message?.imageMessage?.contextInfo
          ?? msg.message?.videoMessage?.contextInfo
          ?? undefined;

        const mentionedRaw = contextInfo?.mentionedJid ?? [];
        const replyParticipant = contextInfo?.participant ?? "";
        const myId = sock?.user?.id ?? "";
        const myPhone = myId.split(":")[0].split("@")[0];
        const myLid = (sock as any)?.authState?.creds?.me?.lid ?? "";
        const myLidBase = myLid.split(":")[0].split("@")[0];

        const isReplyToBot = Boolean(contextInfo?.stanzaId) &&
          (replyParticipant === myId ||
           replyParticipant.startsWith(myPhone) ||
           (myLidBase && replyParticipant.startsWith(myLidBase)));

        const isMentioned = mentionedRaw.some((mjid: string) => {
          const mentionBase = mjid.split(":")[0].split("@")[0];
          return mentionBase === myPhone || (myLidBase && mentionBase === myLidBase);
        });

        const textMention = (text?.includes(`@${myPhone}`) || (myLidBase && text?.includes(`@${myLidBase}`))) ?? false;
        const addressed = isReplyToBot || isMentioned || textMention;

        // Format line with sender context — indicate when Pixel is being addressed
        let line: string;
        if (addressed) {
          line = `${senderName} (addressing you): ${text}`;
        } else {
          line = `${senderName}: ${text}`;
        }

        console.log(`[whatsapp] GROUP queue — ${jid} — ${line.slice(0, 80)} (addressed=${addressed})`);

        // If directly addressed, flush immediately after queuing
        queueGroupMessage(jid, conversationId, line);
        if (addressed) {
          // Clear the timer and flush now so the user gets a fast reply
          const entry = waGroupBuffers.get(jid);
          if (entry?.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
          }
          flushGroupMessages(jid).catch((err) => {
            console.error("[whatsapp] Immediate flush failed:", err.message);
          });
        }
        continue;
      }

      // ─── DM MESSAGES: direct prompt (unchanged) ───────────────
      console.log(`[whatsapp] Message from ${userId}: ${text.slice(0, 80)}`);

      try {
        // Show typing indicator
        await sock!.sendPresenceUpdate("composing", jid);

        const response = await promptWithHistory(
          { userId, platform: "whatsapp", chatId: jid.replace("@s.whatsapp.net", "") },
          text
        );

        // Clear typing indicator
        await sock!.sendPresenceUpdate("paused", jid);

        if (!response) {
          await sock!.sendMessage(jid, { text: "Brain glitch. Try again in a moment." });
          continue;
        }

        // Check if user asked for voice reply (text → voice on request)
        const wantsVoice = /\b(h[aá]blame|mand[aá]?me? (?:un )?(?:audio|voz|nota de voz)|send (?:me )?(?:a )?(?:voice|audio)|speak|respond(?:e|é)? (?:con|en|with) (?:voz|audio|voice))\b/i.test(text);
        if (wantsVoice && isSuitableForVoice(response)) {
          try {
            const voiceBuffer = await textToSpeech(response);
            if (voiceBuffer) {
              await sock!.sendMessage(jid, { audio: voiceBuffer, mimetype: "audio/ogg; codecs=opus", ptt: true });
              await sock!.sendMessage(jid, { text: response }).catch(() => {});
              console.log(`[whatsapp] Voice reply to ${userId} (${voiceBuffer.byteLength} bytes)`);
              continue;
            }
          } catch (ttsErr: any) {
            console.error(`[whatsapp] TTS failed on text request, falling back:`, ttsErr.message);
          }
        }

        try {
          await sock!.sendMessage(jid, { text: response });
        } catch (sendErr: any) {
          if (sendErr?.message?.includes("No sessions") || sendErr?.message?.includes("not-acceptable")) {
            console.log(`[whatsapp] DM send failed (${sendErr.message}) — retrying...`);
            await new Promise(r => setTimeout(r, 2000));
            await sock!.sendMessage(jid, { text: response });
          } else {
            throw sendErr;
          }
        }

        console.log(`[whatsapp] Replied to ${userId} (${response.length} chars)`);
      } catch (err: any) {
        console.error(`[whatsapp] Error for ${userId}:`, err.message, err.stack?.split("\n").slice(0, 5).join("\n"));
        try {
          await sock!.sendPresenceUpdate("paused", jid);
          await sock!.sendMessage(jid, { text: "Something broke. I'll be back in a moment." });
        } catch {}
      }
    }
  });

  console.log("[whatsapp] Starting...");
}

/**
 * Send a proactive message to a specific WhatsApp user.
 * Used by reminder service and other proactive notifications.
 *
 * @param phoneNumber - Full phone number with country code (e.g., +573001234567)
 * @param text - Message text to send
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  text: string
): Promise<boolean> {
  if (!sock) {
    console.log("[whatsapp] No sock available for sending message");
    return false;
  }

  if (!isConnectedAndReady) {
    console.log("[whatsapp] Not connected — cannot send message");
    return false;
  }

  try {
    const clean = phoneNumber.trim();
    const jid = clean.includes("@")
      ? clean
      : `${clean.replace(/\D/g, "")}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    return true;
  } catch (err: any) {
    console.error(`[whatsapp] Failed to send message to ${phoneNumber}:`, err.message);
    return false;
  }
}

/** Send an image to a WhatsApp user or group */
export async function sendWhatsAppImage(
  target: string,
  image: Buffer,
  caption?: string,
  mimeType?: string
): Promise<boolean> {
  if (!sock) {
    console.log("[whatsapp] No sock available for sending image");
    return false;
  }
  if (!isConnectedAndReady) {
    console.log("[whatsapp] Not connected — cannot send image");
    return false;
  }

  try {
    const clean = target.trim();
    const jid = clean.includes("@")
      ? clean
      : `${clean.replace(/\D/g, "")}@s.whatsapp.net`;
    await sock.sendMessage(jid, { image, caption, mimetype: mimeType });
    return true;
  } catch (err: any) {
    console.error(`[whatsapp] Failed to send image to ${target}:`, err.message);
    return false;
  }
}

/** Send a proactive message to a WhatsApp group JID (@g.us) */
export async function sendWhatsAppGroupMessage(
  groupJid: string,
  text: string
): Promise<boolean> {
  if (!sock) {
    console.log("[whatsapp] No sock available for sending group message");
    return false;
  }
  if (!isConnectedAndReady) {
    console.log("[whatsapp] Not connected — cannot send group message");
    return false;
  }
  try {
    const jid = groupJid.includes("@") ? groupJid : `${groupJid}@g.us`;
    try {
      await sock.sendMessage(jid, { text });
    } catch (sendErr: any) {
      if (sendErr?.message?.includes("No sessions") || sendErr?.message?.includes("not-acceptable")) {
        console.log(`[whatsapp] Group send failed (${sendErr.message}) — clearing cache and retrying...`);
        groupMetadataCache.delete(jid);
        await new Promise(r => setTimeout(r, 2000));
        await sock.sendMessage(jid, { text });
      } else {
        throw sendErr;
      }
    }
    return true;
  } catch (err: any) {
    console.error(`[whatsapp] Failed to send group message to ${groupJid}:`, err.message);
    return false;
  }
}

/** Extract text content from various WhatsApp message types */
function extractWhatsAppText(message: any): string | null {
  if (!message) return null;

  // Direct text message
  if (message.conversation) return message.conversation;

  // Extended text (with link preview, etc.)
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;

  // Image/video/document with caption
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;

  // Audio messages are handled separately in the message handler (need async transcription)
  // Stickers and other media types are not yet supported
  return null;
}

/** Get WhatsApp connection status */
export function getWhatsAppStatus(): {
  connected: boolean;
  registered: boolean;
  lastPairingCode: string | null;
  lastPairingTime: number;
  reconnectAttempts: number;
  hasQr: boolean;
  qrAge: number;
  mode: "qr" | "pairing";
} {
  return {
    connected: sock !== null,
    registered: isConnectedAndReady,
    lastPairingCode,
    lastPairingTime,
    reconnectAttempts,
    hasQr: currentQrString !== null && (Date.now() - qrTimestamp) < 60000,
    qrAge: currentQrString ? Math.round((Date.now() - qrTimestamp) / 1000) : -1,
    mode: useQrMode ? "qr" : "pairing",
  };
}

/** Get current QR code string for rendering */
export function getWhatsAppQr(): { qr: string | null; timestamp: number; expired: boolean } {
  const expired = !currentQrString || (Date.now() - qrTimestamp) > 60000;
  return { qr: currentQrString, timestamp: qrTimestamp, expired };
}

/**
 * Force re-pair: clear auth state, close existing connection, reconnect.
 * Returns status object with QR or pairing code.
 */
export async function repairWhatsApp(mode?: "qr" | "pairing"): Promise<{ mode: string; pairingCode?: string; qrAvailable?: boolean; message: string }> {
  const rawPhone = process.env.WHATSAPP_PHONE_NUMBER;
  if (!rawPhone) return { mode: "none", message: "No WHATSAPP_PHONE_NUMBER set" };

  if (mode) useQrMode = mode === "qr";
  const phoneNumber = cleanPhoneNumber(rawPhone);

  // Close existing socket
  if (sock) {
    try {
      sock.ev.removeAllListeners("connection.update");
      sock.ev.removeAllListeners("creds.update");
      sock.ev.removeAllListeners("messages.upsert");
      sock.ev.removeAllListeners("group-participants.update");
      sock.end(undefined);
    } catch {}
    sock = null;
    sockRef = null;
  }

  // Clear auth state only on explicit repair
  clearAuthState();

  // Reset state
  reconnectAttempts = 0;
  isConnectedAndReady = false;
  lastPairingCode = null;
  currentQrString = null;
  isFirstConnect = true; // Allow stale creds check on next connect
  groupMetadataCache.clear(); // Clear group cache on repair

  // Wait a moment before reconnecting
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Reconnect
  console.log(`[whatsapp] Re-pairing initiated (mode: ${useQrMode ? "qr" : "pairing"})...`);
  connectToWhatsApp(phoneNumber);

  // Wait for QR or pairing code (up to 15s)
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (useQrMode && currentQrString) {
      return { mode: "qr", qrAvailable: true, message: "QR ready — scan at https://pixel.xx.kg/v2/api/whatsapp/qr" };
    }
    if (!useQrMode && lastPairingCode && lastPairingTime > Date.now() - 60000) {
      return { mode: "pairing", pairingCode: lastPairingCode, message: "Enter this code on your phone" };
    }
  }

  return { mode: useQrMode ? "qr" : "pairing", message: "Timed out — check logs" };
}
