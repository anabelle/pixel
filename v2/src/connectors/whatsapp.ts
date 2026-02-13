/**
 * WhatsApp Connector — Baileys wired to Pi agent-core
 *
 * Pattern: receive message → identify user → promptWithHistory → send response
 * Each WhatsApp user gets persistent conversation context via JSONL.
 *
 * Auth: Uses pairing code (no QR scanning needed).
 * Session: Persisted to /app/data/whatsapp-auth/ so it survives container restarts.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
  Browsers,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { promptWithHistory } from "../agent.js";

let sock: WASocket | null = null;
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR ?? "/app/data/whatsapp-auth";

/** Start the WhatsApp connector */
export async function startWhatsApp(): Promise<void> {
  const phoneNumber = process.env.WHATSAPP_PHONE_NUMBER;
  if (!phoneNumber) {
    console.log("[whatsapp] No WHATSAPP_PHONE_NUMBER set, skipping");
    return;
  }

  await connectToWhatsApp(phoneNumber);
}

/** Connect (and reconnect) to WhatsApp */
async function connectToWhatsApp(phoneNumber: string): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.ubuntu("Pixel"),
    printQRInTerminal: true,
    markOnlineOnConnect: false, // Don't show as "online" (saves battery + notifications work)
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

      console.log(
        `[whatsapp] Connection closed (status: ${statusCode}), reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        // Reconnect after a short delay
        setTimeout(() => connectToWhatsApp(phoneNumber), 3000);
      } else {
        console.log("[whatsapp] Logged out. Delete auth dir and restart to re-pair.");
      }
    } else if (connection === "open") {
      console.log("[whatsapp] Connected successfully");
    }

    // When we get a QR code, print instructions
    if (qr && !state.creds.registered) {
      console.log(`[whatsapp] ========================================`);
      console.log(`[whatsapp] QR CODE READY - Scan with WhatsApp`);
      console.log(`[whatsapp] Go to: Settings > Linked Devices > Link a Device`);
      console.log(`[whatsapp] The QR code should appear above (terminal QR)`);
      console.log(`[whatsapp] ========================================`);
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
      if (!text) continue;

      const jid = msg.key.remoteJid!;
      // User ID: phone number without @s.whatsapp.net
      const userId = `wa-${jid.replace("@s.whatsapp.net", "").replace("@g.us", "")}`;
      const isGroup = jid.endsWith("@g.us");

      // In groups, only respond if mentioned or replied to
      if (isGroup) {
        // TODO: implement group mention detection
        // For now, skip group messages
        continue;
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

  try {
    const jid = `${phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    return true;
  } catch (err: any) {
    console.error(`[whatsapp] Failed to send message to ${phoneNumber}:`, err.message);
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

  // TODO: handle audio messages (transcription), stickers, etc.
  return null;
}
