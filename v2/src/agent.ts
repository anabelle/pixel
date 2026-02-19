/**
 * Pixel Agent — Pi agent-core wrapper with Pixel's identity
 *
 * One Agent instance per user conversation.
 * The connector (telegram, whatsapp, nostr, http) calls promptWithHistory(),
 * which handles loading/saving conversation context automatically.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import type { ImageContent } from "@mariozechner/pi-ai";
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { loadContext, saveContext, appendToLog, loadMemory, saveMemory, needsCompaction, getMessagesForCompaction, saveCompactedContext, loadGroupSummary, saveGroupSummary } from "./conversations.js";
import { trackUser } from "./services/users.js";
import { getInnerLifeContext } from "./services/inner-life.js";
import { memorySave } from "./services/memory.js";
import { getRelevantMemories } from "./services/memory.js";
import { pixelTools, setToolContext, clearToolContext } from "./services/tools.js";
import { getPermittedTools, isPriorityUser } from "./services/server-registry.js";
import { audit } from "./services/audit.js";
import { costMonitor, estimateTokens } from "./services/cost-monitor.js";
import { resolveGoogleApiKey, setGoogleKeyFallback, resetGoogleKeyToPrimary } from "./services/google-key.js";
import { getSkillGraph, discoverRelevantSkills, formatSkillsForInjection, getSkillGraphStats } from "./services/skill-graph.js";

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

/** Load all skill markdown files from the skills directory */
function loadSkills(): string {
  const skillsDir = join(process.cwd(), "skills");
  if (!existsSync(skillsDir)) return "";
  try {
    const files = readdirSync(skillsDir).filter(f => f.endsWith(".md")).sort();
    if (files.length === 0) return "";
    const skills = files.map(f => {
      try {
        return readFileSync(join(skillsDir, f), "utf-8").trim();
      } catch { return ""; }
    }).filter(Boolean);
    if (skills.length === 0) return "";
    console.log(`[agent] Loaded ${skills.length} skill(s): ${files.join(", ")}`);
    return skills.join("\n\n---\n\n");
  } catch (err: any) {
    console.error("[agent] Failed to load skills:", err.message);
    return "";
  }
}

