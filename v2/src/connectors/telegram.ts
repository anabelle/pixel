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

// ============================================================
// Module-level bot instance for proactive messaging
// ============================================================

let botInstance: Bot | null = null;
let botUsername: string | null = null;
let botId: number | null = null;

/** Owner's Telegram chat ID — receives proactive notifications */
const OWNER_CHAT_ID = process.env.OWNER_TELEGRAM_ID ?? "";

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
    if (text.length <= 4096) {
      await botInstance.api.sendMessage(chatId, text, {
        parse_mode: parseMode,
      });
    } else {
      const chunks = splitMessage(text, 4096);
      for (const chunk of chunks) {
        await botInstance.api.sendMessage(chatId, chunk, {
          parse_mode: parseMode,
        });
      }
    }
    return true;
  } catch (err: any) {
    console.error(`[telegram] Failed to send message to ${chatId}:`, err.message);
    return false;
  }
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

    try {
      // Show typing indicator
      await ctx.replyWithChatAction("typing");

      const response = await promptWithHistory(
        { userId: conversationId, platform: "telegram" },
        formatted
      );

      if (!response) {
        if (isGroupChat) {
          appendToLog(conversationId, formatted, "", "telegram");
        }
        return;
      }

      if (response.includes("[SILENT]")) {
        return;
      }

      // Telegram message limit is 4096 chars. Split if needed.
      if (response.length <= 4096) {
        await ctx.reply(response);
      } else {
        const chunks = splitMessage(response, 4096);
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      }
    } catch (error: any) {
      console.error(`[telegram] Error for ${userId}:`, error.message);
      await ctx.reply("Something broke. I'll be back in a moment.").catch(() => {});
    }
  });

  // Handle message reactions (emoji reactions)
  bot.on("message_reaction", async (ctx) => {
    const chatType = ctx.chat?.type;
    const isGroupChat = chatType === "group" || chatType === "supergroup";
    if (!isGroupChat || !ctx.from) return;

    const conversationId = `tg-group-${ctx.chat.id}`;
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
    const reaction = ctx.update.message_reaction_count;
    const counts = (reaction?.reactions ?? [])
      .map((r: any) => `${r.emoji ?? r?.custom_emoji_id}:${r.total_count ?? 0}`)
      .filter(Boolean)
      .join(" ");

    const note = `Reactions update: message ${reaction?.message_id ?? "?"} now has ${counts || "(no reactions)"}`;
    const messages = loadContext(conversationId);
    messages.push({ role: "user", content: note, metadata: { platform: "telegram", chatId: ctx.chat.id, type: "reaction_count" } });
    saveContext(conversationId, messages);
    appendToLog(conversationId, note, "", "telegram");
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
