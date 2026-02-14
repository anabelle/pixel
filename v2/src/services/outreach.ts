/**
 * Proactive Outreach — Pixel thinks of its owner
 *
 * Goal: send thoughtful, human-grade pings when something is genuinely
 * important or interesting. Not a digest. Not routine. Real judgment.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { Agent } from "@mariozechner/pi-agent-core";
import { getPixelModel, extractText, loadCharacter } from "../agent.js";
import { canNotify, notifyOwner } from "../connectors/telegram.js";
import { getHeartbeatStatus } from "./heartbeat.js";
import { getInnerLifeStatus } from "./inner-life.js";
import { getRevenueStats } from "./revenue.js";
import { getUserStats } from "./users.js";
import { audit } from "./audit.js";

// ============================================================
// Configuration
// ============================================================

const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const CONVERSATIONS_DIR = process.env.DATA_DIR ?? "./conversations";
const OWNER_TG_ID = process.env.OWNER_TELEGRAM_ID ?? "";
const OWNER_CONVO_ID = OWNER_TG_ID ? `tg-${OWNER_TG_ID}` : "";

const STARTUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes after boot
const OUTREACH_INTERVAL_MS = 4 * 60 * 60 * 1000; // check every 4 hours
const MIN_NOTIFY_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours between proactive pings
const URGENT_OVERRIDE_GAP_MS = 60 * 60 * 1000; // 1 hour if urgent
const DAILY_LIMIT = 3;
const HASH_HISTORY_LIMIT = 50;

const STATE_PATH = join(DATA_DIR, "outreach.json");

// ============================================================
// State
// ============================================================

type OutreachState = {
  lastRunAt?: number | null;
  lastNotifyAt?: number | null;
  lastNotifyDay?: string | null;
  notifyCountToday?: number;
  recentHashes?: string[];
};

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let state: OutreachState = {};

// ============================================================
// Helpers
// ============================================================

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadState(): void {
  ensureDataDir();
  if (!existsSync(STATE_PATH)) return;
  try {
    const raw = readFileSync(STATE_PATH, "utf-8");
    state = JSON.parse(raw) as OutreachState;
  } catch {
    state = {};
  }
}

function saveState(): void {
  ensureDataDir();
  try {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err: any) {
    console.error("[outreach] Failed to save state:", err.message);
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashMessage(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function sanitizeMemory(content: string): string {
  return content.replace(/```[\s\S]*?```/g, "").trim();
}

function readText(path: string, maxLen = 1200): string {
  if (!existsSync(path)) return "";
  try {
    const content = readFileSync(path, "utf-8");
    return content.length > maxLen ? content.slice(0, maxLen) : content;
  } catch {
    return "";
  }
}

function readLatestReflection(): string {
  const reflections = readText(join(DATA_DIR, "reflections.md"), 2400);
  if (!reflections) return "";
  const parts = reflections.split("### ").filter(Boolean);
  if (parts.length === 0) return "";
  return parts[0].trim();
}

function readOwnerMemory(): string {
  if (!OWNER_CONVO_ID) return "";
  const memPath = join(CONVERSATIONS_DIR, OWNER_CONVO_ID, "memory.md");
  const raw = readText(memPath, 1600);
  return sanitizeMemory(raw);
}

function readOwnerLog(): string {
  if (!OWNER_CONVO_ID) return "";
  const logPath = join(CONVERSATIONS_DIR, OWNER_CONVO_ID, "log.jsonl");
  if (!existsSync(logPath)) return "";
  try {
    const lines = readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
    const slice = lines.slice(-8);
    const formatted = slice.map((line) => {
      try {
        const entry = JSON.parse(line);
        const user = String(entry.user ?? "").slice(0, 160);
        const assistant = String(entry.assistant ?? "").slice(0, 160);
        return `User: ${user}\nPixel: ${assistant}`.trim();
      } catch {
        return line.slice(0, 200);
      }
    });
    return formatted.join("\n\n");
  } catch {
    return "";
  }
}

/** Get API key for the given provider */
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

