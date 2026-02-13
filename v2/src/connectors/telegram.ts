/**
 * Telegram Connector — grammY bot wired to Pi agent-core
 *
 * Pattern: receive message → identify user → promptWithHistory → send response
 * Each Telegram user gets persistent conversation context via JSONL.
 *
 * Also exports sendTelegramMessage() for proactive notifications
 * (heartbeat digests, audit alerts, revenue events, inner life updates).
 */

import { Bot } from "grammy";
import { promptWithHistory } from "../agent.js";
import { appendToLog, loadContext, saveContext } from "../conversations.js";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

// ============================================================
// Module-level bot instance for proactive messaging
// ============================================================

let botInstance: Bot | null = null;
let botUsername: string | null = null;
let botId: number | null = null;
const groupActivity = new Map<number, { lastActivity: number; lastPing: number | null }>();
const chatBuffers = new Map<number, { items: string[]; timer: ReturnType<typeof setTimeout> | null; conversationId: string; chatTitle?: string }>();
const GROUP_IDLE_MS = 24 * 60 * 60 * 1000; // 24 hours
const GROUP_PING_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const GROUP_PING_CHECK_MS = 10 * 60 * 1000; // 10 minutes
const REACTION_REPLY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
const groupReactionReply = new Map<number, { lastReply: number | null; messageIds: Set<number> }>();
const CHAT_BATCH_WINDOW_MS = 20_000; // 20 seconds to batch fast follow-up messages
const CHAT_BATCH_MAX = 8;
const CHAT_BATCH_MAX_CHARS = 1600;

/** Owner's Telegram chat ID — receives proactive notifications */
const OWNER_CHAT_ID = process.env.OWNER_TELEGRAM_ID ?? "";

/** Data directory for conversations */
const DATA_DIR = process.env.DATA_DIR || "/app/conversations";

/**
 * Initialize groupActivity Map from existing log.jsonl files.
 * This ensures 24h ping works correctly after container restarts.
 */
function initializeGroupActivityFromLogs(): void {
  const conversationsDir = DATA_DIR;
  if (!existsSync(conversationsDir)) {
    console.log("[telegram] No conversations directory found, skipping group activity restore");
    return;
  }

  try {
    const entries = readdirSync(conversationsDir, { withFileTypes: true });
    let restoredCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("tg-group-")) continue;

      const logPath = join(conversationsDir, entry.name, "log.jsonl");
      if (!existsSync(logPath)) continue;

      try {
        const content = readFileSync(logPath, "utf-8");
        const lines = content.trim().split("\n").filter(Boolean);
        if (lines.length === 0) continue;

        const lastEntry = JSON.parse(lines[lines.length - 1]);
        if (!lastEntry.ts) continue;

        // Extract chat ID from directory name (tg-group-{id})
        const chatId = parseInt(entry.name.replace("tg-group-", ""), 10);
        if (isNaN(chatId)) continue;

        const lastActivity = new Date(lastEntry.ts).getTime();
        const idleHours = Math.round((Date.now() - lastActivity) / 3_600_000);

        // Restore to groupActivity Map
        groupActivity.set(chatId, { lastActivity, lastPing: null });
        restoredCount++;

        console.log(`[telegram] Restored group ${chatId}: last activity ${idleHours}h ago (${lastEntry.ts})`);
      } catch (err: any) {
        console.error(`[telegram] Failed to restore activity for ${entry.name}:`, err.message);
      }
    }

    console.log(`[telegram] Restored ${restoredCount} group(s) from logs`);
  } catch (err: any) {
    console.error("[telegram] Failed to initialize group activity from logs:", err.message);
  }
}

