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

import { notifyOwner, canNotify } from "../connectors/telegram.js";
import { getAuditSince, formatAuditSummary, audit } from "./audit.js";
import { getHeartbeatStatus } from "./heartbeat.js";
import { getInnerLifeStatus } from "./inner-life.js";

// ============================================================
// Configuration
// ============================================================

const DIGEST_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const STARTUP_DIGEST_DELAY_MS = 3 * 60 * 1000;  // 3 minutes after boot (let services stabilize)

// ============================================================
// State
// ============================================================

let digestTimer: ReturnType<typeof setTimeout> | null = null;
let lastDigestTime: Date = new Date();
let running = false;

// ============================================================
// Instant Alerts
// ============================================================

/**
 * Send an instant alert to the owner.
 * Call this from any service when something important happens.
 */
export async function alertOwner(
  category: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  if (!canNotify()) return;

  const prefix = categoryEmoji(category);
  const text = `${prefix} ${message}`;

  const sent = await notifyOwner(text);
  if (sent) {
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