// ============================================================
// Core
// ============================================================

type OutreachDecision = {
  shouldNotify: boolean;
  urgency: number;
  summary: string;
  message: string;
  category: "insight" | "decision" | "issue" | "opportunity" | "checkin";
};

async function decideOutreach(): Promise<OutreachDecision | null> {
  const character = loadCharacter();
  const ownerMemory = readOwnerMemory();
  const ownerLog = readOwnerLog();
  const latestReflection = readLatestReflection();
  const learnings = readText(join(DATA_DIR, "learnings.md"), 1200);
  const ideas = readText(join(DATA_DIR, "ideas.md"), 1000);
  const evolution = readText(join(DATA_DIR, "evolution.md"), 1000);

  let revenueLine = "";
  try {
    const stats = await getRevenueStats();
    revenueLine = `Revenue recorded: ${stats.totalSats} sats`;
  } catch {}

  let usersLine = "";
  try {
    const stats = await getUserStats();
    usersLine = `Users: ${stats.totalUsers} total, ${stats.activeUsers} active`;
  } catch {}

  const heartbeat = getHeartbeatStatus();
  const innerLife = getInnerLifeStatus();

  const systemPrompt = `${character}

You are deciding whether to proactively message your owner (Ana) on Telegram.
This is NOT a digest. Only message if something is genuinely important,
actionable, or emotionally resonant for her. Be selective.

Output JSON only with:
{
  "shouldNotify": true|false,
  "urgency": 0-100,
  "summary": "short reason",
  "message": "1-3 sentences in your voice",
  "category": "insight|decision|issue|opportunity|checkin"
}

Rules:
- If nothing truly worth interrupting her, set shouldNotify=false.
- No routine status updates or repeating the digest.
- If you do notify, keep it concise and human.
- Do not mention internal file paths.
`;

  const userPrompt = `Owner context:
${ownerMemory || "(no owner memory found)"}

Recent owner conversation snippets:
${ownerLog || "(no recent direct messages)"}

Inner life signals:
- Latest reflection: ${latestReflection || "(none)"}
- Learnings: ${learnings || "(none)"}
- Ideas: ${ideas || "(none)"}
- Evolution: ${evolution || "(none)"}

System signals:
- Heartbeat running: ${heartbeat.running}
- Last post topic/mood: ${heartbeat.lastTopic ?? "?"}/${heartbeat.lastMood ?? "?"}
- Inner life cycle: ${innerLife.cycleCount}
- ${revenueLine || "Revenue: unknown"}
- ${usersLine || "Users: unknown"}

Decide if you should proactively reach out now.`;

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getPixelModel(),
      thinkingLevel: "minimal",
      tools: [],
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  let responseText = "";
  agent.subscribe((event: any) => {
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const text = extractText(event.message);
      if (text) responseText = text;
    }
  });

  try {
    await agent.prompt(userPrompt);
  } catch (err: any) {
    console.error("[outreach] Decision LLM call failed:", err.message);
    return null;
  }

  if (!responseText) return null;
  const match = responseText.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as OutreachDecision;
    if (!parsed || typeof parsed.shouldNotify !== "boolean") return null;
    parsed.urgency = Number.isFinite(parsed.urgency) ? parsed.urgency : 0;
    parsed.message = String(parsed.message ?? "").trim();
    parsed.summary = String(parsed.summary ?? "").trim();
    return parsed;
  } catch {
    return null;
  }
}

