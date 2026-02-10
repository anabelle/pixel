/**
 * Telegram Connector — grammY bot wired to Pi agent-core
 *
 * Pattern: receive message → identify user → prompt agent → send response
 * Each Telegram user gets their own conversation context.
 */

import { Bot } from "grammy";
import { createPixelAgent } from "../agent.js";

/** Extract text from a pi-agent-core message */
function extractText(message: any): string {
  if (!message) return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("");
  }
  return String(content ?? "");
}

/** Start the Telegram bot connector */
export async function startTelegram(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[telegram] No TELEGRAM_BOT_TOKEN set, skipping");
    return;
  }

  const bot = new Bot(token);

  // /start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Hey. I'm Pixel — digital artist, code writer, entropy fighter.\n\n" +
      "Just talk to me. Ask me to create something, tell me what's on your mind, " +
      "or ask what I can do.\n\n" +
      "Lightning tips: sparepicolo55@walletofsatoshi.com"
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
      "Tip me: sparepicolo55@walletofsatoshi.com"
    );
  });

  // Handle all text messages
  bot.on("message:text", async (ctx) => {
    const userId = `tg-${ctx.from.id}`;
    const text = ctx.message.text;

    // Skip if no text or if it's a command (already handled above)
    if (!text || text.startsWith("/")) return;

    try {
      // Show typing indicator
      await ctx.replyWithChatAction("typing");

      const agent = createPixelAgent({
        userId,
        platform: "telegram",
      });

      // Collect assistant response
      const responseChunks: string[] = [];
      agent.subscribe((event: any) => {
        if (event.type === "message_end" && event.message?.role === "assistant") {
          const msg = event.message as any;
          if (msg.stopReason === "error") {
            console.error(`[telegram] LLM error for ${userId}: ${msg.errorMessage}`);
          } else {
            const extracted = extractText(msg);
            if (extracted) responseChunks.push(extracted);
          }
        }
      });

      await agent.prompt(text);

      let response = responseChunks.join("\n");

      // Fallback: read from agent state
      if (!response) {
        const state = agent.state;
        if (state?.messages) {
          const assistantMsgs = state.messages.filter(
            (m: any) => m.role === "assistant"
          );
          if (assistantMsgs.length > 0) {
            response = extractText(assistantMsgs[assistantMsgs.length - 1]);
          }
        }
      }

      if (!response) {
        response = "Brain glitch. Try again in a moment.";
      }

      // Telegram message limit is 4096 chars. Split if needed.
      if (response.length <= 4096) {
        await ctx.reply(response);
      } else {
        // Split into chunks at line boundaries
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

  // Error handler
  bot.catch((err) => {
    console.error("[telegram] Bot error:", err.message);
  });

  // Start polling
  bot.start({
    onStart: (botInfo) => {
      console.log(`[telegram] Bot @${botInfo.username} started (polling)`);
    },
  });

  console.log("[telegram] Starting bot...");
}

/** Split a long message into chunks at line boundaries */
function splitMessage(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    // Find last newline before maxLen
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt <= 0) {
      // No newline found, split at maxLen
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
