/**
 * Audit Log — Pixel's accountability backbone
 *
 * Every significant action gets a timestamped JSONL entry.
 * This is how you know what Pixel did, when, and why.
 *
 * V1 had audit.json served publicly on the landing page.
 * V2 keeps it simpler: append-only JSONL in data/audit.jsonl,
 * FIFO-pruned to 1000 entries, readable via /api/audit endpoint.
 *
 * What gets logged:
 * - boot/shutdown events
 * - heartbeat posts (topic, mood, content preview)
 * - inner life phases (which phase, what was produced)
 * - engagement (replied to mentions, who, what)
 * - revenue events (source, amount, who paid)
 * - errors (what broke, severity)
 * - tool usage (what tool, by whom, result preview)
 * - conversation events (new user, compaction, memory extraction)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ============================================================
// Configuration
// ============================================================

const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const AUDIT_FILE = join(DATA_DIR, "audit.jsonl");
const MAX_ENTRIES = 1000;

// ============================================================
// Types
// ============================================================

export type AuditType =
  // Lifecycle
  | "boot"
  | "shutdown"
  // Heartbeat
  | "heartbeat_post"
  | "heartbeat_silent"
  | "heartbeat_error"
  // Engagement
  | "engagement_reply"
  | "engagement_check"
  | "engagement_error"
  | "zap_thanks"
  // Inner life
  | "inner_life_learn"
  | "inner_life_reflect"
  | "inner_life_ideate"
  | "inner_life_evolve"
  | "inner_life_error"
  // Revenue
  | "revenue"
  // Conversations
  | "conversation_new_user"
  | "conversation_compaction"
  | "memory_extraction"
  // Tools
  | "tool_use"
  // Errors
  | "error"
  // Notifications
  | "notification_sent"
  | "outreach_decision"
  // Reminders
  | "reminder"
  // Memory
  | "memory"
  // Cost monitoring
  | "cost_alert"
  // Clawstr
  | "clawstr_notifications"
  | "clawstr_reply"
  | "clawstr_error"
  // Security
  | "security_scan";

export interface AuditEntry {
  ts: string;         // ISO timestamp
  type: AuditType;
  summary: string;    // Human-readable one-liner
  data?: Record<string, any>; // Structured metadata
}

// ============================================================
// In-memory buffer for digest generation
// ============================================================

/** Recent entries kept in memory for fast digest access */
let recentEntries: AuditEntry[] = [];
const MAX_RECENT = 200;

// ============================================================
// Core functions
// ============================================================

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Log an audit entry. Append-only, FIFO-pruned.
 */
export function audit(type: AuditType, summary: string, data?: Record<string, any>): void {
  ensureDataDir();

  const entry: AuditEntry = {
    ts: new Date().toISOString(),
    type,
    summary,
    ...(data ? { data } : {}),
  };

  // In-memory buffer
  recentEntries.push(entry);
  if (recentEntries.length > MAX_RECENT) {
    recentEntries = recentEntries.slice(-MAX_RECENT);
  }

  // Append to file
  try {
    const line = JSON.stringify(entry) + "\n";

    // Read existing, append, prune if needed
    let existing = "";
    if (existsSync(AUDIT_FILE)) {
      existing = readFileSync(AUDIT_FILE, "utf-8");
    }

    const lines = existing.split("\n").filter(Boolean);
    lines.push(JSON.stringify(entry));

    // FIFO prune
    const pruned = lines.length > MAX_ENTRIES ? lines.slice(-MAX_ENTRIES) : lines;
    writeFileSync(AUDIT_FILE, pruned.join("\n") + "\n", "utf-8");
  } catch (err: any) {
    console.error("[audit] Failed to write:", err.message);
  }

  // Console echo for container logs
  console.log(`[audit] ${type}: ${summary}`);
}

export function auditToolUse(tool: string, input?: unknown, output?: unknown): void {
  const sanitize = (value: unknown) => {
    if (value == null) return value;
    if (typeof value === "string") return value.slice(0, 800);
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value).slice(0, 800);
    }
  };

  audit("tool_use", `Tool: ${tool}`, {
    input: sanitize(input),
    output: sanitize(output),
  });
}

/**
 * Get recent audit entries (from memory buffer).
 * For full history, read the JSONL file directly.
 */
export function getRecentAudit(limit = 50): AuditEntry[] {
  return recentEntries.slice(-limit);
}

/**
 * Get all audit entries from disk.
 */
export function readFullAudit(limit = 200): AuditEntry[] {
  if (!existsSync(AUDIT_FILE)) return [];

  try {
    const content = readFileSync(AUDIT_FILE, "utf-8");
    const lines = content.split("\n").filter(Boolean);
    const entries: AuditEntry[] = [];

    for (const line of lines.slice(-limit)) {
      try {
        entries.push(JSON.parse(line));
      } catch {}
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * Get audit entries since a given timestamp.
 * Used by the digest system to summarize recent activity.
 */
export function getAuditSince(since: Date): AuditEntry[] {
  const sinceTs = since.toISOString();
  return recentEntries.filter((e) => e.ts >= sinceTs);
}

/**
 * Get a human-readable summary of recent audit entries.
 * Used for digest generation.
 */
export function formatAuditSummary(entries: AuditEntry[]): string {
  if (entries.length === 0) return "(no activity)";

  const counts: Record<string, number> = {};
  const highlights: string[] = [];

  for (const entry of entries) {
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;

    // Pick out notable entries for highlights
    if (entry.type === "heartbeat_post") {
      highlights.push(`Posted: "${entry.data?.content?.slice(0, 60) ?? entry.summary}"`);
    } else if (entry.type === "revenue") {
      highlights.push(`Revenue: ${entry.data?.amountSats ?? "?"} sats from ${entry.data?.source ?? "?"}`);
    } else if (entry.type === "error" || entry.type === "heartbeat_error") {
      highlights.push(`Error: ${entry.summary}`);
    } else if (entry.type === "engagement_reply") {
      highlights.push(`Replied to mention from ${entry.data?.from?.slice(0, 12) ?? "?"}`);
    } else if (entry.type.startsWith("inner_life_") && entry.type !== "inner_life_error") {
      const phase = entry.type.replace("inner_life_", "").toUpperCase();
      highlights.push(`Inner life: ${phase} completed`);
    }
  }

  const lines: string[] = [];

  // Activity counts
  const countStr = Object.entries(counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  lines.push(`Activity: ${countStr}`);

  // Highlights (cap at 10)
  if (highlights.length > 0) {
    lines.push("");
    lines.push("Highlights:");
    for (const h of highlights.slice(-10)) {
      lines.push(`- ${h}`);
    }
  }

  return lines.join("\n");
}

// Load existing entries into memory on module init
try {
  const existing = readFullAudit(MAX_RECENT);
  recentEntries = existing;
} catch {}
