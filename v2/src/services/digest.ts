/**
 * Digest & Notification Service — Pixel reports to its human
 *
 * Two modes:
 *
 * 1. PERIODIC DIGEST (every 6 hours)
 *    Summarizes what Pixel did: posts made, replies sent, inner life phases,
 *    revenue earned, errors hit, new users. Sent via Telegram.
 *
 * 2. INSTANT ALERTS (real-time)
 *    Critical events pushed immediately: revenue received, errors,
 *    boot/shutdown, inner life evolution milestones.
 *
 * Design: minimal. V1 had 7 audit mechanisms and nobody read them.
 * V2 pushes the important stuff to your phone.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { notifyOwner, canNotify } from "../connectors/telegram.js";
import { getAuditSince, formatAuditSummary, audit } from "./audit.js";
import { getHeartbeatStatus } from "./heartbeat.js";
import { getInnerLifeStatus } from "./inner-life.js";
import { getClawstrNotifications } from "./clawstr.js";

// ============================================================
// Configuration
// ============================================================

const DIGEST_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const STARTUP_DIGEST_DELAY_MS = 3 * 60 * 1000;  // 3 minutes after boot (let services stabilize)

const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const ALERT_DEDUP_PATH = join(DATA_DIR, "alert-dedup.json");
const ALERT_DEDUP_DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour default window
const ALERT_DEDUP_PRUNE_MS = 6 * 60 * 60 * 1000;   // drop entries older than 6h on cleanup
const ALERT_DEDUP_MAX_ENTRIES = 200;
const ALERT_DEDUP_TTL_BY_CATEGORY: Record<string, number> = {
  boot: 6 * 60 * 60 * 1000,        // 6h — one boot alert per cycle
  revenue: 30 * 60 * 1000,          // 30min — re-alert allowed after half an hour
  error: 30 * 60 * 1000,            // 30min — flapping errors collapse, persistent ones re-surface
  evolution: 3 * 60 * 60 * 1000,    // 3h
  milestone: 2 * 60 * 60 * 1000,    // 2h
  engagement: 60 * 60 * 1000,       // 1h
  notify_owner: 30 * 60 * 1000,     // 30min — LLM tool path
};

// ============================================================
// State
// ============================================================

let digestTimer: ReturnType<typeof setTimeout> | null = null;
let lastDigestTime: Date = new Date();
let running = false;

// ─── Alert dedup registry ───────────────────────────────────

type DedupEntry = { fingerprint: string; ts: number; category: string };
let dedupState: { entries: DedupEntry[] } = { entries: [] };
let dedupLoaded = false;

function loadDedupState(): void {
  if (dedupLoaded) return;
  dedupLoaded = true;
  try {
    if (existsSync(ALERT_DEDUP_PATH)) {
      const raw = readFileSync(ALERT_DEDUP_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries)) {
        dedupState = { entries: parsed.entries };
      }
    }
  } catch {
    dedupState = { entries: [] };
  }
}

function saveDedupState(): void {
  try {
    writeFileSync(ALERT_DEDUP_PATH, JSON.stringify(dedupState, null, 2), "utf-8");
  } catch (err: any) {
    console.error("[digest] Failed to save alert dedup state:", err.message);
  }
}

function ttlForCategory(category: string): number {
  return ALERT_DEDUP_TTL_BY_CATEGORY[category] ?? ALERT_DEDUP_DEFAULT_TTL_MS;
}

/**
 * Compute a normalized fingerprint for an alert so the same logical event
 * (with slightly different wording) still deduplicates.
 * Incorporates a natural key from `data` (e.g. txHash) when available.
 */
export function alertFingerprint(
  category: string,
  message: string,
  data?: Record<string, any>
): string {
  const normalized = message
    .toLowerCase()
    .replace(/^\[[\w]+\]\s*/, "")   // strip [category] prefixes
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  const dataKey = data?.txHash ? `tx:${String(data.txHash).slice(0, 32)}` : "";
  return `${category}::${dataKey}::${normalized}`;
}

/**
 * Check whether an alert should be suppressed because a matching alert
 * was already delivered within its category's TTL window.
 */
export function shouldSuppressAlert(
  category: string,
  message: string,
  data?: Record<string, any>
): { suppress: boolean; fingerprint: string; ageMs?: number } {
  loadDedupState();
  const fingerprint = alertFingerprint(category, message, data);
  const now = Date.now();
  const ttl = ttlForCategory(category);
  // Prune stale entries on every check
  dedupState.entries = dedupState.entries.filter(
    (e) => now - e.ts < ALERT_DEDUP_PRUNE_MS
  );
  const match = dedupState.entries.find(
    (e) => e.fingerprint === fingerprint && now - e.ts < ttl
  );
  return match
    ? { suppress: true, fingerprint, ageMs: now - match.ts }
    : { suppress: false, fingerprint };
}

/** Record that an alert was delivered, so future duplicates are suppressed. */
export function markAlertSent(category: string, fingerprint: string): void {
  loadDedupState();
  dedupState.entries.push({ fingerprint, ts: Date.now(), category });
  if (dedupState.entries.length > ALERT_DEDUP_MAX_ENTRIES) {
    dedupState.entries = dedupState.entries.slice(-ALERT_DEDUP_MAX_ENTRIES);
  }
  saveDedupState();
}

// ============================================================
// Instant Alerts
// ============================================================

/**
 * Send an instant alert to the owner.
 * Call this from any service when something important happens.
 * Deduplicated by category + normalized message within a per-category TTL.
 */
