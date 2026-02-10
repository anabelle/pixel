/**
 * Conversation Persistence — JSONL per-user directories
 *
 * Pi Mom pattern adapted for Pixel:
 * - conversations/{userId}/log.jsonl    — full history (source of truth)
 * - conversations/{userId}/context.json — current LLM context (messages array for replaceMessages)
 * - conversations/{userId}/memory.md    — agent-written notes about the user
 *
 * We keep context.json as a JSON array (not JSONL) because pi-agent-core's
 * replaceMessages() wants AgentMessage[]. The log.jsonl is append-only for
 * durability and debugging.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";

const DATA_DIR = process.env.DATA_DIR ?? "./conversations";

// Maximum messages to keep in context (prevents unbounded growth)
const MAX_CONTEXT_MESSAGES = 50;

// When context hits this threshold, compaction is triggered
const COMPACTION_THRESHOLD = 40;

// After compaction, keep this many recent messages intact
const KEEP_RECENT_MESSAGES = 20;

/** Ensure the user's conversation directory exists */
function ensureUserDir(userId: string): string {
  // Sanitize userId to prevent path traversal
  const safeId = userId.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  const dir = join(DATA_DIR, safeId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Load the current LLM context for a user.
 * Returns an array of AgentMessage objects ready for replaceMessages().
 */
export function loadContext(userId: string): any[] {
  const dir = ensureUserDir(userId);
  const contextPath = join(dir, "context.json");

  if (!existsSync(contextPath)) {
    return [];
  }

  try {
    const raw = readFileSync(contextPath, "utf-8");
    const messages = JSON.parse(raw);
    if (!Array.isArray(messages)) return [];
    return messages;
  } catch (err: any) {
    console.error(`[conversations] Failed to load context for ${userId}:`, err.message);
    return [];
  }
}

/**
 * Save the current LLM context for a user.
 * Trims to MAX_CONTEXT_MESSAGES to prevent unbounded growth.
 * Keeps the most recent messages.
 */
export function saveContext(userId: string, messages: any[]): void {
  const dir = ensureUserDir(userId);
  const contextPath = join(dir, "context.json");

  // Trim old messages but keep recent ones
  let toSave = messages;
  if (messages.length > MAX_CONTEXT_MESSAGES) {
    toSave = messages.slice(-MAX_CONTEXT_MESSAGES);
  }

  try {
    writeFileSync(contextPath, JSON.stringify(toSave, null, 0), "utf-8");
  } catch (err: any) {
    console.error(`[conversations] Failed to save context for ${userId}:`, err.message);
  }
}

/**
 * Append an exchange (user message + assistant response) to the log.
 * log.jsonl is append-only — one JSON object per line.
 */
export function appendToLog(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  platform: string
): void {
  const dir = ensureUserDir(userId);
  const logPath = join(dir, "log.jsonl");

  const entry = {
    ts: new Date().toISOString(),
    platform,
    user: userMessage,
    assistant: assistantResponse,
  };

  try {
    appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err: any) {
    console.error(`[conversations] Failed to append log for ${userId}:`, err.message);
  }
}

/**
 * Load user memory (agent-written notes about this user).
 */
export function loadMemory(userId: string): string {
  const dir = ensureUserDir(userId);
  const memoryPath = join(dir, "memory.md");

  if (!existsSync(memoryPath)) {
    return "";
  }

  try {
    return readFileSync(memoryPath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Save user memory.
 */
export function saveMemory(userId: string, memory: string): void {
  const dir = ensureUserDir(userId);
  const memoryPath = join(dir, "memory.md");

  try {
    writeFileSync(memoryPath, memory, "utf-8");
  } catch (err: any) {
    console.error(`[conversations] Failed to save memory for ${userId}:`, err.message);
  }
}

/**
 * Get stats about a user's conversation history.
 */
export function getConversationStats(userId: string): {
  contextMessages: number;
  logEntries: number;
  hasMemory: boolean;
} {
  const dir = ensureUserDir(userId);
  const contextPath = join(dir, "context.json");
  const logPath = join(dir, "log.jsonl");
  const memoryPath = join(dir, "memory.md");

  let contextMessages = 0;
  let logEntries = 0;

  if (existsSync(contextPath)) {
    try {
      const ctx = JSON.parse(readFileSync(contextPath, "utf-8"));
      contextMessages = Array.isArray(ctx) ? ctx.length : 0;
    } catch {}
  }

  if (existsSync(logPath)) {
    try {
      const lines = readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
      logEntries = lines.length;
    } catch {}
  }

  return {
    contextMessages,
    logEntries,
    hasMemory: existsSync(memoryPath),
  };
}

/**
 * Check if a user's context needs compaction.
 * Returns true when context reaches COMPACTION_THRESHOLD.
 */
export function needsCompaction(userId: string): boolean {
  const messages = loadContext(userId);
  return messages.length >= COMPACTION_THRESHOLD;
}

/**
 * Get messages that should be summarized during compaction.
 * Returns the older messages (everything except the most recent KEEP_RECENT_MESSAGES).
 */
export function getMessagesForCompaction(userId: string): {
  toSummarize: any[];
  toKeep: any[];
} {
  const messages = loadContext(userId);
  if (messages.length < COMPACTION_THRESHOLD) {
    return { toSummarize: [], toKeep: messages };
  }

  const toKeep = messages.slice(-KEEP_RECENT_MESSAGES);
  const toSummarize = messages.slice(0, messages.length - KEEP_RECENT_MESSAGES);
  return { toSummarize, toKeep };
}

/**
 * Save compacted context — replaces old messages with a summary message
 * followed by the recent messages.
 *
 * @param userId - User to compact context for
 * @param summary - The LLM-generated summary text
 * @param recentMessages - The recent messages to keep intact
 */
export function saveCompactedContext(
  userId: string,
  summary: string,
  recentMessages: any[]
): void {
  const dir = ensureUserDir(userId);
  const contextPath = join(dir, "context.json");

  // Create a synthetic assistant message containing the conversation summary
  const summaryMessage = {
    role: "assistant",
    content: `[Previous conversation summary]\n${summary}`,
    metadata: { type: "compaction-summary", compactedAt: new Date().toISOString() },
  };

  const compacted = [summaryMessage, ...recentMessages];

  try {
    writeFileSync(contextPath, JSON.stringify(compacted, null, 0), "utf-8");
    console.log(
      `[conversations] Compacted context for ${userId}: ${recentMessages.length + 1} messages (was ${recentMessages.length + compacted.length})`
    );
  } catch (err: any) {
    console.error(`[conversations] Failed to save compacted context for ${userId}:`, err.message);
  }
}
