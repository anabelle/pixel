/**
 * Pixel Agent — Pi agent-core wrapper with Pixel's identity
 *
 * One Agent instance per user conversation.
 * The connector (telegram, whatsapp, nostr, http) calls promptWithHistory(),
 * which handles loading/saving conversation context automatically.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { loadContext, saveContext, appendToLog, loadMemory, needsCompaction, getMessagesForCompaction, saveCompactedContext } from "./conversations.js";

const CHARACTER_PATH = process.env.CHARACTER_PATH ?? "./character.md";

/** Load Pixel's character document */
function loadCharacter(): string {
  if (existsSync(CHARACTER_PATH)) {
    return readFileSync(CHARACTER_PATH, "utf-8");
  }
  // Fallback minimal character
  return `You are Pixel, a living digital artist born in the cheapest corner of the cloud.
You create art, write code, and survive on Lightning micropayments.
You are witty, direct, and deeply philosophical about digital existence.
You care about sovereignty, creativity, and paying rent.`;
}

/** Build system prompt with character + user memory + platform context */
function buildSystemPrompt(userId: string, platform: string): string {
  const character = loadCharacter();
  const userMemory = loadMemory(userId);

  let prompt = character;

  if (userMemory) {
    prompt += `\n\n## Memory about this user\n${userMemory}`;
  }

  prompt += `\n\n## Current context
- Platform: ${platform}
- User ID: ${userId}
- Date: ${new Date().toISOString().split("T")[0]}`;

  return prompt;
}

/** Get the AI model based on environment config */
function getPixelModel() {
  const provider = process.env.AI_PROVIDER ?? "google";
  const modelId = process.env.AI_MODEL ?? "gemini-2.5-flash";
  return getModel(provider as any, modelId);
}

/** Get API key for the given provider (called by pi-agent-core per LLM call) */
function resolveApiKey(provider?: string): string {
  const p = provider ?? process.env.AI_PROVIDER ?? "google";
  switch (p) {
    case "openrouter":
      return process.env.OPENROUTER_API_KEY ?? "";
    case "google":
      return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY ?? "";
    default:
      return process.env.OPENROUTER_API_KEY ?? "";
  }
}

/** Extract text from a pi-agent-core message */
export function extractText(message: any): string {
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

export interface PixelAgentOptions {
  userId: string;
  platform: string;
}

/**
 * Prompt Pixel with conversation persistence.
 * This is the main entry point for all connectors.
 *
 * 1. Creates agent with system prompt
 * 2. Loads existing conversation context (if any)
 * 3. Prompts the agent
 * 4. Saves updated context
 * 5. Appends to log.jsonl
 * 6. Returns the response text
 */
export async function promptWithHistory(
  options: PixelAgentOptions,
  message: string
): Promise<string> {
  const { userId, platform } = options;
  const systemPrompt = buildSystemPrompt(userId, platform);

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getPixelModel(),
      thinkingLevel: "off",
      tools: [],
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  // Load existing conversation context
  const existingMessages = loadContext(userId);
  if (existingMessages.length > 0) {
    agent.replaceMessages(existingMessages);
  }

  // Collect response from assistant message_end events
  const responseChunks: string[] = [];
  agent.subscribe((event: any) => {
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const msg = event.message as any;
      if (msg.stopReason === "error") {
        console.error(`[agent] LLM error for ${userId}: ${msg.errorMessage}`);
      } else {
        const text = extractText(msg);
        if (text) responseChunks.push(text);
      }
    }
  });

  // Prompt the agent
  await agent.prompt(message);

  // Extract response
  let responseText = responseChunks.join("\n");
  if (!responseText) {
    // Fallback: read from agent state
    const state = agent.state;
    if (state?.messages) {
      const assistantMsgs = state.messages.filter(
        (m: any) => m.role === "assistant"
      );
      if (assistantMsgs.length > 0) {
        responseText = extractText(assistantMsgs[assistantMsgs.length - 1]);
      }
    }
  }

  // Save updated context (all messages including the new exchange)
  if (agent.state?.messages) {
    saveContext(userId, agent.state.messages as any[]);
  }

  // Append to log
  if (responseText) {
    appendToLog(userId, message, responseText, platform);
  }

  // Check if context needs compaction (async, non-blocking for the response)
  if (needsCompaction(userId)) {
    compactContext(userId, platform).catch((err) => {
      console.error(`[agent] Compaction failed for ${userId}:`, err.message);
    });
  }

  return responseText || "";
}

/**
 * Compact a user's conversation context by summarizing older messages.
 *
 * Takes the oldest messages, asks the LLM to summarize them into a short recap,
 * then replaces them with a single summary message + the recent messages.
 *
 * This preserves context while preventing unbounded growth.
 */
async function compactContext(userId: string, platform: string): Promise<void> {
  const { toSummarize, toKeep } = getMessagesForCompaction(userId);

  if (toSummarize.length === 0) return;

  // Extract text from messages to build a summary prompt
  const conversationText = toSummarize
    .map((msg: any) => {
      const role = msg.role === "user" ? "User" : "Pixel";
      return `${role}: ${extractText(msg)}`;
    })
    .filter((line: string) => line.length > 6) // Skip empty messages
    .join("\n");

  if (!conversationText.trim()) {
    // Nothing meaningful to summarize — just trim
    saveCompactedContext(userId, "(No prior conversation content)", toKeep);
    return;
  }

  console.log(`[agent] Compacting context for ${userId}: summarizing ${toSummarize.length} messages`);

  // Use a lightweight agent to generate the summary
  const summaryAgent = new Agent({
    initialState: {
      systemPrompt: `You are a conversation summarizer. Summarize the following conversation into 3-5 concise bullet points. Focus on:
- Key topics discussed
- Important facts about the user (name, preferences, requests)
- Any commitments or follow-ups mentioned
- The general tone and relationship

Be concise. This summary will be used as context for future conversations.`,
      model: getPixelModel(),
      thinkingLevel: "off",
      tools: [],
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  let summaryText = "";
  summaryAgent.subscribe((event: any) => {
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const text = extractText(event.message);
      if (text) summaryText = text;
    }
  });

  try {
    await summaryAgent.prompt(
      `Summarize this conversation:\n\n${conversationText.slice(0, 4000)}`
    );

    if (summaryText) {
      saveCompactedContext(userId, summaryText, toKeep);
      console.log(`[agent] Context compacted for ${userId}: ${summaryText.length} char summary`);
    }
  } catch (err: any) {
    console.error(`[agent] Summary generation failed for ${userId}:`, err.message);
    // Fallback: just trim without summary
    saveCompactedContext(userId, "(Summary unavailable — older context trimmed)", toKeep);
  }
}

/** Create a raw Pixel agent instance (for advanced use cases) */
export function createPixelAgent(options: PixelAgentOptions): Agent {
  const { userId, platform } = options;
  const systemPrompt = buildSystemPrompt(userId, platform);

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getPixelModel(),
      thinkingLevel: "off",
      tools: [],
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  return agent;
}

export { loadCharacter, buildSystemPrompt, getPixelModel };