async function runOutreach(): Promise<void> {
  if (!running) return;
  state.lastRunAt = Date.now();
  saveState();

  if (!OWNER_TG_ID || !canNotify()) {
    audit("outreach_decision", "Outreach skipped: owner notify unavailable", { hasOwnerId: Boolean(OWNER_TG_ID) });
    scheduleNext();
    return;
  }

  const decision = await decideOutreach();
  if (!decision) {
    audit("outreach_decision", "Outreach skipped: no decision", {});
    scheduleNext();
    return;
  }

  if (!decision.shouldNotify || !decision.message) {
    audit("outreach_decision", "Outreach skipped: not worth notifying", { summary: decision.summary, urgency: decision.urgency });
    scheduleNext();
    return;
  }

  const now = Date.now();
  const lastNotify = state.lastNotifyAt ?? 0;
  const sinceLast = now - lastNotify;
  const isUrgent = decision.urgency >= 85;
  const minGap = isUrgent ? URGENT_OVERRIDE_GAP_MS : MIN_NOTIFY_GAP_MS;

  const today = todayKey();
  if (state.lastNotifyDay !== today) {
    state.lastNotifyDay = today;
    state.notifyCountToday = 0;
  }

  if (sinceLast < minGap) {
    audit("outreach_decision", "Outreach skipped: cooldown", { summary: decision.summary, urgency: decision.urgency, sinceLastMs: sinceLast });
    scheduleNext();
    return;
  }

  if ((state.notifyCountToday ?? 0) >= DAILY_LIMIT && !isUrgent) {
    audit("outreach_decision", "Outreach skipped: daily limit", { summary: decision.summary, urgency: decision.urgency });
    scheduleNext();
    return;
  }

  const hash = hashMessage(decision.message);
  const recentHashes = state.recentHashes ?? [];
  if (recentHashes.includes(hash)) {
    audit("outreach_decision", "Outreach skipped: duplicate message", { summary: decision.summary, urgency: decision.urgency });
    scheduleNext();
    return;
  }

  const sent = await notifyOwner(decision.message);
  if (sent) {
    state.lastNotifyAt = now;
    state.notifyCountToday = (state.notifyCountToday ?? 0) + 1;
    state.recentHashes = [...recentHashes, hash].slice(-HASH_HISTORY_LIMIT);
    saveState();
    audit("notification_sent", "Proactive outreach sent", {
      category: decision.category,
      urgency: decision.urgency,
      summary: decision.summary,
    });
    appendOwnerLog(decision.message);
  } else {
    audit("outreach_decision", "Outreach failed to send", { summary: decision.summary, urgency: decision.urgency });
  }

  scheduleNext();
}

function scheduleNext(): void {
  if (!running) return;
  timer = setTimeout(runOutreach, OUTREACH_INTERVAL_MS);
  console.log(`[outreach] Next check in ~${Math.round(OUTREACH_INTERVAL_MS / 60_000)} minutes`);
}

// ============================================================
// Public API
// ============================================================

export function startOutreach(): void {
  if (running) return;
  running = true;
  loadState();
  console.log(`[outreach] Starting (first check in ~${Math.round(STARTUP_DELAY_MS / 60_000)} minutes)`);
  timer = setTimeout(runOutreach, STARTUP_DELAY_MS);
}

export function stopOutreach(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  console.log("[outreach] Stopped");
}

export function getOutreachStatus() {
  return {
    running,
    lastRunAt: state.lastRunAt ?? null,
    lastNotifyAt: state.lastNotifyAt ?? null,
    notifyCountToday: state.notifyCountToday ?? 0,
    lastNotifyDay: state.lastNotifyDay ?? null,
    canNotify: canNotify(),
  };
}

function appendOwnerLog(message: string): void {
  if (!OWNER_CONVO_ID) return;
  try {
    const path = join(CONVERSATIONS_DIR, OWNER_CONVO_ID, "log.jsonl");
    const entry = {
      ts: new Date().toISOString(),
      platform: "telegram",
      user: "[proactive_outreach]",
      assistant: message,
    };
    const dir = join(CONVERSATIONS_DIR, OWNER_CONVO_ID);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(path, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err: any) {
    console.error("[outreach] Failed to append owner log:", err.message);
  }
}
