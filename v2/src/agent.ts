/**
 * Pixel Agent — Pi agent-core wrapper with Pixel's identity
 *
 * One Agent instance per user conversation.
 * The connector (telegram, whatsapp, nostr, http) calls promptWithHistory(),
 * which handles loading/saving conversation context automatically.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel, complete } from "@mariozechner/pi-ai";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { loadContext, saveContext, appendToLog, loadMemory, saveMemory, needsCompaction, getMessagesForCompaction, saveCompactedContext, loadGroupSummary, saveGroupSummary } from "./conversations.js";
import { trackUser } from "./services/users.js";
import { getInnerLifeContext } from "./services/inner-life.js";
import { pixelTools } from "./services/tools.js";
import { audit } from "./services/audit.js";

const CHARACTER_PATH = process.env.CHARACTER_PATH ?? "./character.md";

// Track message count per user for periodic memory extraction
const userMessageCounts = new Map<string, number>();
const MEMORY_EXTRACT_INTERVAL = 5; // Extract memory every N messages
const GROUP_SUMMARY_INTERVAL = 8; // Update group summary every N messages
const groupMessageCounts = new Map<string, number>();

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

/** Build system prompt with character + user memory + inner life + platform context */
function buildSystemPrompt(userId: string, platform: string): string {
  const character = loadCharacter();
  const userMemory = loadMemory(userId);
  const innerLife = getInnerLifeContext();

  let prompt = character;

  if (innerLife) {
    prompt += `\n\n## Your inner life (recent reflections, learnings, ideas)\n${innerLife}`;
  }

  if (userMemory) {
    prompt += `\n\n## Memory about this user\n${userMemory}`;
  }

  if (platform === "telegram" && userId.startsWith("tg-group-")) {
    const groupSummary = loadGroupSummary(userId);
    if (groupSummary) {
      prompt += `\n\n## Group lore summary\n${groupSummary}`;
    }
  }

  prompt += `\n\n## Current context
- Platform: ${platform}
- User ID: ${userId}
- Date: ${new Date().toISOString().split("T")[0]}`;

  if (platform === "telegram" && userId.startsWith("tg-group-")) {
    prompt += `\n\n## Group chat behavior
- This is a group chat. You should listen, learn, and track the lore.
- Use the conversation history already in context; do not say you can't access it.
- If you need older history, use read_logs with source="conversations:${userId}" (you already have the id).
- If you choose not to reply, output exactly: [SILENT].
- Reply when useful, insightful, or asked; be concise and avoid spamming.`;
  }

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
      tools: pixelTools,
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
    transformContext: async (messages: any[]) => {
      if (platform !== "telegram" || !userId.startsWith("tg-group-")) return messages;
      const summary = loadGroupSummary(userId);
      if (!summary) return messages;

      const loreMessage = {
        role: "assistant",
        content: [{ type: "text", text: `[Group lore summary]\n${summary}` }],
        metadata: { type: "group-lore" },
      };

      const recent = messages.slice(-5);
      if (recent.some((m: any) => m?.metadata?.type === "group-lore")) {
        return messages;
      }

      // Insert summary before the last user message if possible
      const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf("user");
      if (lastUserIndex >= 0) {
        const copy = messages.slice();
        copy.splice(lastUserIndex, 0, loreMessage);
        return copy;
      }

      return [...messages, loreMessage];
    },
  });

  // Load existing conversation context
  const existingMessages = loadContext(userId);
  if (existingMessages.length > 0) {
    agent.replaceMessages(existingMessages);
  }

  // Collect response from assistant message_end events
  const responseChunks: string[] = [];
  let llmError: string | null = null;
  agent.subscribe((event: any) => {
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const msg = event.message as any;
      if (msg.stopReason === "error") {
        console.error(`[agent] LLM error for ${userId}: ${msg.errorMessage}`);
        llmError = msg.errorMessage ?? "Unknown LLM error";
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

  // Last-resort fallback if agent-core errored out
  if (!responseText && llmError) {
    try {
      const model = getPixelModel();
      const fallbackContext = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        tools: [],
      } as any;
      const fallback = await complete(model as any, fallbackContext);
      if (fallback?.message) {
        responseText = extractText(fallback.message as any);
      } else if (typeof fallback?.text === "string") {
        responseText = fallback.text;
      }
      if (responseText) {
        console.log(`[agent] Fallback response used for ${userId}`);
      }
    } catch (err: any) {
      console.error(`[agent] Fallback LLM call failed for ${userId}:`, err.message);
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

  // Track user in PostgreSQL (non-blocking)
  trackUser(userId, platform).catch(() => {});

  // Check if context needs compaction (async, non-blocking for the response)
  if (needsCompaction(userId)) {
    compactContext(userId, platform).catch((err) => {
      console.error(`[agent] Compaction failed for ${userId}:`, err.message);
    });
  }

  // Periodically extract and save user memory (every N messages)
  const count = (userMessageCounts.get(userId) ?? 0) + 1;
  userMessageCounts.set(userId, count);
  if (count % MEMORY_EXTRACT_INTERVAL === 0 && responseText) {
    extractAndSaveMemory(userId, agent.state?.messages as any[]).catch((err) => {
      console.error(`[agent] Memory extraction failed for ${userId}:`, err.message);
    });
  }

  if (platform === "telegram" && userId.startsWith("tg-group-")) {
    const groupCount = (groupMessageCounts.get(userId) ?? 0) + 1;
    groupMessageCounts.set(userId, groupCount);
    if (groupCount % GROUP_SUMMARY_INTERVAL === 0) {
      updateGroupSummary(userId, agent.state?.messages as any[]).catch((err) => {
        console.error(`[agent] Group summary update failed for ${userId}:`, err.message);
      });
    }
  }

  return responseText || "";
}

/**
 * Extract key facts about a user from their conversation and save to memory.md.
 * Runs asynchronously — doesn't block the response.
 */
async function extractAndSaveMemory(userId: string, messages: any[]): Promise<void> {
  if (!messages || messages.length < 4) return; // Need some conversation to extract from

  const existingMemory = loadMemory(userId);
  const recentExchanges = messages.slice(-10)
    .map((msg: any) => {
      const role = msg.role === "user" ? "User" : "Pixel";
      return `${role}: ${extractText(msg)}`;
    })
    .filter((line: string) => line.length > 6)
    .join("\n");

  if (!recentExchanges.trim()) return;

  const memoryAgent = new Agent({
    initialState: {
      systemPrompt: `You extract key facts about a user from conversation. Output a concise markdown document with:
- Name (if mentioned)
- Interests/topics they care about
- Notable preferences or opinions
- Relationship context (how they interact with Pixel)
- Any requests or commitments made

${existingMemory ? `## Existing memory (update, don't lose info):\n${existingMemory}` : "No existing memory — create fresh."}

Keep it under 500 characters. Be concise. Only include facts actually stated or clearly implied.`,
      model: getPixelModel(),
      thinkingLevel: "off",
      tools: [],
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  let memoryText = "";
  memoryAgent.subscribe((event: any) => {
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const text = extractText(event.message);
      if (text) memoryText = text;
    }
  });

  try {
    await memoryAgent.prompt(`Extract key facts about this user from recent conversation:\n\n${recentExchanges.slice(0, 2000)}`);
    if (memoryText && memoryText.trim().length > 10) {
      saveMemory(userId, memoryText.trim());
      console.log(`[agent] Memory saved for ${userId} (${memoryText.length} chars)`);
      audit("memory_extraction", `Memory saved for ${userId} (${memoryText.length} chars)`, { userId, memoryLength: memoryText.length });
    }
  } catch (err: any) {
    console.error(`[agent] Memory extraction LLM call failed:`, err.message);
  }
}

/**
 * Update group summary for Telegram group chats.
 * Creates a short, rolling summary of group lore and recent context.
 */
async function updateGroupSummary(userId: string, messages: any[]): Promise<void> {
  if (!messages || messages.length < 6) return;

  const existingSummary = loadGroupSummary(userId);
  const recent = messages.slice(-30)
    .map((msg: any) => {
      const role = msg.role === "user" ? "User" : "Pixel";
      return `${role}: ${extractText(msg)}`;
    })
    .filter((line: string) => line.length > 4)
    .join("\n");

  if (!recent.trim()) return;

  const summaryAgent = new Agent({
    initialState: {
      systemPrompt: `You summarize group chat lore. Output a concise bullet list (4-8 bullets). Focus on:
- recurring topics
- key people and their roles
- decisions or plans
- open questions

Keep under 1200 characters. Be accurate. No speculation.

${existingSummary ? `## Previous summary (update, do not lose facts):\n${existingSummary}` : "No previous summary."}`,
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
    await summaryAgent.prompt(`Update the group summary using this recent context:\n\n${recent.slice(0, 2400)}`);
    if (summaryText && summaryText.trim().length > 20) {
      saveGroupSummary(userId, summaryText.trim());
      console.log(`[agent] Group summary saved for ${userId} (${summaryText.length} chars)`);
      audit("memory_extraction", `Group summary saved for ${userId} (${summaryText.length} chars)`, { userId, summaryLength: summaryText.length });
    }
  } catch (err: any) {
    console.error(`[agent] Group summary LLM call failed:`, err.message);
  }
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
      audit("conversation_compaction", `Context compacted for ${userId} (${toSummarize.length} msgs summarized)`, { userId, summarized: toSummarize.length, summaryLength: summaryText.length });
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
      tools: pixelTools,
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  return agent;
}

export { loadCharacter, buildSystemPrompt, getPixelModel };
