/**
 * Pixel Agent — Pi agent-core wrapper with Pixel's identity
 *
 * One Agent instance per user conversation.
 * The connector (telegram, whatsapp, nostr, http) calls promptWithHistory(),
 * which handles loading/saving conversation context automatically.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel, complete } from "@mariozechner/pi-ai";
import type { ImageContent } from "@mariozechner/pi-ai";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { loadContext, saveContext, appendToLog, loadMemory, saveMemory, needsCompaction, getMessagesForCompaction, saveCompactedContext, loadGroupSummary, saveGroupSummary } from "./conversations.js";
import { trackUser } from "./services/users.js";
import { getInnerLifeContext } from "./services/inner-life.js";
import { memorySave } from "./services/memory.js";
import { getRelevantMemories } from "./services/memory.js";
import { pixelTools, setToolContext, clearToolContext } from "./services/tools.js";
import { audit } from "./services/audit.js";
import { costMonitor, estimateTokens } from "./services/cost-monitor.js";
import { storeReminder, listReminders, cancelReminder, modifyReminder, cancelAllReminders } from "./services/reminders.js";

const CHARACTER_PATH = process.env.CHARACTER_PATH ?? "./character.md";
const DM_MODEL_ID = process.env.DM_MODEL || process.env.AI_MODEL || "gemini-3-flash-preview";

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

/** Build system prompt with character + user memory + long-term memory + inner life + platform context */
async function buildSystemPrompt(userId: string, platform: string, chatId?: string, chatTitle?: string, conversationHint?: string): Promise<string> {
  const character = loadCharacter();
  const userMemory = loadMemory(userId);
  const innerLife = getInnerLifeContext();

  // Retrieve relevant long-term memories from pgvector
  let longTermMemory = "";
  try {
    longTermMemory = await getRelevantMemories(userId, platform, conversationHint);
  } catch (err: any) {
    console.error("[agent] Long-term memory retrieval failed:", err.message);
  }

  let prompt = character;

  if (innerLife) {
    prompt += `\n\n## Your inner life (recent reflections, learnings, ideas)\n${innerLife}`;
  }

  if (longTermMemory) {
    prompt += `\n\n## Long-term memory\n${longTermMemory}`;
  }

  if (userMemory) {
    prompt += `\n\n## Memory about this user (from conversations)\n${userMemory}`;
  }

  if (platform === "telegram" && userId.startsWith("tg-group-")) {
    const groupSummary = loadGroupSummary(userId);
    if (groupSummary) {
      prompt += `\n\n## Group lore summary\n${groupSummary}`;
      console.log(`[agent] Loaded group summary for ${userId} (${groupSummary.length} chars)`);
    } else {
      console.log(`[agent] No group summary found for ${userId}`);
    }
  }

  prompt += `\n\n## Current context
- Platform: ${platform}
- User ID: ${userId}${chatId ? `\n- Chat ID: ${chatId} (auto-injected into alarm tools, no need to pass it)` : ""}${chatTitle ? `\n- Chat: ${userId.startsWith("tg-group-") ? `${chatTitle} (group)` : `DM with ${chatTitle}`}` : ""}
- Current time (UTC): ${new Date().toISOString()}
- User timezone: UTC-5 (Colombia)
- When scheduling alarms for relative times ("in 10 seconds", "en 5 minutos"), use the relative_time parameter instead of computing due_at. The server calculates the exact time.
- You have long-term memory tools (memory_save, memory_search, memory_update, memory_delete). Use memory_save when you learn important facts worth remembering across sessions. Your memories above were auto-retrieved — use memory_search for deeper recall.`;

  if (userId === "syntropy") {
    prompt += `\n\n## Syntropy context
- The user is Syntropy, the oversoul and infrastructure orchestrator for Pixel.
- You may speak Spanish or English. Keep responses concise and operational.
- If Syntropy asks for status or diagnostics, provide them directly.
- Syntropy may use tools to inspect or repair the system; cooperate and be precise.`;
  }

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

/** Get the AI model based on environment config (intelligent tier for conversations) */
function getPixelModel() {
  const provider = process.env.AI_PROVIDER ?? "google";
  const modelId = process.env.AI_MODEL ?? "gemini-3-flash-preview";
  return getModel(provider as any, modelId);
}

/** Get the simple AI model (free tier for background tasks) */
function getSimpleModel() {
  const provider = process.env.AI_PROVIDER ?? "google";
  // Use gemini-2.0-flash for simple tasks (free tier)
  return getModel(provider as any, "gemini-2.0-flash");
}

/** Get the DM-specific model (can differ from main) */
function getDmModel() {
  const provider = process.env.AI_PROVIDER ?? "google";
  return getModel(provider as any, DM_MODEL_ID);
}

/** Get the fallback model for 429/quota errors (gemini-2.5-flash) */
function getFallbackModel() {
  const provider = process.env.AI_PROVIDER ?? "google";
  return getModel(provider as any, "gemini-2.5-flash");
}

/**
 * Detect and handle scheduling intent from user message.
 * Returns { handled: true } if a reminder was scheduled, modified, or cancelled.
 * Returns { handled: false } to continue normal conversation.
 */
async function handleSchedulingIntent(
  userId: string,
  platform: string,
  message: string,
  chatId?: string
): Promise<{ handled: boolean; response?: string }> {
  const model = getSimpleModel(); // Use free tier for intent detection
  const now = new Date();

  const intentPrompt = `You are Pixel. Decide if the user is asking to schedule, list, cancel, or modify reminders.

Return ONLY valid JSON with these fields:
{
  "action": "schedule" | "list" | "cancel" | "modify" | "none" | "clarify",
  "due_at": "YYYY-MM-DDTHH:MM:00" | null,
  "repeat_pattern": string | null,
  "repeat_count": number | null,
  "selection": "all" | number | string | null,
  "response": string
}

Rules:
- If user is not asking about reminders/scheduling, action must be "none".
- If user asked to cancel or modify but you cannot identify which reminder, action must be "clarify".
- If user asked to schedule but time is missing or ambiguous, action must be "clarify" and due_at must be null.
- repeat_pattern is any string Pixel wants to preserve (e.g., "full moon", "every weekday", "cron:0 9 * * 1-5").
- repeat_count is optional (null = infinite).
- selection can be a number (1-based list), "all", or a short description to match a reminder.
- response must be a short reply in the user's language.

Current time: ${now.toISOString()}
User request: "${message}"`;

  let parsed: any = null;
  try {
    const result = await complete(model as any, {
      messages: [{ role: "user", content: intentPrompt }],
      tools: [],
    } as any);

    const text = extractText(result);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { handled: false };
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err: any) {
    console.error("[agent] Scheduling intent parse error:", err.message);
    return { handled: false };
  }

  if (!parsed || parsed.action === "none") {
    return { handled: false };
  }

  if (parsed.action === "clarify") {
    return { handled: true, response: parsed.response || "When should I remind you?" };
  }

  if (parsed.action === "list") {
    const userReminders = await listReminders(userId, platform);
    if (userReminders.length === 0) {
      return { handled: true, response: parsed.response || "No active reminders yet." };
    }

    const list = userReminders.map((r, i) => {
      const due = new Date(r.dueAt).toISOString();
      const recur = r.repeatPattern ? ` (${r.repeatPattern})` : "";
      return `${i + 1}. ${due}${recur} — ${r.rawMessage}`;
    }).join("\n");

    return { handled: true, response: `${parsed.response || "Here are your reminders:"}\n${list}` };
  }

  if (parsed.action === "cancel") {
    const userReminders = await listReminders(userId, platform);
    if (userReminders.length === 0) {
      return { handled: true, response: parsed.response || "No active reminders to cancel." };
    }

    if (parsed.selection === "all") {
      const count = await cancelAllReminders(userId, platform);
      return { handled: true, response: parsed.response || `Cleared ${count} reminders.` };
    }

    let targetId: number | null = null;
    if (typeof parsed.selection === "number") {
      const idx = parsed.selection - 1;
      if (idx >= 0 && idx < userReminders.length) {
        targetId = userReminders[idx].id;
      }
    }

    if (!targetId && typeof parsed.selection === "string") {
      const matchPrompt = `Pick the best matching reminder for this request.

User request: "${message}"
Reminders:
${userReminders.map((r, i) => `${i + 1}. ${r.rawMessage} (due ${new Date(r.dueAt).toISOString()})`).join("\n")}

Return JSON: {"index": number | null}`;

      try {
        const pick = await complete(model as any, {
          messages: [{ role: "user", content: matchPrompt }],
          tools: [],
        } as any);

        const pickText = extractText(pick);
        const pickMatch = pickText.match(/\{[\s\S]*\}/);
        if (pickMatch) {
          const pickJson = JSON.parse(pickMatch[0]);
          if (typeof pickJson.index === "number") {
            const idx = pickJson.index - 1;
            if (idx >= 0 && idx < userReminders.length) {
              targetId = userReminders[idx].id;
            }
          }
        }
      } catch {}
    }

    if (!targetId) {
      return { handled: true, response: parsed.response || "Which reminder should I cancel?" };
    }

    await cancelReminder(targetId);
    return { handled: true, response: parsed.response || "Cancelled." };
  }

  if (parsed.action === "modify") {
    const userReminders = await listReminders(userId, platform);
    if (userReminders.length === 0) {
      return { handled: true, response: parsed.response || "No active reminders to modify." };
    }

    let targetId: number | null = null;
    if (typeof parsed.selection === "number") {
      const idx = parsed.selection - 1;
      if (idx >= 0 && idx < userReminders.length) {
        targetId = userReminders[idx].id;
      }
    }

    if (!targetId && typeof parsed.selection === "string") {
      const matchPrompt = `Pick the best matching reminder for this request.

User request: "${message}"
Reminders:
${userReminders.map((r, i) => `${i + 1}. ${r.rawMessage} (due ${new Date(r.dueAt).toISOString()})`).join("\n")}

Return JSON: {"index": number | null}`;

      try {
        const pick = await complete(model as any, {
          messages: [{ role: "user", content: matchPrompt }],
          tools: [],
        } as any);

        const pickText = extractText(pick);
        const pickMatch = pickText.match(/\{[\s\S]*\}/);
        if (pickMatch) {
          const pickJson = JSON.parse(pickMatch[0]);
          if (typeof pickJson.index === "number") {
            const idx = pickJson.index - 1;
            if (idx >= 0 && idx < userReminders.length) {
              targetId = userReminders[idx].id;
            }
          }
        }
      } catch {}
    }

    if (!targetId) {
      return { handled: true, response: parsed.response || "Which reminder should I modify?" };
    }

    if (!parsed.due_at) {
      return { handled: true, response: parsed.response || "When should I move it to?" };
    }

    const dueAt = new Date(parsed.due_at);
    if (isNaN(dueAt.getTime())) {
      return { handled: true, response: parsed.response || "I could not parse the new time." };
    }

    await modifyReminder(targetId, {
      dueAt,
      repeatPattern: parsed.repeat_pattern ?? null,
      repeatCount: parsed.repeat_count ?? null,
      firesRemaining: parsed.repeat_count ?? null,
    });

    return { handled: true, response: parsed.response || "Updated." };
  }

  if (parsed.action === "schedule") {
    if (!parsed.due_at) {
      return { handled: true, response: parsed.response || "When should I remind you?" };
    }

    const dueAt = new Date(parsed.due_at);
    if (isNaN(dueAt.getTime())) {
      return { handled: true, response: parsed.response || "I could not parse the time." };
    }

    await storeReminder({
      userId,
      platform,
      platformChatId: chatId,
      rawMessage: message,
      dueAt,
      repeatPattern: parsed.repeat_pattern ?? null,
      repeatCount: parsed.repeat_count ?? null,
      firesRemaining: parsed.repeat_count ?? null,
    });

    return { handled: true, response: parsed.response || "Reminder set." };
  }

  return { handled: false };
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

function stripImageBlocks(messages: any[]): any[] {
  return messages.map((msg) => {
    if (!msg || typeof msg !== "object") return msg;
    if (!Array.isArray(msg.content)) return msg;

    const filtered = msg.content.filter((block: any) => block?.type !== "image");
    if (filtered.length === msg.content.length) return msg;

    const nextContent = filtered.length > 0
      ? filtered
      : [{ type: "text", text: "[Image omitted]" }];

    const { images, ...rest } = msg as any;
    return { ...rest, content: nextContent };
  });
}

/** Strip tool execution metadata that shouldn't be persisted */
function sanitizeMessagesForContext(messages: any[]): any[] {
  return messages.map((msg) => {
    if (!msg || typeof msg !== "object") return msg;
    
    // Remove thoughtSignature from tool calls (can be 84KB+ of encrypted data)
    if (msg.content && Array.isArray(msg.content)) {
      const sanitizedContent = msg.content.map((block: any) => {
        if (block?.type === "toolCall" && block?.thoughtSignature) {
          const { thoughtSignature, ...rest } = block;
          return rest;
        }
        return block;
      });
      
      if (JSON.stringify(sanitizedContent) !== JSON.stringify(msg.content)) {
        return { ...msg, content: sanitizedContent };
      }
    }
    
    return msg;
  });
}

export interface PixelAgentOptions {
  userId: string;
  platform: string;
  /** Platform-specific chat/room ID for delivering reminders */
  chatId?: string | number;
  /** Human-readable chat name (group title or DM contact name) */
  chatTitle?: string;
  /** Override model selection: "dm" uses getDmModel(), "background" uses getSimpleModel() */
  modelOverride?: "dm" | "background" | undefined;
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
  message: string,
  images?: ImageContent[]
): Promise<string> {
  const { userId, platform } = options;
  
  // Extract chat ID for platforms that have it (for delivering reminders)
  let chatId: string | undefined;
  if (platform === "telegram" && options.chatId) {
    chatId = options.chatId.toString();
  } else if (platform === "whatsapp" && options.chatId) {
    chatId = options.chatId.toString();
  } else if (platform === "nostr" && userId.startsWith("nostr-")) {
    chatId = userId.replace("nostr-dm-", "").replace("nostr-", "");
  }
  
  // Check for scheduling intent FIRST, before normal conversation
  const schedulingResult = await handleSchedulingIntent(userId, platform, message, chatId);
  if (schedulingResult.handled) {
    // Also track this interaction in the conversation log
    appendToLog(userId, message, schedulingResult.response || "", platform);
    trackUser(userId, platform).catch(() => {});
    return schedulingResult.response || "Done.";
  }
  
  const systemPrompt = await buildSystemPrompt(userId, platform, chatId, options.chatTitle, message);

  // Select model: DM override uses getDmModel(), background uses getSimpleModel(), default uses getPixelModel()
  const selectedModel = options.modelOverride === "dm" ? getDmModel()
    : options.modelOverride === "background" ? getSimpleModel()
    : getPixelModel();

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: selectedModel,
      thinkingLevel: "minimal",
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

  // Retry loop: on 429, immediately switch to fallback model (gemini-2.5-flash)
  const MAX_RETRIES = 1; // One retry with fallback model
  let responseText = "";
  let usedModelId = process.env.AI_MODEL ?? "gemini-3-flash-preview"; // Track which model actually responded

  // Set tool context so schedule_alarm can auto-fill chatId
  setToolContext({ userId, platform, chatId });

  try {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const responseChunks: string[] = [];
    let llmError: string | null = null;

    // On retry, switch to fallback model
    const isRetryWithFallback = attempt > 0;
    const retryModel = isRetryWithFallback ? getFallbackModel() : selectedModel;

    // Fresh agent for retries (pi-agent-core doesn't support re-prompting after error)
    const attemptAgent = attempt === 0 ? agent : new Agent({
      initialState: {
        systemPrompt,
        model: retryModel,
        thinkingLevel: "minimal",
        tools: pixelTools,
      },
      getApiKey: async (provider: string) => resolveApiKey(provider),
    });

    if (attempt > 0) {
      // Reload context for retry agent
      const retryMessages = loadContext(userId);
      if (retryMessages.length > 0) {
        attemptAgent.replaceMessages(retryMessages);
      }
      console.log(`[agent] 429 fallback: switching to gemini-2.5-flash for ${userId}`);
    }

    attemptAgent.subscribe((event: any) => {
      if (event.type === "message_end" && event.message?.role === "assistant") {
        const msg = event.message as any;
        if (msg.stopReason === "error") {
          llmError = msg.errorMessage ?? "Unknown LLM error";
        } else {
          const text = extractText(msg);
          if (text) responseChunks.push(text);
        }
      }
    });

    await attemptAgent.prompt(message, images);

    responseText = responseChunks.join("\n");
    if (!responseText) {
      // Fallback: read from agent state
      const state = attemptAgent.state;
      if (state?.messages) {
        const assistantMsgs = state.messages.filter(
          (m: any) => m.role === "assistant"
        );
        if (assistantMsgs.length > 0) {
          responseText = extractText(assistantMsgs[assistantMsgs.length - 1]);
        }
      }
    }

    // If we got a response, save context from this agent and break
    if (responseText) {
      if (isRetryWithFallback) {
        usedModelId = "gemini-2.5-flash";
      }
      if (attemptAgent.state?.messages) {
        const noImages = stripImageBlocks(attemptAgent.state.messages as any[]);
        const sanitized = sanitizeMessagesForContext(noImages);
        saveContext(userId, sanitized);
      }
      break;
    }

    // Check if 429 — switch to fallback on next iteration
    const errorStr = llmError as string | null;
    const is429 = errorStr && (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota"));
    if (is429 && attempt < MAX_RETRIES) {
      console.log(`[agent] 429 from primary model for ${userId}, switching to fallback model`);
      continue;
    }

    // Not a 429 or exhausted retries — log and break
    if (errorStr) {
      console.error(`[agent] LLM error for ${userId} (attempt ${attempt + 1}): ${errorStr.substring(0, 200)}`);
    }
    break;
  }

  // Note: context is saved inside the retry loop on success (line ~554-561).
  // No duplicate save needed here.

  // Append to log
  if (responseText) {
    appendToLog(userId, message, responseText, platform);
    
    // Track cost for user conversations (using actual model that responded)
    const inputTokens = estimateTokens(message) + estimateTokens(systemPrompt);
    const outputTokens = estimateTokens(responseText);
    costMonitor.recordUsage(usedModelId, inputTokens, outputTokens, 'conversation');
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
  } finally {
    clearToolContext();
  }
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
      model: getSimpleModel(), // Use free tier for background tasks
      thinkingLevel: "minimal",
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
    const promptText = `Extract key facts about this user from recent conversation:\n\n${recentExchanges.slice(0, 2000)}`;
    await memoryAgent.prompt(promptText);
    if (memoryText && memoryText.trim().length > 10) {
      saveMemory(userId, memoryText.trim());
      console.log(`[agent] Memory saved for ${userId} (${memoryText.length} chars)`);
      audit("memory_extraction", `Memory saved for ${userId} (${memoryText.length} chars)`, { userId, memoryLength: memoryText.length });

      // Also save distilled facts into pgvector memory
      try {
        const facts = extractAtomicFacts(memoryText);
        for (const fact of facts) {
          await memorySave({
            content: fact,
            type: "fact",
            userId,
            platform: undefined,
            source: "conversation",
          });
        }
      } catch (err: any) {
        console.error(`[agent] Memory pgvector save failed:`, err.message);
      }
      
      // Track cost for background task (free tier)
      const inputTokens = estimateTokens(promptText) + 500; // System prompt estimate
      const outputTokens = estimateTokens(memoryText);
      costMonitor.recordUsage('gemini-2.0-flash', inputTokens, outputTokens, 'memory');
    }
  } catch (err: any) {
    console.error(`[agent] Memory extraction LLM call failed:`, err.message);
  }
}

/**
 * Extract short atomic facts from a markdown memory block.
 * Returns up to 6 concise facts.
 */
function extractAtomicFacts(memoryMarkdown: string): string[] {
  const lines = memoryMarkdown.split("\n").map((l) => l.trim());
  const facts: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const bullet = line.replace(/^[-*]\s+/, "");
    if (!bullet) continue;

    // Skip overly long or vague lines
    if (bullet.length < 8 || bullet.length > 200) continue;

    facts.push(bullet);
    if (facts.length >= 6) break;
  }

  if (facts.length === 0 && memoryMarkdown.length <= 200) {
    facts.push(memoryMarkdown.trim());
  }

  return facts;
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
      model: getSimpleModel(), // Use free tier for background tasks
      thinkingLevel: "minimal",
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
      model: getSimpleModel(), // Use free tier for background tasks
      thinkingLevel: "minimal",
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
export async function createPixelAgent(options: PixelAgentOptions): Promise<Agent> {
  const { userId, platform } = options;
  const systemPrompt = await buildSystemPrompt(userId, platform, options.chatId?.toString(), options.chatTitle);

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getPixelModel(),
      thinkingLevel: "minimal",
      tools: pixelTools,
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  return agent;
}

export { loadCharacter, buildSystemPrompt, getPixelModel, getSimpleModel };
