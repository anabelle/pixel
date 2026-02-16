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
/** True once connection.update fires with connection === "open" */
let isConnectedAndReady = false;
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR ?? "/app/data/whatsapp-auth";

/** Reconnect attempt counter for exponential backoff */
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

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
  });

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

  // Handle incoming messages
  sock.ev.on("messages.upsert", async (event) => {
    if (event.type !== "notify") return;

    for (const msg of event.messages) {
      // Skip messages from self, status broadcasts, or protocol messages
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;
      if (!msg.message) continue;

      // Extract text from various message types
      const text = extractWhatsAppText(msg.message);

      const jid = msg.key.remoteJid!;
      // User ID: phone number without @s.whatsapp.net
      const userId = `wa-${jid.replace("@s.whatsapp.net", "").replace("@g.us", "")}`;
      const isGroup = jid.endsWith("@g.us");

      // Handle audio messages separately (need async transcription)
      if (!text && msg.message?.audioMessage) {
        if (isGroup) continue; // Skip group audio for now
        try {
          console.log(`[whatsapp] Audio message from ${userId}`);
          await sock!.sendPresenceUpdate("composing", jid);

          const audioBuffer = await downloadMediaMessage(msg, "buffer", {}) as Buffer;
          const mimeType = msg.message.audioMessage.mimetype ?? "audio/ogg";
          const duration = msg.message.audioMessage.seconds ?? 0;

          const transcription = await transcribeAudio(audioBuffer, mimeType);
          if (!transcription) {
            await sock!.sendPresenceUpdate("paused", jid);
            await sock!.sendMessage(jid, { text: "I couldn't understand that voice message. Could you type it out?" });
            continue;
          }

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
        } catch (err: any) {
          console.error(`[whatsapp] Audio error for ${userId}:`, err.message);
          try {
            await sock!.sendPresenceUpdate("paused", jid);
            await sock!.sendMessage(jid, { text: "Something broke while processing that voice message." });
          } catch {}
        }
        continue;
      }

      if (!text) continue;

      // In groups, only respond if mentioned or replied to
      if (isGroup) {
        const isReplyToBot = Boolean(msg.message?.extendedTextMessage?.contextInfo?.stanzaId) &&
          msg.message?.extendedTextMessage?.contextInfo?.participant === sock?.user?.id;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const isMentioned = sock?.user?.id ? mentioned.includes(sock.user.id) : false;
        if (!isReplyToBot && !isMentioned) {
          continue;
        }
      }

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

        // WhatsApp message limit is ~65536 chars, but keep it reasonable
        await sock!.sendMessage(jid, { text: response });

        console.log(`[whatsapp] Replied to ${userId} (${response.length} chars)`);
      } catch (err: any) {
        console.error(`[whatsapp] Error for ${userId}:`, err.message);
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
    await sock.sendMessage(jid, { text });
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
      sock.end(undefined);
    } catch {}
    sock = null;
  }

  // Clear auth state only on explicit repair
  clearAuthState();

  // Reset state
  reconnectAttempts = 0;
  isConnectedAndReady = false;
  lastPairingCode = null;
  currentQrString = null;
  isFirstConnect = true; // Allow stale creds check on next connect

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