/** Build system prompt with character + user memory + long-term memory + inner life + skills + platform context */
async function buildSystemPrompt(userId: string, platform: string, chatId?: string, chatTitle?: string, conversationHint?: string): Promise<string> {
  const character = loadCharacter();
  const userMemory = loadMemory(userId);
  const innerLife = getInnerLifeContext();

  // Use skill graph for context-aware skill loading
  let skills = "";
  try {
    const graph = await getSkillGraph();
    const relevantSkills = discoverRelevantSkills(graph, conversationHint || "");
    if (relevantSkills.length > 0) {
      skills = formatSkillsForInjection(relevantSkills);
      console.log(`[agent] Injected ${relevantSkills.length} relevant skills for hint: "${(conversationHint || "").slice(0, 50)}..."`);
    }
  } catch (err: any) {
    console.error("[agent] Skill graph discovery failed:", err.message);
  }

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

  if (skills) {
    prompt += `\n\n## Your skills (self-created knowledge)\n${skills}`;
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

  if (userId === "syntropy" || userId === "syntropy-admin") {
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

/** Construct a Z.AI model object (not in pi-ai's registry) */
function makeZaiModel(modelId: string, reasoning: boolean = false) {
  return {
    id: modelId,
    name: modelId.toUpperCase(),
    api: "openai-completions" as const,
    provider: "zai",
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    reasoning,
    input: ["text"] as const,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, // flat rate plan
    contextWindow: 128000,
    maxTokens: 16384,
  } as any;
}

/** Construct an OpenRouter model object (OpenAI-compatible) */
function makeOpenRouterModel(modelId: string) {
  return {
    id: modelId,
    name: modelId,
    api: "openai-completions" as const,
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    input: ["text"] as const,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  } as any;
}

/** Primary conversation model — Z.AI GLM-5 (744B params, reasoning).
 * Fallback cascade handles 429: GLM-5 → Gemini 2.5 Pro → 3 Flash → 2.5 Flash → 2.0 Flash */
function getPixelModel() {
  const provider = process.env.AI_PROVIDER ?? "google";
  const modelId = process.env.AI_MODEL ?? "gemini-2.5-flash";
  if (provider === "zai") { return makeZaiModel(modelId, true); }
  return getModel(provider as any, modelId);
}

/** Non-priority model — OpenRouter Z.AI GLM-4.5 Air (free, tool-capable). */
function getNonPriorityModel() {
  return makeOpenRouterModel("z-ai/glm-4.5-air:free");
}

/** Background model — GLM-4.7 (reasoning, fast enough for background).
 * backgroundLlmCall() cascade: getSimpleModel → getFallbackModel(1..4) */
function getSimpleModel() {
  const provider = process.env.AI_PROVIDER ?? "google";
  if (provider === "zai") { return makeZaiModel("glm-4.7", true); }
  return getModel("google" as any, "gemini-2.0-flash");
}

/** Get the DM-specific model — same as conversations */

/** Fallback cascade — Google models, ordered by quality (all free tier, cost is $0).
 * Flash 3 first (best quality/$), then 2.5 Pro (strongest reasoner), then 2.5 Flash, then 2.0 Flash. */
  function getFallbackModel(level: number = 1) {
   switch (level) {
     case 1: return getModel("google" as any, "gemini-3-flash-preview"); // best quality/price
     case 2: return getModel("google" as any, "gemini-2.5-pro");         // strongest reasoner
     case 3: return getModel("google" as any, "gemini-2.5-flash");       // solid mid-tier
     default: return getModel("google" as any, "gemini-2.0-flash");      // always works
   }
 }

/** Vision-capable model — Gemini 2.5 Flash (reasoning-capable, good quality) */
function getVisionModel() {
  return getModel("google" as any, "gemini-2.5-flash");
}

/** Get API key for the given provider (called by pi-agent-core per LLM call) */
export function resolveApiKey(provider?: string): string {
  const p = provider ?? process.env.AI_PROVIDER ?? "google";
  switch (p) {
    case "zai":
      return process.env.ZAI_API_KEY ?? "";
    case "openrouter":
      return process.env.OPENROUTER_API_KEY ?? "";
    case "google":
      return resolveGoogleApiKey();
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY ?? "";
    default:
      return process.env.OPENROUTER_API_KEY ?? "";
  }
}

/** Strip thinking/reasoning preambles that some models emit as regular text.
 * Handles: (1) <think>/<thinking> XML tags (DeepSeek R1, QwQ, etc.)
 * (2) GLM-5/Gemini bold-header pattern: **Title Case Header**\n\n<reasoning>\n\n\n<response>
 * Only apply to user-facing text — NOT memory extraction, compaction, or summaries. */
export function stripThinkingFromResponse(text: string): string {
  if (!text) return text;
  // Pattern 1: <think>...</think> or <thinking>...</thinking> tags
  let cleaned = text.replace(/<(?:think|thinking|budget:thinking)>[\s\S]*?<\/(?:think|thinking|budget:thinking)>/gi, "").trim();
  if (cleaned !== text && cleaned) return cleaned;

  // Pattern 2: GLM-5 bold-header self-narrating pattern
  // Must start with **Header** and contain \n\n\n separator before actual response
  if (!text.startsWith("**")) return text;
  const lastSep = text.lastIndexOf("\n\n\n");
  if (lastSep === -1) return text;

  // Verify the preamble looks like thinking, not legitimate content:
  // Check for first-person meta-reasoning language in the preamble section
  const preamble = text.substring(0, lastSep);
  const thinkingSignals = /\b(I'm |I'll |I need |I've |I also |I should |I want |I don't |Let me |My response|Refining|Acknowledging|Analyzing|Processing|Evaluating|Considering|Clarifying|Exploring)\b/i;
  if (!thinkingSignals.test(preamble)) return text;

  const afterSep = text.substring(lastSep + 3).trim();
  if (!afterSep) return text;
  return afterSep;
}

/** Extract text from a pi-agent-core message (pure extraction, no stripping) */
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
  // Step 0: Remove null/undefined entries (prevents pi-agent-core crashes in defaultConvertToLlm)
  let result: any[] = messages.filter((msg) => msg != null && typeof msg === "object" && msg.role);

  // Step 1: Clean individual messages
  result = result.map((msg) => {
    
    if (msg.content && Array.isArray(msg.content)) {
      let sanitizedContent = msg.content.map((block: any) => {
        // Remove thoughtSignature from tool calls (can be 84KB+ of encrypted data)
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

  // Step 2: Remove empty error messages (stopReason: "error" with no content)
  // These are failed LLM calls that got serialized — they confuse all providers
  result = result.filter((msg) => {
    if (msg?.role === "assistant" && msg?.stopReason === "error") {
      const content = msg.content;
      if (!content || (Array.isArray(content) && content.length === 0)) {
        return false; // Remove empty error messages
      }
    }
    return true;
  });

  // Step 3: Ensure tool call/result structural integrity
  // Gemini (and other providers) require that a toolResult message IMMEDIATELY
  // follows the assistant message containing the matching toolCall.
  // After trimming/compaction, orphaned toolResults can appear at the start
  // of context, or orphaned toolCalls at the end. Both break cross-model fallback.
  result = ensureToolCallIntegrity(result);

  return result;
}

/**
 * Ensure structural integrity of tool call / tool result pairs.
 * 
 * Rules enforced:
 * 1. Every toolResult must be preceded by an assistant message containing
 *    a toolCall with the matching id (the result's toolCallId).
 * 2. Orphaned toolResults (no matching preceding toolCall) are removed.
 * 3. Trailing assistant messages with only toolCalls (no text, no following
 *    toolResult) are removed — they represent incomplete tool execution.
 * 
 * This prevents Gemini's "function response turn comes immediately after
 * a function call turn" error when falling back across model providers.
 */
function ensureToolCallIntegrity(messages: any[]): any[] {
  // Build a set of toolCall ids from assistant messages, tracking which
  // assistant message index each call belongs to
  const toolCallPositions = new Map<string, number>(); // toolCallId → message index
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg?.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block?.type === "toolCall" && block.id) {
          toolCallPositions.set(block.id, i);
        }
      }
    }
  }

  // Pass 1: Mark orphaned toolResults for removal
  const keepFlags = new Array(messages.length).fill(true);
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg?.role === "toolResult" && msg.toolCallId) {
      const callIdx = toolCallPositions.get(msg.toolCallId);
      if (callIdx === undefined || callIdx >= i) {
        // No matching toolCall found before this toolResult — orphaned
        keepFlags[i] = false;
      }
    }
  }

  // Pass 2: Check for trailing assistant messages that ONLY have toolCalls
  // (no text content, no subsequent toolResult) — these are incomplete
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!keepFlags[i]) continue;
    
    if (msg?.role === "assistant" && Array.isArray(msg.content)) {
      const hasToolCalls = msg.content.some((b: any) => b?.type === "toolCall");
      const hasText = msg.content.some((b: any) => b?.type === "text" && b.text?.trim());
      
      if (hasToolCalls && !hasText) {
        // Check if all its toolCalls have matching toolResults after it
        const callIds = msg.content
          .filter((b: any) => b?.type === "toolCall" && b.id)
          .map((b: any) => b.id);
        
        const allHaveResults = callIds.every((id: string) => {
          for (let j = i + 1; j < messages.length; j++) {
            if (keepFlags[j] && messages[j]?.role === "toolResult" && messages[j].toolCallId === id) {
              return true;
            }
          }
          return false;
        });
        
        if (!allHaveResults) {
          // Incomplete tool execution chain — remove this and its results
          keepFlags[i] = false;
          for (const id of callIds) {
            for (let j = i + 1; j < messages.length; j++) {
              if (messages[j]?.role === "toolResult" && messages[j].toolCallId === id) {
                keepFlags[j] = false;
              }
            }
          }
        }
      }
    } else {
      // Once we hit a non-assistant message going backwards, stop checking trailing
      break;
    }
  }

  const filtered = messages.filter((_, i) => keepFlags[i]);
  
  if (filtered.length < messages.length) {
    console.log(`[agent] sanitize: removed ${messages.length - filtered.length} orphaned tool messages (${messages.length} → ${filtered.length})`);
  }
  
  return filtered;
}