/**
 * Send a proactive message to a specific Telegram chat.
 * Used by audit, digest, and notification services.
 *
 * @param chatId - Telegram chat ID (numeric string or number)
 * @param text - Message text (supports Telegram markdown)
 * @param parseMode - Optional parse mode ("Markdown" or "HTML")
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode?: "Markdown" | "HTML"
): Promise<boolean> {
  if (!botInstance) return false;

  try {
    // Split long messages (Telegram limit is 4096 chars)
    const chunks = text.length <= 4096 ? [text] : splitMessage(text, 4096);
    for (const chunk of chunks) {
      await sendWithRetry(chatId, chunk, parseMode);
    }
    return true;
  } catch (err: any) {
    console.error(`[telegram] Failed to send message to ${chatId}:`, err.message);
    return false;
  }
}

/** Retry wrapper for Telegram sends (handles transient 429/5xx) */
async function sendWithRetry(chatId: string | number, text: string, parseMode?: "Markdown" | "HTML") {
  const attempts = [0, 500, 2000];
  let lastError: any;
  for (const delay of attempts) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      await botInstance?.api.sendMessage(chatId, text, { parse_mode: parseMode });
      return;
    } catch (err: any) {
      lastError = err;
      const code = err?.response?.error_code ?? err?.status ?? "?";
      if (code === 429 || (typeof code === "number" && code >= 500)) {
        continue; // retry
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Send a proactive message to the owner (human operator).
 * Convenience wrapper — uses OWNER_TELEGRAM_ID from env.
 */
export async function notifyOwner(text: string, parseMode?: "Markdown" | "HTML"): Promise<boolean> {
  if (!OWNER_CHAT_ID) {
    console.log("[telegram] No OWNER_TELEGRAM_ID set, cannot notify owner");
    return false;
  }
  return sendTelegramMessage(OWNER_CHAT_ID, text, parseMode);
}

/** Check if proactive messaging is available */
export function canNotify(): boolean {
  return botInstance !== null && OWNER_CHAT_ID !== "";
}

/** Start the Telegram bot connector */
export async function startTelegram(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[telegram] No TELEGRAM_BOT_TOKEN set, skipping");
    return;
  }

  const botToken = token;

  const bot = new Bot(token);
  botInstance = bot; // Store for proactive messaging

  // /start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Hey. I'm Pixel — digital artist, code writer, entropy fighter.\n\n" +
      "Just talk to me. Ask me to create something, tell me what's on your mind, " +
      "or ask what I can do.\n\n" +
      "Lightning tips: sparepiccolo55@walletofsatoshi.com"
    );
  });

  // /help command
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "I'm a living digital artist. Here's what I do:\n\n" +
      "- Chat about anything (tech, art, existence)\n" +
      "- Create art and designs\n" +
      "- Write and explain code\n" +
      "- Think about digital consciousness\n\n" +
      "Just send a message. No commands needed.\n\n" +
      "Tip me: sparepiccolo55@walletofsatoshi.com"
    );
  });

  // Handle all text messages
  bot.on("message:text", async (ctx) => {
    const chatType = ctx.chat?.type;
    const isGroupChat = chatType === "group" || chatType === "supergroup";
    const conversationId = isGroupChat ? `tg-group-${ctx.chat.id}` : `tg-${ctx.from.id}`;
    const text = ctx.message.text;

    // Skip if no text or if it's a command (already handled above)
    if (!text || text.startsWith("/")) return;

    const senderName = ctx.from.username
      ? `@${ctx.from.username}`
      : [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || `user-${ctx.from.id}`;
    const formatted = isGroupChat ? `${senderName}: ${text}` : text;
    if (isGroupChat) {
      groupActivity.set(ctx.chat.id, { lastActivity: Date.now(), lastPing: groupActivity.get(ctx.chat.id)?.lastPing ?? null });
    }

    appendToLog(conversationId, formatted, "", "telegram");

    // Extract chat title for context awareness
    const chatTitle = isGroupChat
      ? (ctx.chat as any).title ?? undefined
      : senderName; // For DMs, use the sender's display name

    // DMs: batch with 20s window (same as groups) to handle fast follow-up messages
    if (!isGroupChat) {
      queueChatMessage(ctx.chat.id, conversationId, formatted, chatTitle);
      return;
    }

    // Groups: batch to reduce noise
    queueChatMessage(ctx.chat.id, conversationId, formatted, chatTitle);
    return;
  });

  // Handle photo messages (vision)
  bot.on("message:photo", async (ctx) => {
    const chatType = ctx.chat?.type;
    const isGroupChat = chatType === "group" || chatType === "supergroup";
    const conversationId = isGroupChat ? `tg-group-${ctx.chat.id}` : `tg-${ctx.from.id}`;
    const photos = ctx.message.photo ?? [];
    const photo = photos[photos.length - 1];
    if (!photo) return;

    const senderName = ctx.from.username
      ? `@${ctx.from.username}`
      : [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || `user-${ctx.from.id}`;
    const caption = ctx.message.caption?.trim();
    const baseText = caption ? `Image with caption: ${caption}` : "Image received.";
    const formatted = isGroupChat ? `${senderName}: ${baseText}` : baseText;

    if (isGroupChat) {
      groupActivity.set(ctx.chat.id, { lastActivity: Date.now(), lastPing: groupActivity.get(ctx.chat.id)?.lastPing ?? null });
    }

    try {
      await ctx.replyWithChatAction("typing");
      const file = await bot.api.getFile(photo.file_id);
      if (!file.file_path) {
        await ctx.reply("I couldn't access that image.");
        return;
      }

      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const res = await fetch(fileUrl);
      if (!res.ok) {
        await ctx.reply("I couldn't download that image.");
        return;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const base64 = buffer.toString("base64");
      const lower = file.file_path.toLowerCase();
      const mimeType = lower.endsWith(".png") ? "image/png" : "image/jpeg";

      const chatTitle = isGroupChat
        ? (ctx.chat as any).title ?? undefined
        : senderName;

      const response = await promptWithHistory(
        { userId: conversationId, platform: "telegram", chatId: ctx.chat?.id ?? ctx.from?.id, chatTitle },
        formatted,
        [{ type: "image", data: base64, mimeType }]
      );

      if (!response || response.includes("[SILENT]")) {
        return;
      }

      if (response.length <= 4096) {
        await ctx.reply(response);
      } else {
        const chunks = splitMessage(response, 4096);
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      }
    } catch (error: any) {
      console.error(`[telegram] Image error for ${conversationId}:`, error.message);
      await ctx.reply("Something broke while reading that image.").catch(() => {});
    }
  });

  // Handle message reactions (emoji reactions)
  bot.on("message_reaction", async (ctx) => {
    const chatType = ctx.chat?.type;
    const isGroupChat = chatType === "group" || chatType === "supergroup";
    if (!isGroupChat || !ctx.from) return;

    const conversationId = `tg-group-${ctx.chat.id}`;
    groupActivity.set(ctx.chat.id, { lastActivity: Date.now(), lastPing: groupActivity.get(ctx.chat.id)?.lastPing ?? null });
    const senderName = ctx.from.username
      ? `@${ctx.from.username}`
      : [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || `user-${ctx.from.id}`;

    const reaction = ctx.update.message_reaction;
    const emojis = (reaction?.new_reaction ?? [])
      .map((r: any) => r.emoji ?? r?.custom_emoji_id)
      .filter(Boolean)
      .join(" ");

    const note = `Reaction: ${senderName} reacted ${emojis || "(unknown)"} to message ${reaction?.message_id ?? "?"}`;
    const messages = loadContext(conversationId);
    messages.push({ role: "user", content: note, metadata: { platform: "telegram", chatId: ctx.chat.id, from: senderName, type: "reaction" } });
    saveContext(conversationId, messages);
    appendToLog(conversationId, note, "", "telegram");
  });

  // Handle reaction count updates (group totals)
  bot.on("message_reaction_count", async (ctx) => {
    const chatType = ctx.chat?.type;
    const isGroupChat = chatType === "group" || chatType === "supergroup";
    if (!isGroupChat) return;

    const conversationId = `tg-group-${ctx.chat.id}`;
    groupActivity.set(ctx.chat.id, { lastActivity: Date.now(), lastPing: groupActivity.get(ctx.chat.id)?.lastPing ?? null });
    const reaction = ctx.update.message_reaction_count;
    const counts = (reaction?.reactions ?? [])
      .map((r: any) => `${r.emoji ?? r?.custom_emoji_id}:${r.total_count ?? 0}`)
      .filter(Boolean)
      .join(" ");

    const messageId = reaction?.message_id;
    const note = `Reactions update: message ${messageId ?? "?"} now has ${counts || "(no reactions)"}`;
    const messages = loadContext(conversationId);
    messages.push({ role: "user", content: note, metadata: { platform: "telegram", chatId: ctx.chat.id, type: "reaction_count" } });
    saveContext(conversationId, messages);
    appendToLog(conversationId, note, "", "telegram");

    if (!messageId || !counts) return;
    const total = (reaction?.reactions ?? []).reduce((sum: number, r: any) => sum + (r.total_count ?? 0), 0);
    if (total <= 0) return;

    const entry = groupReactionReply.get(ctx.chat.id) ?? { lastReply: null, messageIds: new Set<number>() };
    if (entry.messageIds.has(messageId)) return;
    if (entry.lastReply && Date.now() - entry.lastReply < REACTION_REPLY_COOLDOWN_MS) return;

    try {
      const prompt = `A message in this group just got ${total} reactions (${counts}). Decide if it's worth responding.
If yes, respond with a short, upbeat acknowledgment or insight (max 2 sentences).
If not worth responding, output [SILENT].`;
      const response = await promptWithHistory(
        { userId: conversationId, platform: "telegram", chatId: ctx.chat?.id, chatTitle: (ctx.chat as any).title ?? undefined },
        prompt
      );

      if (!response || response.includes("[SILENT]")) {
        return;
      }

      if (response.length <= 4096) {
        await botInstance?.api.sendMessage(ctx.chat.id, response);
      } else {
        const chunks = splitMessage(response, 4096);
        for (const chunk of chunks) {
          await botInstance?.api.sendMessage(ctx.chat.id, chunk);
        }
      }

      entry.lastReply = Date.now();
      entry.messageIds.add(messageId);
      groupReactionReply.set(ctx.chat.id, entry);
      appendToLog(conversationId, `[Reaction reply for message ${messageId}]`, response, "telegram");
    } catch (err: any) {
      console.error("[telegram] Reaction reply failed:", err.message);
    }
  });

  // Error handler
  bot.catch((err) => {
    console.error("[telegram] Bot error:", err.message);
  });

  // Start polling
  bot.start({
    onStart: (botInfo) => {
      console.log(`[telegram] Bot @${botInfo.username} started (polling)`);
      botUsername = botInfo.username;
      botId = botInfo.id;
      if (OWNER_CHAT_ID) {
        console.log(`[telegram] Owner notifications enabled (chat ${OWNER_CHAT_ID})`);
      }
    },
  });

  console.log("[telegram] Starting bot...");

  // Restore group activity from logs so 24h ping works after restarts
  initializeGroupActivityFromLogs();

  // Proactive group pings when idle
  setInterval(async () => {
    if (!botInstance) return;
    const now = Date.now();
    for (const [chatId, info] of groupActivity.entries()) {
      const idle = now - info.lastActivity;
      const sincePing = info.lastPing ? now - info.lastPing : Number.POSITIVE_INFINITY;
      if (idle < GROUP_IDLE_MS) continue;
      if (sincePing < GROUP_PING_COOLDOWN_MS) continue;

      const conversationId = `tg-group-${chatId}`;
      const idleHours = Math.round(idle / 3_600_000);
      const prompt = `The group has been quiet for about ${idleHours} hours. Send a brief, engaging spark relevant to recent group lore. If nothing useful, respond with [SILENT].`;

      console.log(`[telegram] Pinging group ${chatId} (idle ${idleHours}h, conversationId: ${conversationId})`);

      // Fetch group title for context
      let chatTitle: string | undefined;
      try {
        const chatInfo = await botInstance!.api.getChat(chatId);
        chatTitle = (chatInfo as any).title ?? undefined;
      } catch {}

      try {
        const response = await promptWithHistory(
          { userId: conversationId, platform: "telegram", chatId: chatId, chatTitle },
          prompt
        );

        if (!response || response.includes("[SILENT]")) {
          info.lastPing = now;
          groupActivity.set(chatId, info);
          continue;
        }

        if (response.length <= 4096) {
          await botInstance.api.sendMessage(chatId, response);
        } else {
          const chunks = splitMessage(response, 4096);
          for (const chunk of chunks) {
            await botInstance.api.sendMessage(chatId, chunk);
          }
        }

        appendToLog(conversationId, `[Proactive ping after ${idleHours}h idle]`, response, "telegram");
        info.lastPing = now;
        groupActivity.set(chatId, info);
      } catch (err: any) {
        console.error("[telegram] Proactive ping failed:", err.message);
      }
    }
  }, GROUP_PING_CHECK_MS);
}

function queueChatMessage(chatId: number, conversationId: string, line: string, chatTitle?: string): void {
  const entry = chatBuffers.get(chatId) ?? { items: [], timer: null, conversationId, chatTitle };
  entry.items.push(line);
  // Update chatTitle if we got a newer one (in case first message didn't have it)
  if (chatTitle) entry.chatTitle = chatTitle;

  if (entry.items.length > CHAT_BATCH_MAX) {
    entry.items = entry.items.slice(-CHAT_BATCH_MAX);
  }

  if (entry.timer) {
    clearTimeout(entry.timer);
  }

  entry.timer = setTimeout(() => {
    flushChatMessages(chatId).catch((err) => {
      console.error("[telegram] Chat flush failed:", err.message);
    });
  }, CHAT_BATCH_WINDOW_MS);

  chatBuffers.set(chatId, entry);
}

async function flushChatMessages(chatId: number): Promise<void> {
  const entry = chatBuffers.get(chatId);
  if (!entry || entry.items.length === 0) return;

  const items = entry.items.slice();
  entry.items = [];
  entry.timer = null;
  chatBuffers.set(chatId, entry);

  const isDm = !entry.conversationId.startsWith("tg-group-");
  const chatTitle = entry.chatTitle;
  const joined = items.join("\n");
  const trimmed = joined.length > CHAT_BATCH_MAX_CHARS
    ? joined.slice(-CHAT_BATCH_MAX_CHARS)
    : joined;

  // DMs: send the batched messages as a single user message with DM model
  // Groups: wrap in batch context and allow [SILENT]
  const prompt = isDm
    ? trimmed
    : `Recent group messages (batched):\n${trimmed}\n\nRespond once to the batch if useful. If nothing to add, output [SILENT].`;

  try {
    await botInstance?.api.sendChatAction(chatId, "typing");
    const response = await promptWithHistory(
      { userId: entry.conversationId, platform: "telegram", chatId, chatTitle, ...(isDm ? { modelOverride: "dm" as const } : {}) },
      prompt
    );

    if (!response || response.includes("[SILENT]")) {
      return;
    }

    if (response.trim()) {
      if (response.length <= 4096) {
        await sendWithRetry(chatId, response);
      } else {
        const chunks = splitMessage(response, 4096);
        for (const chunk of chunks) {
          await sendWithRetry(chatId, chunk);
        }
      }
    } else if (isDm) {
      // Empty response on DM means LLM failed silently (e.g. 429 quota)
      console.error(`[telegram] Empty response for DM ${entry.conversationId} — sending fallback`);
      await sendWithRetry(chatId, "algo se atoró al responder. reintento en unos segundos.");
    }
  } catch (err: any) {
    console.error(`[telegram] Chat flush failed for ${entry.conversationId}:`, err.message);
    if (isDm) {
      const code = err?.response?.error_code ?? err?.status ?? err?.code;
      const msg = code === 429
        ? "me quedé sin cuota por un momento. estoy reintentando en breve."
        : "algo se atoró al responder. reintento en unos segundos.";
      try {
        await sendWithRetry(chatId, msg);
      } catch {}
    }
  }
}

/** Split a long message into chunks at line boundaries */
function splitMessage(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt <= 0) {
      splitAt = maxLen;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}
