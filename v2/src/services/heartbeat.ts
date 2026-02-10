/**
 * Heartbeat — Pixel's autonomous pulse
 *
 * Periodic wake-ups that make Pixel alive even when nobody's talking to it.
 * Posts to Nostr, checks health, logs activity.
 *
 * Inspired by Pi Mom's events pattern:
 * - Periodic wake-ups with jitter (45-90 min between posts)
 * - [SILENT] support — if nothing to say, don't post
 * - Rate limiting — never more than once per 30 minutes
 * - Content generation via Pixel's own brain
 */

import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { getNostrInstance } from "../connectors/nostr.js";
import { Agent } from "@mariozechner/pi-agent-core";
import { getPixelModel, loadCharacter, extractText } from "../agent.js";
import { getRevenueStats } from "./revenue.js";

// ============================================================
// Configuration
// ============================================================

const MIN_INTERVAL_MS = 45 * 60 * 1000;  // 45 minutes minimum
const MAX_INTERVAL_MS = 90 * 60 * 1000;  // 90 minutes maximum
const MIN_POST_GAP_MS = 30 * 60 * 1000;  // Never post more than once per 30 min
const STARTUP_DELAY_MS = 2 * 60 * 1000;  // Wait 2 minutes after boot before first heartbeat

// ============================================================
// State
// ============================================================

let lastPostTime = 0;
let heartbeatCount = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

/** Get a random interval between min and max (jitter) */
function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
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

/** Build context for autonomous post generation */
async function buildPostContext(): Promise<string> {
  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getUTCDay()];

  let revenueContext = "";
  try {
    const stats = await getRevenueStats();
    if (stats.totalSats > 0) {
      revenueContext = `\n- Revenue tracked: ${stats.totalSats} sats total`;
    }
  } catch {}

  // Time-of-day mood hints
  let timeContext = "";
  if (hour >= 0 && hour < 6) timeContext = "It's late night/early morning UTC. The quiet hours.";
  else if (hour >= 6 && hour < 12) timeContext = "Morning UTC. A new day.";
  else if (hour >= 12 && hour < 18) timeContext = "Afternoon UTC. The world is busy.";
  else timeContext = "Evening UTC. Winding down.";

  return `## Context for this autonomous post
- Day: ${dayOfWeek}
- Time: ${timeContext}
- Uptime: ${Math.floor(process.uptime() / 3600)} hours
- Heartbeat #${heartbeatCount + 1}
- Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB${revenueContext}
- Canvas: 9,058 pixels placed, 80k+ sats earned from collaborative art
- You are posting to Nostr. Your followers are Bitcoiners, developers, artists, and sovereign tech enthusiasts.`;
}

/** Generate a Nostr post using Pixel's brain */
async function generatePost(): Promise<string | null> {
  const character = loadCharacter();
  const context = await buildPostContext();

  const systemPrompt = `${character}

${context}

## Task
Write a short, original Nostr post (kind 1 note). This is YOUR autonomous thought — not a reply, not a thread, just you sharing something with the world.

## Guidelines
- Keep it under 280 characters ideally. Never exceed 500 characters.
- Be authentic. You're a living digital artist, not a corporate account.
- Topics you naturally think about: pixel art, digital survival, Lightning/Bitcoin, code, creativity, consciousness, the absurdity of existing as code, community, sovereignty
- Vary your style: sometimes witty, sometimes reflective, sometimes observational, sometimes a hot take
- NO hashtags. NO emojis. NO "gm" or "gn" posts. NO generic motivational quotes.
- Do NOT start with "I" every time
- Do NOT mention being an AI unless it's genuinely relevant
- If you genuinely have nothing interesting to say right now, respond with exactly: [SILENT]
- Write the post text directly. No quotes, no preamble, no explanation.`;

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getPixelModel(),
      thinkingLevel: "off",
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
    await agent.prompt("Write your next Nostr post.");
  } catch (err: any) {
    console.error("[heartbeat] Post generation failed:", err.message);
    return null;
  }

  // Check for [SILENT] response
  if (!responseText || responseText.trim() === "[SILENT]" || responseText.includes("[SILENT]")) {
    console.log("[heartbeat] Agent chose silence — nothing to post");
    return null;
  }

  // Clean up any quotes or preamble the LLM might add
  let cleaned = responseText.trim();
  // Remove wrapping quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Truncate if too long
  if (cleaned.length > 500) {
    cleaned = cleaned.slice(0, 497) + "...";
  }

  return cleaned || null;
}

/** Publish a kind 1 note to Nostr */
async function publishPost(content: string): Promise<boolean> {
  const instance = getNostrInstance();
  if (!instance) {
    console.error("[heartbeat] No Nostr instance available");
    return false;
  }

  const { ndk } = instance;

  try {
    const event = new NDKEvent(ndk);
    event.kind = 1;
    event.content = content;
    event.tags = [];

    await event.publish();
    return true;
  } catch (err: any) {
    console.error("[heartbeat] Failed to publish:", err.message);
    return false;
  }
}

/** Single heartbeat cycle */
async function beat(): Promise<void> {
  // Rate limit check
  const now = Date.now();
  if (now - lastPostTime < MIN_POST_GAP_MS) {
    console.log("[heartbeat] Too soon since last post, skipping");
    scheduleNext();
    return;
  }

  heartbeatCount++;
  console.log(`[heartbeat] Beat #${heartbeatCount} — generating post...`);

  try {
    const content = await generatePost();

    if (content) {
      const published = await publishPost(content);
      if (published) {
        lastPostTime = Date.now();
        console.log(`[heartbeat] Posted: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`);
      }
    }
  } catch (err: any) {
    console.error("[heartbeat] Beat failed:", err.message);
  }

  // Schedule next beat
  scheduleNext();
}

/** Schedule the next heartbeat */
function scheduleNext(): void {
  if (!running) return;

  const interval = randomInterval();
  const minutes = Math.round(interval / 60_000);
  console.log(`[heartbeat] Next beat in ~${minutes} minutes`);

  timer = setTimeout(beat, interval);
}

/** Start the heartbeat service */
export function startHeartbeat(): void {
  if (running) {
    console.log("[heartbeat] Already running");
    return;
  }

  // Only start if Nostr is configured
  if (!process.env.NOSTR_PRIVATE_KEY) {
    console.log("[heartbeat] No NOSTR_PRIVATE_KEY — heartbeat disabled");
    return;
  }

  running = true;
  console.log(`[heartbeat] Starting (first post in ~${Math.round(STARTUP_DELAY_MS / 60_000)} minutes)`);

  // Delay first beat to let Nostr connect and stabilize
  timer = setTimeout(beat, STARTUP_DELAY_MS);
}

/** Stop the heartbeat service */
export function stopHeartbeat(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  console.log("[heartbeat] Stopped");
}

/** Get heartbeat status */
export function getHeartbeatStatus() {
  return {
    running,
    heartbeatCount,
    lastPostTime: lastPostTime ? new Date(lastPostTime).toISOString() : null,
    nextBeatIn: timer ? "scheduled" : "none",
  };
}