export interface PixelAgentOptions {
  userId: string;
  platform: string;
  /** Platform-specific chat/room ID for delivering reminders */
  chatId?: string | number;
  /** Human-readable chat name (group title or DM contact name) */
  chatTitle?: string;
  /** Override model selection: "background" uses getSimpleModel() */
  modelOverride?: "background" | undefined;
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
  
  // Scheduling is handled by the main agent via schedule_alarm/list_alarms/cancel_alarm/modify_alarm tools.
  // No pre-filter — GLM-4.7 is smart enough to detect intent and use tools directly.
  
  const systemPrompt = await buildSystemPrompt(userId, platform, chatId, options.chatTitle, message);

  // Select model: vision-capable model when images present, DM override, background, or default
  const hasImages = images && images.length > 0;
  const isPriority = isPriorityUser(userId);
  const selectedModel = hasImages ? getVisionModel()
    : options.modelOverride === "background" ? getSimpleModel()
    : isPriority ? getPixelModel()
    : getNonPriorityModel();

  if (hasImages) {
    console.log(`[agent] Vision request from ${userId} — using Gemini 2.5 Flash for image analysis`);
  }

  // Filter tools based on user authorization level
  const permittedTools = getPermittedTools(userId, pixelTools);
  const toolsForModel = permittedTools;
  console.log(`[agent] User ${userId} authorized for ${permittedTools.length}/${pixelTools.length} tools | model tier: ${isPriority ? "priority" : "public"}`);

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: selectedModel,
      thinkingLevel: "high",
      tools: toolsForModel,
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
    convertToLlm: (msgs: any[]) => msgs.filter((m: any) => m && m.role && (m.role === "user" || m.role === "assistant" || m.role === "toolResult")),
    transformContext: async (messages: any[]) => {
      // Inject global context (active missions + inner monologue) for ALL conversations
      // CRITICAL: This is INTERNAL context. NEVER output these blocks verbatim to users.
      // Use them to inform your responses, detect mission-relevant opportunities, and maintain cross-conversation awareness.
      const globalContext: any[] = [];
      
      const missionsPath = "/app/data/active_missions.md";
      if (existsSync(missionsPath)) {
        try {
          const missions = readFileSync(missionsPath, "utf8").trim();
          if (missions && missions.length > 50) { // Skip if essentially empty
            globalContext.push({
              role: "assistant",
              content: [{ type: "text", text: `[INTERNAL CONTEXT — DO NOT OUTPUT VERBATIM]\n## Your Active Missions\nThese are your current missions. Reference them internally when relevant opportunities arise. Never quote this block to users.\n\n${missions}\n[END INTERNAL CONTEXT]` }],
              metadata: { type: "global-missions" },
            });
          }
        } catch {}
      }
      
      const monologuePath = "/app/data/inner_monologue.md";
      if (existsSync(monologuePath)) {
        try {
          const monologue = readFileSync(monologuePath, "utf8").trim();
          if (monologue && monologue.length > 50) {
            globalContext.push({
              role: "assistant",
              content: [{ type: "text", text: `[INTERNAL CONTEXT — DO NOT OUTPUT VERBATIM]\n## Your Current Narrative State\nThis is your cross-conversation awareness. Use it to maintain continuity. Never quote this block to users.\n\n${monologue}\n[END INTERNAL CONTEXT]` }],
              metadata: { type: "global-monologue" },
            });
          }
        } catch {}
      }
      
      // Inject global context before the last user message (so it's fresh in context)
      if (globalContext.length > 0) {
        const lastUserIndex = [...messages].map((m) => m?.role).lastIndexOf("user");
        if (lastUserIndex >= 0) {
          const copy = messages.slice();
          copy.splice(lastUserIndex, 0, ...globalContext);
          messages = copy;
        } else {
          messages = [...globalContext, ...messages];
        }
      }
      
      // Group lore (Telegram groups only)
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

  // Retry loop: on 429/provider error, cascade through fallback models
  // GLM-4.7 → Gemini 3 Flash → Gemini 2.5 Pro → Gemini 2.5 Flash → Gemini 2.0 Flash
  const MAX_RETRIES = 4;
  let responseText = "";
  let usedModelId = selectedModel?.id ?? (process.env.AI_MODEL ?? "gemini-3-flash-preview"); // Track which model actually responded

  // Set tool context so schedule_alarm can auto-fill chatId
  setToolContext({ userId, platform, chatId });

  try {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const responseChunks: string[] = [];
    let llmError: string | null = null;

    // On retry, cascade through fallback models
    const isRetryWithFallback = attempt > 0;
    const retryModel = isRetryWithFallback ? getFallbackModel(attempt) : selectedModel;

    // Fresh agent for retries (pi-agent-core doesn't support re-prompting after error)
    const attemptAgent = attempt === 0 ? agent : new Agent({
      initialState: {
        systemPrompt,
        model: retryModel,
        thinkingLevel: "high",
        tools: toolsForModel,
      },
      getApiKey: async (provider: string) => resolveApiKey(provider),
      convertToLlm: (msgs: any[]) => msgs.filter((m: any) => m && m.role && (m.role === "user" || m.role === "assistant" || m.role === "toolResult")),
    });

    if (attempt > 0) {
      // Reload context for retry agent
      const retryMessages = loadContext(userId);
      if (retryMessages.length > 0) {
        attemptAgent.replaceMessages(retryMessages);
      }
      console.log(`[agent] Fallback attempt ${attempt}: switching to ${retryModel.id} for ${userId}`);
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

    responseText = stripThinkingFromResponse(responseChunks.join("\n"));
    if (!responseText) {
      // Fallback: read from agent state
      const state = attemptAgent.state;
      if (state?.messages) {
        const assistantMsgs = state.messages.filter(
          (m: any) => m.role === "assistant"
        );
        if (assistantMsgs.length > 0) {
          responseText = stripThinkingFromResponse(extractText(assistantMsgs[assistantMsgs.length - 1]));
        }
      }
    }

    // If we got a response, save context from this agent and break
    if (responseText) {
      if (isRetryWithFallback) {
        usedModelId = retryModel.id;
      }
      // Google call succeeded — reset to primary key for next calls
      if (retryModel.provider === "google") {
        resetGoogleKeyToPrimary();
      }
      if (attemptAgent.state?.messages) {
        const noImages = stripImageBlocks(attemptAgent.state.messages as any[]);
        const sanitized = sanitizeMessagesForContext(noImages);
        saveContext(userId, sanitized);
      }
      break;
    }

    // Check if retryable error — 429, quota, or provider errors (Z.AI balance, etc.)
    const errorStr = llmError as string | null;
    const isRetryable = errorStr && (
      errorStr.includes("429") ||
      errorStr.includes("RESOURCE_EXHAUSTED") ||
      errorStr.includes("quota") ||
      errorStr.includes("Insufficient balance") ||
      errorStr.includes("subscription plan") ||
      errorStr.includes("rate limit") ||
      errorStr.includes("Usage limit") ||
      errorStr.includes("1308")
    );
    if (isRetryable && attempt < MAX_RETRIES) {
      // If Google quota hit, flip to fallback key for next attempts
      if (retryModel.provider === "google") {
        setGoogleKeyFallback();
      }
      console.log(`[agent] Error from model (attempt ${attempt + 1}) for ${userId}: ${errorStr.substring(0, 150)} — cascading to fallback`);
      const nextModel = getFallbackModel(attempt + 1);
      costMonitor.recordError(
        attempt === 0 ? (process.env.AI_MODEL ?? 'gemini-3-flash-preview') : getFallbackModel(attempt).id,
        errorStr,
        'conversation',
        nextModel.id
      );
      continue;
    }

    // Not a 429 or exhausted retries — log and break
    if (errorStr) {
      console.error(`[agent] LLM error for ${userId} (attempt ${attempt + 1}): ${errorStr.substring(0, 200)}`);
      costMonitor.recordError(
        attempt === 0 ? (process.env.AI_MODEL ?? 'gemini-3-flash-preview') : getFallbackModel(attempt).id,
        errorStr,
        'conversation'
      );
    }
    break;
  }

  // Note: context is saved inside the retry loop on success (line ~554-561).
  // No duplicate save needed here.

  // Append to log
  if (responseText) {
    // Don't log [SILENT] responses - they clutter conversation logs
    const shouldLog = responseText.trim() !== "[SILENT]";
    if (shouldLog) {
      appendToLog(userId, message, responseText, platform);
    } else {
      console.log(`[agent] Skipping [SILENT] response for ${userId}`);
    }
    
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

  // Capture observation if friction detected (async, non-blocking)
  if (responseText && agent.state?.messages) {
    captureObservation(agent.state.messages as any[], userId, platform).catch((err) => {
      console.error(`[agent] Observation capture failed for ${userId}:`, err.message);
    });
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

  try {
    const sysPrompt = `You extract key facts about a user from conversation. Output a concise markdown document with:
- Name (if mentioned)
- Interests/topics they care about
- Notable preferences or opinions
- Relationship context (how they interact with Pixel)
- Any requests or commitments made

${existingMemory ? `## Existing memory (update, don't lose info):\n${existingMemory}` : "No existing memory — create fresh."}

Keep it under 500 characters. Be concise. Only include facts actually stated or clearly implied.`;
    const promptText = `Extract key facts about this user from recent conversation:\n\n${recentExchanges.slice(0, 8000)}`;
    const memoryText = await backgroundLlmCall({ systemPrompt: sysPrompt, userPrompt: promptText, label: "memory_extraction" });

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

  try {
    const systemPrompt = `You summarize group chat lore. Output a concise bullet list (4-8 bullets). Focus on:
- recurring topics
- key people and their roles
- decisions or plans
- open questions

Keep under 1200 characters. Be accurate. No speculation.

${existingSummary ? `## Previous summary (update, do not lose facts):\n${existingSummary}` : "No previous summary."}`;

    const groupSummaryText = await backgroundLlmCall({
      systemPrompt,
      userPrompt: `Update group summary using this recent context:\n\n${recent.slice(0, 8000)}`,
      label: "group_summary",
      timeoutMs: 45_000,
    });

    if (groupSummaryText && groupSummaryText.trim().length > 20) {
      saveGroupSummary(userId, groupSummaryText.trim());
      console.log(`[agent] Group summary saved for ${userId} (${groupSummaryText.length} chars)`);
      audit("memory_extraction", `Group summary saved for ${userId} (${groupSummaryText.length} chars)`, { userId, summaryLength: groupSummaryText.length });
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
      const text = extractText(msg);
      // Skip [SILENT] responses entirely
      if (text.trim() === "[SILENT]") return null;
      return `${role}: ${text}`;
    })
    .filter((line: string | null): line is string => line !== null && line.length > 6) // Skip null and very short messages
    .join("\n");

  if (!conversationText.trim()) {
    // Nothing meaningful to summarize — skip compaction this cycle
    console.log(`[agent] Compaction skipped for ${userId} — conversation text empty after filtering (too many [SILENT] or short messages).`);
    return;
  }

  console.log(`[agent] Compacting context for ${userId}: summarizing ${toSummarize.length} messages`);

  try {
    const summaryText = await backgroundLlmCall({
      systemPrompt: `You are a conversation summarizer. Summarize the following conversation into 3-5 concise bullet points. Focus on:
- Key topics discussed
- Important facts about the user (name, preferences, requests)
- Any commitments or follow-ups mentioned
- The general tone and relationship

Be concise. This summary will be used as context for future conversations.`,
      userPrompt: `Summarize this conversation:\n\n${conversationText.slice(0, 16000)}`,
      label: "compaction",
      timeoutMs: 60_000,
    });

    if (summaryText && summaryText.length > 20) {
      saveCompactedContext(userId, summaryText, toKeep);
      console.log(`[agent] Context compacted for ${userId}: ${summaryText.length} char summary`);
      audit("conversation_compaction", `Context compacted for ${userId} (${toSummarize.length} msgs summarized)`, { userId, summarized: toSummarize.length, summaryLength: summaryText.length });
    } else {
      // Summary generation failed — ABORT compaction entirely.
      // A bloated context is better than amnesia. Will retry next threshold crossing.
      console.warn(`[agent] Compaction ABORTED for ${userId} — summary generation returned empty/short. Context preserved intact.`);
    }
  } catch (err: any) {
    // Summary generation crashed — ABORT compaction entirely.
    // Don't destroy conversation history just because the LLM is down.
    console.error(`[agent] Compaction ABORTED for ${userId} — summary failed: ${err.message}. Context preserved intact.`);
  }
}

/**
 * Capture an observation from conversation friction.
 * Called at the end of promptWithHistory if friction signals are detected.
 */
async function captureObservation(messages: any[], userId: string, platform: string): Promise<void> {
  try {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
    
    if (!lastUserMsg || !lastAssistantMsg) return;
    
    const userText = typeof lastUserMsg.content === "string" 
      ? lastUserMsg.content 
      : lastUserMsg.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
    
    const assistantText = typeof lastAssistantMsg.content === "string"
      ? lastAssistantMsg.content
      : lastAssistantMsg.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
    
    // Only capture if there's friction signals
    const userFrictionSignals = /\b(forgot|confused|wrong|error|should have|didn't|failed|mistake|olvidé|confundí|debí|no pude|fallé|didn't remember|can't recall|don't know who|who is|who's that)\b/i;
    const assistantFrictionSignals = /\b(i (forgot|was wrong|made a mistake|missed that|didn't realize|didn't catch|should have)|me equivoqué|me confundí|se me pasó|no me di cuenta)\b/i;
    if (!userFrictionSignals.test(userText) && !assistantFrictionSignals.test(assistantText)) return;
    
    // Ask LLM to extract observation
    const OBSERVATION_PROMPT = `Extract a one-sentence observation about what friction or learning occurred in this conversation.

Format: Single sentence describing the friction, pattern break, or learning.

If no significant friction occurred, respond with exactly: "no friction"

User: ${userText.substring(0, 500)}
Assistant: ${assistantText.substring(0, 500)}`;

    const observation = await backgroundLlmCall({
      systemPrompt: "You extract concise observations about conversation frictions.",
      userPrompt: OBSERVATION_PROMPT,
      label: "observation_capture",
      timeoutMs: 30_000,
    });
    
    if (!observation || observation.toLowerCase().includes("no friction")) return;
    
    // Ensure observations directory exists
    const observationsDir = join(process.cwd(), "external/pixel/skills/arscontexta/ops/observations");
    if (!existsSync(observationsDir)) {
      mkdirSync(observationsDir, { recursive: true });
    }
    
    // Write observation
    const timestamp = Date.now();
    const filename = `${timestamp}.md`;
    const filepath = join(observationsDir, filename);
    
    const content = `---
captured: ${new Date().toISOString()}
user: ${userId}
platform: ${platform}
---

${observation.trim()}
`;
    
    writeFileSync(filepath, content);
    console.log(`[agent] Observation captured: ${observation.substring(0, 60)}...`);
    audit("observation_captured", `Observation: ${observation.substring(0, 100)}`, { userId, platform });
    
  } catch (err: any) {
    console.error("[agent] Observation capture failed:", err.message);
  }
}

/** Create a raw Pixel agent instance (for advanced use cases) */
export async function createPixelAgent(options: PixelAgentOptions): Promise<Agent> {
  const { userId, platform } = options;
  const systemPrompt = await buildSystemPrompt(userId, platform, options.chatId?.toString(), options.chatTitle);
  const permittedTools = getPermittedTools(userId, pixelTools);

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getPixelModel(),
      thinkingLevel: "high",
      tools: permittedTools,
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
    convertToLlm: (msgs: any[]) => msgs.filter((m: any) => m && m.role && (m.role === "user" || m.role === "assistant" || m.role === "toolResult")),
  });

  return agent;
}

export { loadCharacter, buildSystemPrompt, getPixelModel, getSimpleModel, getVisionModel };

// ─── BACKGROUND LLM CALL ─────────────────────────────────────
// Shared utility for heartbeat, inner-life, jobs — any autonomous agent cycle.
// Tries Trinity (OpenRouter free) first, then GLM-4.7, then Gemini cascade.
// Tracks costs. Logs errors with detail.

export interface BackgroundLlmOptions {
  systemPrompt: string;
  userPrompt: string;
  tools?: any[];
  label?: string;          // For logging/cost tracking: "heartbeat", "inner-life", "jobs"
  timeoutMs?: number;      // Default 60s
}

export async function backgroundLlmCall(opts: BackgroundLlmOptions): Promise<string> {
  const { systemPrompt, userPrompt, tools, label = "background", timeoutMs = 60_000 } = opts;
  const models = [
    makeOpenRouterModel("arcee-ai/trinity-large-preview:free"),
    getSimpleModel(),
    getFallbackModel(1),
    getFallbackModel(2),
    getFallbackModel(3),
    getFallbackModel(4),
  ];

  for (let attempt = 0; attempt < models.length; attempt++) {
    const model = models[attempt];
    const agent = new Agent({
      initialState: {
        systemPrompt,
        model,
        thinkingLevel: "off" as any,
        tools: tools ?? [],
      },
      getApiKey: async (provider: string) => resolveApiKey(provider),
      convertToLlm: (msgs: any[]) => msgs.filter((m: any) => m && m.role && (m.role === "user" || m.role === "assistant" || m.role === "toolResult")),
    });

    let responseText = "";
    let llmError: string | null = null;

    agent.subscribe((event: any) => {
      if (event.type === "message_end" && event.message?.role === "assistant") {
        const msg = event.message as any;
        if (msg.stopReason === "error") {
          llmError = msg.errorMessage ?? "Unknown LLM error";
        } else {
          const text = extractText(msg);
          if (text) responseText = text;
        }
      }
    });

    try {
      await Promise.race([
        agent.prompt(userPrompt),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
      ]);
    } catch (err: any) {
      llmError = err.message;
    }

    if (responseText) {
      // Strip thinking preambles before returning (backgroundLlmCall results go to Nostr, heartbeat, etc.)
      responseText = stripThinkingFromResponse(responseText);
      // Track cost
      const inputTokens = estimateTokens(userPrompt) + estimateTokens(systemPrompt);
      const outputTokens = estimateTokens(responseText);
      costMonitor.recordUsage(model.id, inputTokens, outputTokens, label);
      // Google call succeeded — reset to primary key
      if (model.provider === "google") {
        resetGoogleKeyToPrimary();
      }
      return responseText;
    }

    if (llmError) {
      const isRetryable = (
        llmError.includes("429") || llmError.includes("RESOURCE_EXHAUSTED") ||
        llmError.includes("quota") || llmError.includes("Insufficient balance") ||
        llmError.includes("rate limit") || llmError.includes("Usage limit") ||
        llmError.includes("insufficient_quota") || llmError.includes("model_not_found") ||
        llmError.includes("provider_error") ||
        llmError.includes("1308") || llmError.includes("timeout")
      );
      if (isRetryable && attempt < models.length - 1) {
        // Google quota hit — flip to fallback (billed) key
        if (model.provider === "google") {
          setGoogleKeyFallback();
        }
        console.log(`[${label}] ${model.id} failed: ${llmError.substring(0, 120)} — falling back to ${models[attempt + 1].id}`);
        costMonitor.recordError(model.id, llmError, label as any, models[attempt + 1].id);
        continue;
      }
      console.error(`[${label}] LLM error (${model.id}): ${llmError.substring(0, 200)}`);
      costMonitor.recordError(model.id, llmError, label as any);
    }

    break;
  }

  return "";
}