export async function alertOwner(
  category: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  if (!canNotify()) return;

  const { suppress, fingerprint, ageMs } = shouldSuppressAlert(category, message, data);
  if (suppress) {
    audit("notification_suppressed", `Alert suppressed (dedup ${Math.round((ageMs ?? 0) / 1000)}s ago): ${category} — ${message.slice(0, 60)}`, data);
    console.log(`[digest] Suppressing duplicate alert [${category}] (${Math.round((ageMs ?? 0) / 1000)}s ago)`);
    return;
  }

  const prefix = categoryEmoji(category);
  const text = `${prefix} ${message}`;

  const sent = await notifyOwner(text);
  if (sent) {
    markAlertSent(category, fingerprint);
    audit("notification_sent", `Alert: ${category} — ${message.slice(0, 60)}`, data);
  }
}

function categoryEmoji(category: string): string {
  switch (category) {
    case "revenue": return "[revenue]";
    case "error": return "[error]";
    case "boot": return "[boot]";
    case "evolution": return "[evolution]";
    case "milestone": return "[milestone]";
    case "engagement": return "[engagement]";
    default: return `[${category}]`;
  }
}

// ============================================================
// Periodic Digest
// ============================================================

/** Generate and send the periodic digest */
async function sendDigest(): Promise<void> {
  if (!canNotify()) {
    console.log("[digest] Cannot notify owner (bot or chat ID missing)");
    scheduleNextDigest();
    return;
  }

  try {
    const since = lastDigestTime;
    const entries = getAuditSince(since);
    const heartbeat = getHeartbeatStatus();
    const innerLife = getInnerLifeStatus();

    const now = new Date();
    const hoursSince = Math.round((now.getTime() - since.getTime()) / (60 * 60 * 1000));

    // Build digest message
    const lines: string[] = [];
    lines.push(`-- Pixel Digest (last ${hoursSince}h) --`);
    lines.push("");

    // Heartbeat status
    lines.push(`Heartbeat: ${heartbeat.running ? "running" : "STOPPED"}`);
    lines.push(`  Posts: ${heartbeat.heartbeatCount} total`);
    if (heartbeat.lastPostTime) {
      const ago = Math.round((now.getTime() - new Date(heartbeat.lastPostTime).getTime()) / 60_000);
      lines.push(`  Last post: ${ago} min ago (${heartbeat.lastTopic}/${heartbeat.lastMood})`);
    }
    lines.push(`  Engagement: ${heartbeat.engagementActive ? "active" : "inactive"}`);

    // Inner life status
    lines.push("");
    lines.push(`Inner life: cycle ${innerLife.cycleCount}`);
    lines.push(`  Reflections: ${innerLife.hasReflections ? "yes" : "no"} (next in ${innerLife.nextReflect} beats)`);
    lines.push(`  Learnings: ${innerLife.hasLearnings ? "yes" : "no"} (next in ${innerLife.nextLearn} beats)`);
    lines.push(`  Ideas: ${innerLife.hasIdeas ? "yes" : "no"} (next in ${innerLife.nextIdeate} beats)`);
    lines.push(`  Evolution: ${innerLife.hasEvolution ? "yes" : "no"} (next in ${innerLife.nextEvolve} beats)`);

    // Clawstr snapshot
    try {
      const clawstr = await getClawstrNotifications(5);
      lines.push("");
      lines.push(`Clawstr: ${clawstr.count ?? "?"} notifications`);
      const preview = clawstr.output.split("\n").slice(0, 6).join("\n").trim();
      if (preview) lines.push(preview);
    } catch (err: any) {
      lines.push("");
      lines.push(`Clawstr: error (${err.message})`);
    }

    // Activity summary from audit log
    if (entries.length > 0) {
      lines.push("");
      lines.push(formatAuditSummary(entries));
    } else {
      lines.push("");
      lines.push("(no audit entries in this period)");
    }

    // System info
    lines.push("");
    lines.push(`Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`);
    lines.push(`Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);

    const digestText = lines.join("\n");
    const sent = await notifyOwner(digestText);

    if (sent) {
      lastDigestTime = now;
      audit("notification_sent", `Digest sent (${entries.length} entries, ${hoursSince}h period)`);
    }
  } catch (err: any) {
    console.error("[digest] Failed to send digest:", err.message);
  }

  scheduleNextDigest();
}

/** Schedule the next digest */
function scheduleNextDigest(): void {
  if (!running) return;
  digestTimer = setTimeout(sendDigest, DIGEST_INTERVAL_MS);
  const nextHours = Math.round(DIGEST_INTERVAL_MS / (60 * 60 * 1000));
  console.log(`[digest] Next digest in ~${nextHours} hours`);
}

// ============================================================
// Public API
// ============================================================

/** Start the digest service */
export function startDigest(): void {
  if (running) return;
  running = true;

  console.log(`[digest] Starting (first digest in ~${Math.round(STARTUP_DIGEST_DELAY_MS / 60_000)} minutes)`);

  // Delay first digest to let all services boot
  digestTimer = setTimeout(sendDigest, STARTUP_DIGEST_DELAY_MS);
}

/** Stop the digest service */
export function stopDigest(): void {
  running = false;
  if (digestTimer) {
    clearTimeout(digestTimer);
    digestTimer = null;
  }
  console.log("[digest] Stopped");
}

/** Get digest status */
export function getDigestStatus() {
  return {
    running,
    lastDigestTime: lastDigestTime.toISOString(),
    canNotify: canNotify(),
  };
}
