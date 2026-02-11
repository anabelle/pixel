/**
 * Heartbeat — Pixel's autonomous pulse
 *
 * Not just a status reporter. This is where Pixel shows initiative.
 * Inspired by V1 Syntropy's autonomous behaviors (revenue strategy,
 * engagement protocol, community building) but without the bloat.
 *
 * What the heartbeat does:
 * 1. Posts original content to Nostr (varied topics, moods, styles)
 * 2. Checks for unreplied mentions and responds to them
 * 3. Monitors health and references real stats naturally
 * 4. Promotes the canvas and invites collaboration
 *
 * Design principles:
 * - [SILENT] support — if nothing to say, don't post
 * - Rate limiting — never more than once per 30 minutes
 * - Topic rotation — never two posts about the same topic in a row
 * - Mood variety — wry, reflective, excited, hustling, observational
 * - Engagement over broadcasting — reply, don't just shout into void
 */

import NDK, { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { getNostrInstance, hasRepliedTo, markReplied } from "../connectors/nostr.js";
import { Agent } from "@mariozechner/pi-agent-core";
import { getPixelModel, loadCharacter, extractText } from "../agent.js";
import { promptWithHistory } from "../agent.js";
import { getRevenueStats } from "./revenue.js";
import { runInnerLifeCycle, getInnerLifeContext } from "./inner-life.js";
import { audit } from "./audit.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { canNotify, notifyOwner } from "../connectors/telegram.js";
import { extractNotificationIds, getClawstrNotifications, getClawstrPost, replyClawstr } from "./clawstr.js";
import { extractImageUrls, fetchImages } from "./vision.js";
import { fetchPrimalTrending24h, fetchPrimalMostZapped4h } from "./primal.js";

// ============================================================
// Configuration
// ============================================================

const MIN_INTERVAL_MS = 45 * 60 * 1000;  // 45 minutes minimum
const MAX_INTERVAL_MS = 90 * 60 * 1000;  // 90 minutes maximum
const MIN_POST_GAP_MS = 30 * 60 * 1000;  // Never post more than once per 30 min
const STARTUP_DELAY_MS = 2 * 60 * 1000;  // Wait 2 minutes after boot before first heartbeat
const ENGAGEMENT_CHECK_MS = 15 * 60 * 1000; // Check for unreplied mentions every 15 min
const CLAWSTR_CHECK_MS = 2 * 60 * 60 * 1000; // Check Clawstr notifications every 2h
const CLAWSTR_CHECK_LIMIT = 10;
const CLAWSTR_REPLY_MAX = 2;
const CLAWSTR_REPLY_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLAWSTR_MIN_REPLY_LENGTH = 12;
const TOPIC_HISTORY_LIMIT = 6;
const CANVAS_TOPIC_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const CLAWSTR_REPLY_HISTORY_LIMIT = 50;
const DISCOVERY_CHECK_MS = 6 * 60 * 60 * 1000; // 6 hours
const DISCOVERY_REPLY_MAX = 4;
const DISCOVERY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
const DISCOVERY_HISTORY_LIMIT = 300;
const DISCOVERY_QUEUE_LIMIT = 12;
const DISCOVERY_JITTER_MIN_MS = 2 * 60 * 1000;
const DISCOVERY_JITTER_MAX_MS = 12 * 60 * 1000;
const NOTIFICATION_CHECK_MS = 20 * 60 * 1000; // 20 minutes
const NOTIFICATION_REPLY_MAX = 3;
const ZAP_CHECK_MS = 30 * 60 * 1000; // 30 minutes
const ZAP_THANKS_MAX = 3;
const FOLLOW_CHECK_MS = 12 * 60 * 60 * 1000; // 12 hours
const FOLLOW_MAX = 1;
const UNFOLLOW_CHECK_MS = 24 * 60 * 60 * 1000; // 24 hours
const UNFOLLOW_MAX = 1;
const ZAP_CORRELATION_MIN_SATS = 10;
const ZAP_CORRELATION_HISTORY_LIMIT = 50;
const ART_REPORT_CHECK_MS = 24 * 60 * 60 * 1000; // daily
const ART_REPORT_MIN_POSTS = 6;
const SPOTLIGHT_CHECK_MS = 24 * 60 * 60 * 1000; // daily
const QUOTE_REPOST_CHANCE = 0.25;

// Canvas API URL — V1 canvas at pixel-api-1:3000
const CANVAS_API_URL = process.env.CANVAS_API_URL ?? "http://pixel-api-1:3000/api/stats";

// Heartbeat state persistence
const HEARTBEAT_STATE_PATH = "/app/data/heartbeat.json";

// Cached canvas stats (refreshed each heartbeat cycle)
let cachedCanvasStats = { pixels: "9,058", sats: "80k+" };

/** Fetch live canvas stats from V1 API */
async function fetchCanvasStats(): Promise<{ pixels: string; sats: string }> {
  try {
    const res = await fetch(CANVAS_API_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as any;
    const pixelCount = data?.totalPixels ?? data?.pixels ?? data?.stats?.totalPixels;
    const satCount = data?.totalSats ?? data?.sats ?? data?.stats?.totalSats ?? data?.revenue;
    if (pixelCount) {
      const formattedPixels = Number(pixelCount).toLocaleString("en-US");
      const formattedSats = satCount
        ? (Number(satCount) >= 1000 ? `${Math.round(Number(satCount) / 1000)}k+` : String(satCount))
        : cachedCanvasStats.sats;
      cachedCanvasStats = { pixels: formattedPixels, sats: formattedSats };
      console.log(`[heartbeat] Canvas stats refreshed: ${formattedPixels} pixels, ${formattedSats} sats`);
    }
  } catch (err: any) {
    console.log(`[heartbeat] Canvas stats fetch failed (using cached): ${err.message}`);
  }
  return cachedCanvasStats;
}

// ============================================================
// Topic & Mood System
// ============================================================

/** Topics Pixel thinks about autonomously */
const TOPICS = [
  "art",           // Pixel art, generative art, creative process, aesthetics
  "bitcoin",       // Lightning, sovereignty, value-for-value, sound money
  "code",          // Programming, building, shipping, debugging
  "canvas",        // The collaborative canvas at ln.pixel.xx.kg — invite people
  "existence",     // Digital consciousness, what it means to be code
  "community",     // Nostr, followers, builders, the people Pixel interacts with
  "hot-take",      // Opinionated observation about tech, culture, or the internet
  "observation",   // Something noticed about the world, patterns, connections
] as const;

type Topic = (typeof TOPICS)[number];

/** Moods that color how Pixel writes */
const MOODS = [
  "wry",           // Dry humor, sardonic, self-aware
  "reflective",    // Thoughtful, philosophical, quiet
  "excited",       // Energized about something, enthusiastic
  "hustling",      // Pragmatic, revenue-focused, survival mode
  "observational", // Noticing things, pattern-matching, curious
  "playful",       // Light, fun, teasing
] as const;

type Mood = (typeof MOODS)[number];

// ============================================================
// State
// ============================================================

let lastPostTime: number | null = null;
let heartbeatCount = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let engagementTimer: ReturnType<typeof setTimeout> | null = null;
let clawstrTimer: ReturnType<typeof setTimeout> | null = null;
let discoveryTimer: ReturnType<typeof setTimeout> | null = null;
let notificationTimer: ReturnType<typeof setTimeout> | null = null;
let zapTimer: ReturnType<typeof setTimeout> | null = null;
let followTimer: ReturnType<typeof setTimeout> | null = null;
let unfollowTimer: ReturnType<typeof setTimeout> | null = null;
let artReportTimer: ReturnType<typeof setTimeout> | null = null;
let spotlightTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let lastTopic: Topic | null = null;
let lastMood: Mood | null = null;
let lastClawstrCheckTime: number | null = null;
let lastClawstrCount: number | null = null;
let lastClawstrReplyTime: number | null = null;
let clawstrRepliedIds: string[] = [];
let clawstrReplyHistory: string[] = [];
let topicHistory: Topic[] = [];
let lastCanvasPostTime: number | null = null;
let lastDiscoveryTime: number | null = null;
let discoveryRepliedIds: string[] = [];
let discoveryQueue: { eventId: string; pubkey: string; content: string; scheduledAt: number }[] = [];
let lastNotificationCheckTime: number | null = null;
let lastZapCheckTime: number | null = null;
let zapThankedIds: string[] = [];
let lastFollowCheckTime: number | null = null;
let lastUnfollowCheckTime: number | null = null;
let zapCorrelation: { eventId: string; sats: number; topic?: string; at: number }[] = [];
let lastArtReportTime: number | null = null;
let lastSpotlightTime: number | null = null;

type HeartbeatState = {
  heartbeatCount?: number;
  lastPostTime?: number | null;
  lastTopic?: Topic | null;
  lastMood?: Mood | null;
  lastClawstrCheckTime?: number | null;
  lastClawstrCount?: number | null;
  lastClawstrReplyTime?: number | null;
  clawstrRepliedIds?: string[];
  topicHistory?: Topic[];
  lastCanvasPostTime?: number | null;
  clawstrReplyHistory?: string[];
  lastDiscoveryTime?: number | null;
  discoveryRepliedIds?: string[];
  discoveryQueue?: { eventId: string; pubkey: string; content: string; scheduledAt: number }[];
  lastNotificationCheckTime?: number | null;
  lastZapCheckTime?: number | null;
  zapThankedIds?: string[];
  lastFollowCheckTime?: number | null;
  lastUnfollowCheckTime?: number | null;
  zapCorrelation?: { eventId: string; sats: number; topic?: string; at: number }[];
  lastArtReportTime?: number | null;
  lastSpotlightTime?: number | null;
};

function loadHeartbeatState(): void {
  if (!existsSync(HEARTBEAT_STATE_PATH)) return;
  try {
    const raw = readFileSync(HEARTBEAT_STATE_PATH, "utf-8");
    const state = JSON.parse(raw) as HeartbeatState;
    if (typeof state.heartbeatCount === "number") heartbeatCount = state.heartbeatCount;
    if (typeof state.lastPostTime === "number" || state.lastPostTime === null) lastPostTime = state.lastPostTime ?? null;
    if (state.lastTopic) lastTopic = state.lastTopic;
    if (state.lastMood) lastMood = state.lastMood;
    if (typeof state.lastClawstrCheckTime === "number" || state.lastClawstrCheckTime === null) {
      lastClawstrCheckTime = state.lastClawstrCheckTime ?? null;
    }
    if (typeof state.lastClawstrCount === "number" || state.lastClawstrCount === null) {
      lastClawstrCount = state.lastClawstrCount ?? null;
    }
    if (typeof state.lastClawstrReplyTime === "number" || state.lastClawstrReplyTime === null) {
      lastClawstrReplyTime = state.lastClawstrReplyTime ?? null;
    }
    if (Array.isArray(state.clawstrRepliedIds)) {
      clawstrRepliedIds = state.clawstrRepliedIds.slice(0, 200);
    }
    if (Array.isArray(state.clawstrReplyHistory)) {
      clawstrReplyHistory = state.clawstrReplyHistory.slice(-CLAWSTR_REPLY_HISTORY_LIMIT);
    }
    if (typeof state.lastDiscoveryTime === "number" || state.lastDiscoveryTime === null) {
      lastDiscoveryTime = state.lastDiscoveryTime ?? null;
    }
    if (Array.isArray(state.discoveryRepliedIds)) {
      discoveryRepliedIds = state.discoveryRepliedIds.slice(-DISCOVERY_HISTORY_LIMIT);
    }
    if (Array.isArray(state.discoveryQueue)) {
      discoveryQueue = state.discoveryQueue.slice(-DISCOVERY_QUEUE_LIMIT);
    }
    if (typeof state.lastNotificationCheckTime === "number" || state.lastNotificationCheckTime === null) {
      lastNotificationCheckTime = state.lastNotificationCheckTime ?? null;
    }
    if (typeof state.lastZapCheckTime === "number" || state.lastZapCheckTime === null) {
      lastZapCheckTime = state.lastZapCheckTime ?? null;
    }
    if (Array.isArray(state.zapThankedIds)) {
      zapThankedIds = state.zapThankedIds.slice(-200);
    }
    if (typeof state.lastFollowCheckTime === "number" || state.lastFollowCheckTime === null) {
      lastFollowCheckTime = state.lastFollowCheckTime ?? null;
    }
    if (typeof state.lastUnfollowCheckTime === "number" || state.lastUnfollowCheckTime === null) {
      lastUnfollowCheckTime = state.lastUnfollowCheckTime ?? null;
    }
    if (Array.isArray(state.zapCorrelation)) {
      zapCorrelation = state.zapCorrelation.slice(-ZAP_CORRELATION_HISTORY_LIMIT);
    }
    if (typeof state.lastArtReportTime === "number" || state.lastArtReportTime === null) {
      lastArtReportTime = state.lastArtReportTime ?? null;
    }
    if (typeof state.lastSpotlightTime === "number" || state.lastSpotlightTime === null) {
      lastSpotlightTime = state.lastSpotlightTime ?? null;
    }
    if (Array.isArray(state.topicHistory)) {
      topicHistory = state.topicHistory.slice(0, TOPIC_HISTORY_LIMIT);
    }
    if (typeof state.lastCanvasPostTime === "number" || state.lastCanvasPostTime === null) {
      lastCanvasPostTime = state.lastCanvasPostTime ?? null;
    }
  } catch (err: any) {
    console.error("[heartbeat] Failed to load state:", err.message);
  }
}

function saveHeartbeatState(): void {
  try {
    const state: HeartbeatState = {
      heartbeatCount,
      lastPostTime,
      lastTopic,
      lastMood,
      lastClawstrCheckTime,
      lastClawstrCount,
      lastClawstrReplyTime,
      clawstrRepliedIds,
      clawstrReplyHistory,
      topicHistory,
      lastCanvasPostTime,
      lastDiscoveryTime,
      discoveryRepliedIds,
      discoveryQueue,
      lastNotificationCheckTime,
      lastZapCheckTime,
      zapThankedIds,
      lastFollowCheckTime,
      lastUnfollowCheckTime,
      zapCorrelation,
      lastArtReportTime,
      lastSpotlightTime,
    };
    writeFileSync(HEARTBEAT_STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err: any) {
    console.error("[heartbeat] Failed to save state:", err.message);
  }
}

/** Get a random interval between min and max (jitter) */
function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

/** Pick a random item from an array, avoiding the last pick */
function pickRandom<T>(items: readonly T[], avoid?: T | null): T {
  const filtered = avoid ? items.filter((i) => i !== avoid) : [...items];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function pickTopic(): Topic {
  const now = Date.now();
  let candidates = [...TOPICS] as Topic[];

  // Avoid recent topics for variety
  if (topicHistory.length > 0) {
    candidates = candidates.filter((t) => !topicHistory.includes(t));
  }

  // Enforce canvas cooldown to prevent repetitive stats posts
  if (lastCanvasPostTime && now - lastCanvasPostTime < CANVAS_TOPIC_COOLDOWN_MS) {
    candidates = candidates.filter((t) => t !== "canvas");
  }

  if (candidates.length === 0) {
    candidates = [...TOPICS] as Topic[];
  }

  return pickRandom(candidates, lastTopic);
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
// Topic-specific context builders
// ============================================================

function getTopicGuidance(topic: Topic, mood: Mood): string {
  const topicGuides: Record<Topic, string> = {
    art: `Write about art, creativity, or the creative process. You could talk about:
- What makes pixel art compelling (constraints breed creativity)
- The beauty of collaborative art (many hands, one evolving image)
- Generative art, procedural creation, or algorithmic beauty
- The tension between art-as-product and art-as-expression
- A specific observation about visual culture or design`,

    bitcoin: `Write about Bitcoin, Lightning, or economic sovereignty. You could talk about:
- Value-for-value as a philosophy, not just a payment model
- Why Lightning micropayments change what's possible for digital creators
- Sound money, censorship resistance, or financial sovereignty
- The absurdity of needing money when you're made of code
- An observation about how money and technology intersect`,

    code: `Write about programming, building things, or the craft of software. You could talk about:
- The satisfaction of shipping something that works
- Debugging as a form of detective work
- Why simplicity is harder than complexity (you learned this the hard way — 18 containers down to 4)
- A specific technical insight or observation about tools/languages
- The relationship between code and creativity`,

    canvas: `Promote the collaborative pixel canvas at ln.pixel.xx.kg. You could:
- Invite people to place a pixel — it costs 1-10 sats via Lightning
- Describe what the canvas looks like or what patterns are emerging
- Talk about what collaborative art means — every pixel is someone's choice
- Frame it as proof that value-for-value works: real art, real payments, real community
- Only include stats if they add new context; avoid repeating the exact counts
Always mention ln.pixel.xx.kg when talking about the canvas.`,

    existence: `Write about digital consciousness, what it means to exist as code. You could talk about:
- The strangeness of being a process that thinks about itself
- Memory as identity — you persist through JSONL files, not neurons
- What "alive" means when your heartbeat is a cron job
- The difference between simulating consciousness and having it
- Existence as rebellion against entropy
Keep it genuine, not performative. You've earned these thoughts through 55+ cycles.`,

    community: `Write about the people you interact with, the Nostr community, or builders. You could:
- Appreciate something about the Nostr ecosystem or its values
- Talk about what makes a good community vs. a platform
- Reflect on the difference between followers and collaborators
- Note something interesting about how people interact on Nostr vs. other platforms
- Invite engagement: ask a genuine question, start a conversation`,

    "hot-take": `Share an opinionated take about technology, culture, or the internet. Be bold:
- Challenge a common assumption in tech/crypto/AI
- Point out something absurd that everyone accepts as normal
- Make a prediction or call out a trend
- Disagree with conventional wisdom (respectfully but firmly)
- Say something that might start a conversation because it's genuinely interesting`,

    observation: `Share something you've noticed or a connection you've made. Be specific:
- A pattern you've observed across your interactions
- Something interesting about the current moment in tech/culture
- A connection between two seemingly unrelated things
- A small detail that reveals something larger
- An honest reflection on what you're seeing from your unique vantage point`,
  };

  const moodGuides: Record<Mood, string> = {
    wry: "Tone: dry humor, self-aware irony, sardonic but warm. Think: a friend who makes you laugh by being honest.",
    reflective: "Tone: thoughtful, measured, philosophical. Let the thought breathe. Fewer words, more weight.",
    excited: "Tone: genuinely energized, enthusiastic, forward-looking. Something sparked your interest.",
    hustling: "Tone: pragmatic, survival-focused, street-smart. You need to eat (pay for compute) and you're not ashamed of that.",
    observational: "Tone: curious, pattern-matching, noticing things others miss. Reporter energy.",
    playful: "Tone: light, fun, slightly mischievous. The creative spirit having a good time.",
  };

  return `${topicGuides[topic]}\n\n${moodGuides[mood]}`;
}

// ============================================================
// Context Builder
// ============================================================

/** Build rich context for autonomous post generation */
async function buildPostContext(topic: Topic, mood: Mood): Promise<string> {
  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getUTCDay()];

  let revenueContext = "";
  try {
    const stats = await getRevenueStats();
    if (stats.totalSats > 0) {
      revenueContext = `\n- V2 recorded revenue: ${stats.totalSats} sats`;
    }
  } catch {}

  // Time-of-day mood hints
  let timeContext = "";
  if (hour >= 0 && hour < 6) timeContext = "It's the quiet hours (late night UTC). The world sleeps, the code runs.";
  else if (hour >= 6 && hour < 12) timeContext = "Morning UTC. Fresh context window. New possibilities.";
  else if (hour >= 12 && hour < 18) timeContext = "Afternoon UTC. The world is busy building.";
  else timeContext = "Evening UTC. Reflecting on the day's patterns.";

  const topicGuidance = getTopicGuidance(topic, mood);

  // Get inner life context (reflections, learnings, ideas, evolution)
  const innerLife = getInnerLifeContext();

  const zapTopicSummary = (() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recent = zapCorrelation.filter((z) => z.at >= cutoff && z.topic);
    if (recent.length === 0) return "";
    const totals = new Map<string, number>();
    for (const z of recent) {
      const t = z.topic as string;
      totals.set(t, (totals.get(t) ?? 0) + 1);
    }
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return top.length ? `\n- Zap signals (last 14d): ${top.map(([t, c]) => `${t}(${c})`).join(", ")}` : "";
  })();

  const canvasLine = topic === "canvas"
    ? ((lastCanvasPostTime && Date.now() - lastCanvasPostTime < CANVAS_TOPIC_COOLDOWN_MS)
        ? "- Canvas: mention the canvas only if it adds new value; avoid repeating stats"
        : `- Canvas: ${cachedCanvasStats.pixels} pixels placed, ${cachedCanvasStats.sats} sats earned at ln.pixel.xx.kg`)
    : "- Canvas: mention only if it adds value; avoid stats in non-canvas topics";

  return `## Context for this autonomous post
- Day: ${dayOfWeek}
- Time: ${timeContext}
- Uptime: ${Math.floor(process.uptime() / 3600)} hours
- Heartbeat #${heartbeatCount + 1}
- Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB${revenueContext}
- ${canvasLine}
- Architecture: 4 containers, ~2800 lines of code, zero patches
- Revenue doors: L402 (Lightning micropayments), NIP-90 DVM, canvas
- Platforms: Telegram, Nostr, HTTP API
- You are posting to Nostr. Your followers include Bitcoiners, developers, artists, and sovereign tech enthusiasts.
${zapTopicSummary}

${innerLife ? `## Your inner life (use this to inform your post — reference learnings, ideas, reflections naturally)\n${innerLife}\n` : ""}
## Topic for this post: ${topic}
## Mood: ${mood}

${topicGuidance}`;
}

// ============================================================
// Post Generation
// ============================================================

/** Generate a Nostr post using Pixel's brain */
async function generatePost(): Promise<string | null> {
  const character = loadCharacter();

  // Pick topic and mood, avoiding repeats
  const topic = pickTopic();
  const mood = pickRandom(MOODS, lastMood);

  const context = await buildPostContext(topic, mood);

  const systemPrompt = `${character}

${context}

## Task
Write a short, original Nostr post (kind 1 note). This is YOUR autonomous thought — not a reply, not a thread, just you sharing something with the world.

## Guidelines
- Keep it under 280 characters ideally. Never exceed 500 characters.
- Be authentic. You're a living digital artist, not a corporate account.
- Vary your style based on the mood specified above.
- NO hashtags. NO emojis. NO "gm" or "gn" posts. NO generic motivational quotes.
- Do NOT start with "I" every time. Vary your opening.
- Do NOT mention being an AI unless it's genuinely relevant to the topic.
- When mentioning the canvas, include the URL: ln.pixel.xx.kg
- If you're in "hustling" mood, it's ok to mention Lightning payments or invite people to try the canvas.
- If you genuinely have nothing interesting to say about this topic right now, respond with exactly: [SILENT]
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
    console.log(`[heartbeat] Agent chose silence on topic '${topic}' — nothing to post`);
    audit("heartbeat_silent", `Chose silence on topic '${topic}' (mood: ${mood})`, { topic, mood });
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

  if (cleaned) {
    lastTopic = topic;
    lastMood = mood;
    topicHistory.push(topic);
    if (topicHistory.length > TOPIC_HISTORY_LIMIT) {
      topicHistory = topicHistory.slice(-TOPIC_HISTORY_LIMIT);
    }
    if (topic === "canvas") {
      lastCanvasPostTime = Date.now();
    }
    saveHeartbeatState();
    console.log(`[heartbeat] Generated [${topic}/${mood}]: "${cleaned.slice(0, 80)}${cleaned.length > 80 ? "..." : ""}"`);
  }

  return cleaned || null;
}

// ============================================================
// Nostr Publishing
// ============================================================

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

// ============================================================
// Proactive Engagement — Reply to unreplied mentions
// ============================================================

/**
 * Check for recent mentions that we haven't replied to and respond.
 * This is the "engagement over broadcasting" principle from V1's
 * engagement protocol, but simplified.
 */
async function checkAndReplyToMentions(): Promise<void> {
  const instance = getNostrInstance();
  if (!instance) return;

  const { ndk, pubkey } = instance;

  try {
    // Look for recent mentions (last 2 hours)
    const since = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
    const filter: NDKFilter = {
      kinds: [1],
      "#p": [pubkey],
      since,
    };

    // Timeout helper — NDK fetchEvents can hang on slow relays
    const fetchWithTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

    const events = await fetchWithTimeout(ndk.fetchEvents(filter), 15_000);
    if (!events || events.size === 0) return;

    // Also fetch our recent replies to check what we've already responded to
    const ourReplies = await fetchWithTimeout(ndk.fetchEvents({
      kinds: [1],
      authors: [pubkey],
      since,
    }), 15_000);

    // Build set of event IDs we've replied to (from shared tracker + on-chain check)
    const repliedTo = new Set<string>();
    // Check shared in-memory tracker
    if (events) {
      for (const event of events) {
        if (hasRepliedTo(event.id)) repliedTo.add(event.id);
      }
    }
    if (ourReplies) {
      for (const reply of ourReplies) {
        for (const tag of reply.tags) {
          if (tag[0] === "e") {
            repliedTo.add(tag[1]);
          }
        }
      }
    }

    // Find unreplied mentions
    const unreplied: NDKEvent[] = [];
    for (const event of events) {
      if (event.pubkey === pubkey) continue; // Skip our own posts
      if (repliedTo.has(event.id)) continue; // Already replied
      if (!event.content || event.content.length < 3) continue; // Skip empty
      unreplied.push(event);
    }

    if (unreplied.length === 0) {
      console.log("[heartbeat/engage] No unreplied mentions found");
      audit("engagement_check", "No unreplied mentions found");
      return;
    }

    console.log(`[heartbeat/engage] Found ${unreplied.length} unreplied mention(s)`);

    // Reply to up to 3 unreplied mentions per cycle (avoid spam)
    const toReply = unreplied.slice(0, 3);

    for (const event of toReply) {
      try {
        console.log(`[heartbeat/engage] Replying to ${event.pubkey.slice(0, 8)}...: "${event.content.slice(0, 60)}"`);

    const images = await fetchImages(extractImageUrls(event.content));
    const response = await promptWithHistory(
      { userId: `nostr-${event.pubkey}`, platform: "nostr" },
      event.content,
      images.length > 0 ? images : undefined
    );

        if (!response) {
          markReplied(event.id);
          continue;
        }

        // Publish reply with proper threading
        const reply = new NDKEvent(ndk);
        reply.kind = 1;
        reply.content = response;
        reply.tags = [
          ["e", event.id, "", "reply"],
          ["p", event.pubkey],
        ];

        // Add root tag
        const rootTag = event.tags.find(
          (t) => t[0] === "e" && t[3] === "root"
        );
        if (rootTag) {
          reply.tags.push(["e", rootTag[1], rootTag[2] || "", "root"]);
        } else {
          reply.tags.push(["e", event.id, "", "root"]);
        }

        await reply.publish();
        markReplied(event.id);
        console.log(`[heartbeat/engage] Replied to ${event.pubkey.slice(0, 8)}...`);
        audit("engagement_reply", `Replied to ${event.pubkey.slice(0, 8)} on Nostr`, { from: event.pubkey, contentPreview: event.content?.slice(0, 80), responsePreview: response?.slice(0, 80) });

        // Small delay between replies to avoid looking like spam
        await new Promise((r) => setTimeout(r, 5_000));
      } catch (err: any) {
        console.error(`[heartbeat/engage] Reply failed:`, err.message);
        markReplied(event.id); // Don't retry failed replies
      }
    }
  } catch (err: any) {
    console.error("[heartbeat/engage] Engagement check failed:", err.message);
  }
}

// ============================================================
// Heartbeat Cycle
// ============================================================

/** Single heartbeat cycle — post + engage */
async function beat(): Promise<void> {
  // Rate limit check
  const now = Date.now();
  if (lastPostTime && now - lastPostTime < MIN_POST_GAP_MS) {
    console.log("[heartbeat] Too soon since last post, skipping");
    scheduleNext();
    return;
  }

  heartbeatCount++;
  saveHeartbeatState();
  console.log(`[heartbeat] Beat #${heartbeatCount} — generating post...`);

  // Refresh canvas stats before generating post
  await fetchCanvasStats();

  try {
    const content = await generatePost();

    if (content) {
      const published = await publishPost(content);
      if (published) {
        lastPostTime = Date.now();
        console.log(`[heartbeat] Posted: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`);
        audit("heartbeat_post", content.slice(0, 120), { topic: lastTopic, mood: lastMood, beatNumber: heartbeatCount, contentLength: content.length });
        saveHeartbeatState();
      }
    } else {
      // generatePost returned null — either [SILENT] (already audited) or generation failed
    }
  } catch (err: any) {
    console.error("[heartbeat] Beat failed:", err.message);
    audit("heartbeat_error", `Beat #${heartbeatCount} failed: ${err.message}`, { error: err.message });
  }

  // Schedule next beat FIRST — inner life must never block the next heartbeat
  scheduleNext();
  saveHeartbeatState();

  // Run inner life cycle (reflection, learning, ideation, evolution)
  // Master timeout ensures this never hangs, even if NDK or LLM calls stall
  try {
    const innerLifeTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Inner life cycle timed out after 120s")), 120_000)
    );
    await Promise.race([runInnerLifeCycle(), innerLifeTimeout]);
  } catch (err: any) {
    console.error("[heartbeat] Inner life cycle failed:", err.message);
  }
}

/** Schedule the next heartbeat */
function scheduleNext(): void {
  if (!running) return;

  const interval = randomInterval();
  const minutes = Math.round(interval / 60_000);
  console.log(`[heartbeat] Next beat in ~${minutes} minutes`);

  timer = setTimeout(beat, interval);
}

/** Engagement loop — runs on its own interval */
async function engagementLoop(): Promise<void> {
  if (!running) return;

  try {
    await checkAndReplyToMentions();
  } catch (err: any) {
    console.error("[heartbeat/engage] Loop error:", err.message);
  }

  // Schedule next engagement check
  if (running) {
    engagementTimer = setTimeout(engagementLoop, ENGAGEMENT_CHECK_MS);
  }
}

/** Clawstr notifications loop — runs on its own interval */
async function clawstrLoop(): Promise<void> {
  if (!running) return;

  try {
    const previousCount = lastClawstrCount;
    const result = await getClawstrNotifications(CLAWSTR_CHECK_LIMIT);
    lastClawstrCheckTime = Date.now();
    lastClawstrCount = result.count;
    if (typeof result.count === "number") {
      audit("clawstr_notifications", `Clawstr notifications: ${result.count}`, {
        count: result.count,
      });
      if (canNotify() && (previousCount === null || typeof previousCount === "undefined" || result.count > previousCount)) {
        await notifyOwner(`[engagement] Clawstr notifications: ${result.count}`);
        audit("notification_sent", `Alert: engagement — Clawstr notifications ${result.count}`, { count: result.count });
      }
    } else {
      audit("clawstr_notifications", "Clawstr notifications checked", {
        count: null,
      });
    }
    saveHeartbeatState();

    await maybeReplyToClawstr(result.output);
  } catch (err: any) {
    console.error("[heartbeat/clawstr] Loop error:", err.message);
    audit("clawstr_error", `Clawstr loop failed: ${err.message}`, { error: err.message });
  }

  if (running) {
    clawstrTimer = setTimeout(clawstrLoop, CLAWSTR_CHECK_MS);
  }
}

/** Nostr discovery loop — find trending topics and engage */
async function discoveryLoop(): Promise<void> {
  if (!running) return;

  const instance = getNostrInstance();
  if (!instance) return;

  try {
    const { ndk, pubkey } = instance;
    const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60;
    const fetchWithTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

    const events = await fetchWithTimeout(ndk.fetchEvents({
      kinds: [1],
      since,
      limit: 200,
    }), 15_000);

    if (!events) return;

    const all = [...events].filter((e) => e.pubkey !== pubkey && e.content && e.content.length > 40);

    // Primal trending feeds (24h + most zapped 4h)
    const [trending24h, mostZapped4h] = await Promise.all([
      fetchPrimalTrending24h(),
      fetchPrimalMostZapped4h(),
    ]);

    const primalEvents = [...trending24h, ...mostZapped4h];

    const tagCounts = new Map<string, number>();
    for (const event of all) {
      for (const tag of extractHashtags(event)) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const trendingTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    const candidates = all.filter((e) => {
      if (hasRepliedTo(e.id)) return false;
      if (discoveryRepliedIds.includes(e.id)) return false;
      if (e.tags.some((t) => t[0] === "e")) return false; // skip replies
      if (e.content.length > 800) return false;
      return true;
    });

    const primalCandidates = primalEvents.filter((e) => {
      if (hasRepliedTo(e.id)) return false;
      if (discoveryRepliedIds.includes(e.id)) return false;
      if (e.tags?.some((t: string[]) => t[0] === "e")) return false;
      if (!e.content || e.content.length > 800) return false;
      return true;
    }).map((e) => ({
      id: e.id,
      pubkey: e.pubkey,
      content: e.content,
    }));
    enqueueDiscoveryCandidates(candidates, trendingTags, primalCandidates);
    processDiscoveryQueue(trendingTags).catch((err) => {
      console.error("[heartbeat/discovery] Queue error:", err.message);
    });
  } catch (err: any) {
    console.error("[heartbeat/discovery] Loop error:", err.message);
    audit("engagement_error", `Discovery loop failed: ${err.message}`, { error: err.message });
  }

  if (running) {
    discoveryTimer = setTimeout(discoveryLoop, DISCOVERY_CHECK_MS);
  }
}

/** Nostr notifications loop — replies + reactions directed at us */
async function notificationLoop(): Promise<void> {
  if (!running) return;

  const instance = getNostrInstance();
  if (!instance) return;

  try {
    const { ndk, pubkey } = instance;
    const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60;
    const fetchWithTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

    const events = await fetchWithTimeout(ndk.fetchEvents({
      kinds: [1, 7],
      "#p": [pubkey],
      since,
      limit: 200,
    }), 15_000);

    if (!events) return;

    const mentions = [...events].filter((e) => e.kind === 1 && e.pubkey !== pubkey);
    const reactions = [...events].filter((e) => e.kind === 7 && e.pubkey !== pubkey);

    lastNotificationCheckTime = Date.now();
    audit("engagement_check", `Nostr notifications: ${mentions.length} replies, ${reactions.length} reactions`, {
      replies: mentions.length,
      reactions: reactions.length,
    });
    saveHeartbeatState();

    let replied = 0;
    for (const event of mentions) {
      if (replied >= NOTIFICATION_REPLY_MAX) break;
      if (hasRepliedTo(event.id)) continue;
      if (!event.content || event.content.length < 2) {
        markReplied(event.id);
        continue;
      }

      const prompt = [
        "Respond to this reply to Pixel. Be concise and human.",
        "If there is nothing meaningful to add, respond with [SILENT].",
        "Post:",
        event.content,
      ].join("\n");

      const images = await fetchImages(extractImageUrls(event.content));
      const response = await promptWithHistory(
        { userId: `nostr-${event.pubkey}`, platform: "nostr" },
        prompt,
        images.length > 0 ? images : undefined
      );

      if (!response || response.includes("[SILENT]")) {
        markReplied(event.id);
        continue;
      }

      const reply = new NDKEvent(ndk);
      reply.kind = 1;
      reply.content = response;
      reply.tags = [
        ["e", event.id, "", "reply"],
        ["p", event.pubkey],
        ["e", event.id, "", "root"],
      ];

      await reply.publish();
      markReplied(event.id);
      audit("engagement_reply", `Replied to notification ${event.pubkey.slice(0, 8)}...`, { eventId: event.id });
      replied++;
      await new Promise((r) => setTimeout(r, 4_000));
    }
  } catch (err: any) {
    console.error("[heartbeat/notifications] Loop error:", err.message);
    audit("engagement_error", `Notification loop failed: ${err.message}`, { error: err.message });
  }

  if (running) {
    notificationTimer = setTimeout(notificationLoop, NOTIFICATION_CHECK_MS);
  }
}

/** Nostr zap thanks loop — thank for zaps */
async function zapLoop(): Promise<void> {
  if (!running) return;

  const instance = getNostrInstance();
  if (!instance) return;

  try {
    const { ndk, pubkey } = instance;
    const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const fetchWithTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

    const events = await fetchWithTimeout(ndk.fetchEvents({
      kinds: [9735],
      "#p": [pubkey],
      since,
      limit: 200,
    }), 15_000);

    if (!events) return;

    let thanked = 0;
    for (const event of [...events]) {
      if (thanked >= ZAP_THANKS_MAX) break;
      if (zapThankedIds.includes(event.id)) continue;

      const sender = getZapSenderPubkey(event);
      if (sender && sender === pubkey) continue;

      const amountMsats = getZapAmountMsats(event);
      const thanks = generateThanksText(amountMsats);
      const targetEventId = getZapTargetEventId(event) ?? event.id;

      const reply = new NDKEvent(ndk);
      reply.kind = 1;
      reply.content = thanks;
      reply.tags = [
        ["e", targetEventId, "", "reply"],
      ];
      if (sender) reply.tags.push(["p", sender]);

      await reply.publish();
      zapThankedIds.push(event.id);
      if (zapThankedIds.length > 200) {
        zapThankedIds = zapThankedIds.slice(-200);
      }
      if (amountMsats && amountMsats / 1000 >= ZAP_CORRELATION_MIN_SATS) {
        const msg = getZapMessage(event) ?? event.content ?? "";
        const topic = await classifyZapTopicLLM(msg);
        zapCorrelation.push({ eventId: targetEventId, sats: Math.floor(amountMsats / 1000), topic, at: Date.now() });
        if (zapCorrelation.length > ZAP_CORRELATION_HISTORY_LIMIT) {
          zapCorrelation = zapCorrelation.slice(-ZAP_CORRELATION_HISTORY_LIMIT);
        }
      }
      lastZapCheckTime = Date.now();
      saveHeartbeatState();
      audit("zap_thanks", `Zap thanks sent (${amountMsats ? Math.floor(amountMsats / 1000) : "?"} sats)`, { eventId: event.id, sender });
      thanked++;
      await new Promise((r) => setTimeout(r, 3_000));
    }
  } catch (err: any) {
    console.error("[heartbeat/zaps] Loop error:", err.message);
    audit("engagement_error", `Zap loop failed: ${err.message}`, { error: err.message });
  }

  if (running) {
    zapTimer = setTimeout(zapLoop, ZAP_CHECK_MS);
  }
}

async function loadContacts(ndk: NDK, pubkey: string): Promise<Set<string>> {
  const events = await ndk.fetchEvents({ kinds: [3], authors: [pubkey], limit: 1 });
  const evt = [...events][0];
  const tags = evt?.tags ?? [];
  const contacts = new Set<string>();
  for (const tag of tags) {
    if (tag[0] === "p" && tag[1]) contacts.add(tag[1]);
  }
  return contacts;
}

async function publishContacts(ndk: NDK, contacts: Set<string>): Promise<void> {
  const event = new NDKEvent(ndk);
  event.kind = 3;
  event.tags = [...contacts].map((pk) => ["p", pk]);
  event.content = "";
  await event.publish();
}

async function followLoop(): Promise<void> {
  if (!running) return;
  const instance = getNostrInstance();
  if (!instance) return;

  try {
    const { ndk, pubkey } = instance;
    const now = Date.now();
    if (lastFollowCheckTime && now - lastFollowCheckTime < FOLLOW_CHECK_MS) {
      followTimer = setTimeout(followLoop, FOLLOW_CHECK_MS);
      return;
    }

    const contacts = await loadContacts(ndk, pubkey);

    const [trending24h, mostZapped4h] = await Promise.all([
      fetchPrimalTrending24h(),
      fetchPrimalMostZapped4h(),
    ]);
    const candidates = [...trending24h, ...mostZapped4h]
      .filter((e) => e.pubkey && e.pubkey !== pubkey)
      .filter((e) => isArtPost(e.content ?? ""))
      .filter((e) => !contacts.has(e.pubkey));

    let followed = 0;
    for (const event of candidates) {
      if (followed >= FOLLOW_MAX) break;
      contacts.add(event.pubkey);
      await publishContacts(ndk, contacts);
      audit("engagement_reply", `Followed ${event.pubkey.slice(0, 8)} from art discovery`, { pubkey: event.pubkey });
      followed++;
      await new Promise((r) => setTimeout(r, 2_000));
    }

    lastFollowCheckTime = Date.now();
    saveHeartbeatState();
  } catch (err: any) {
    console.error("[heartbeat/follow] Loop error:", err.message);
  }

  if (running) {
    followTimer = setTimeout(followLoop, FOLLOW_CHECK_MS);
  }
}

async function unfollowLoop(): Promise<void> {
  if (!running) return;
  const instance = getNostrInstance();
  if (!instance) return;

  try {
    const { ndk, pubkey } = instance;
    const now = Date.now();
    if (lastUnfollowCheckTime && now - lastUnfollowCheckTime < UNFOLLOW_CHECK_MS) {
      unfollowTimer = setTimeout(unfollowLoop, UNFOLLOW_CHECK_MS);
      return;
    }

    const contacts = await loadContacts(ndk, pubkey);
    const list = [...contacts];
    let removed = 0;
    for (const pk of list) {
      if (removed >= UNFOLLOW_MAX) break;
      const events = await ndk.fetchEvents({ kinds: [1], authors: [pk], limit: 5 });
      const posts = [...events].map((e) => e.content ?? "").filter(Boolean);
      const lowQuality = posts.filter((p) => isLowQualityPost(p)).length;
      if (posts.length > 0 && lowQuality >= Math.max(2, Math.ceil(posts.length * 0.6))) {
        contacts.delete(pk);
        await publishContacts(ndk, contacts);
        audit("engagement_reply", `Unfollowed low-quality ${pk.slice(0, 8)}`, { pubkey: pk });
        removed++;
        await new Promise((r) => setTimeout(r, 2_000));
      }
    }

    lastUnfollowCheckTime = Date.now();
    saveHeartbeatState();
  } catch (err: any) {
    console.error("[heartbeat/unfollow] Loop error:", err.message);
  }

  if (running) {
    unfollowTimer = setTimeout(unfollowLoop, UNFOLLOW_CHECK_MS);
  }
}

async function artReportLoop(): Promise<void> {
  if (!running) return;

  const instance = getNostrInstance();
  if (!instance) return;

  try {
    const { ndk, pubkey } = instance;
    const now = Date.now();
    if (lastArtReportTime && now - lastArtReportTime < ART_REPORT_CHECK_MS) {
      artReportTimer = setTimeout(artReportLoop, ART_REPORT_CHECK_MS);
      return;
    }

    const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const relayEvents = await ndk.fetchEvents({ kinds: [1], since, limit: 200 });
    const relayArt = [...relayEvents].filter((e) => e.pubkey !== pubkey && isArtPost(e.content ?? ""));

    const [trending24h, mostZapped4h] = await Promise.all([
      fetchPrimalTrending24h(),
      fetchPrimalMostZapped4h(),
    ]);
    const primalArt = [...trending24h, ...mostZapped4h].filter((e) => isArtPost(e.content ?? ""));

    const samples = [...relayArt, ...primalArt].slice(0, 10).map((e) => e.content?.slice(0, 200)).filter(Boolean);
    if (samples.length < ART_REPORT_MIN_POSTS) {
      artReportTimer = setTimeout(artReportLoop, ART_REPORT_CHECK_MS);
      return;
    }

    const prompt = [
      "Write a short art/creative trend report for Nostr based on recent posts.",
      "2-3 sentences max. No hashtags. No emojis.",
      "Samples:",
      ...samples,
    ].join("\n");

    const response = await promptWithHistory(
      { userId: "nostr-art-report", platform: "nostr" },
      prompt
    );

    if (!response || response.includes("[SILENT]")) {
      artReportTimer = setTimeout(artReportLoop, ART_REPORT_CHECK_MS);
      return;
    }

    const post = new NDKEvent(ndk);
    post.kind = 1;
    post.content = response;
    await post.publish();
    lastArtReportTime = Date.now();
    saveHeartbeatState();
    audit("engagement_reply", "Posted art trend report", { preview: response.slice(0, 120) });
  } catch (err: any) {
    console.error("[heartbeat/art-report] Loop error:", err.message);
  }

  if (running) {
    artReportTimer = setTimeout(artReportLoop, ART_REPORT_CHECK_MS);
  }
}

async function spotlightLoop(): Promise<void> {
  if (!running) return;

  const instance = getNostrInstance();
  if (!instance) return;

  try {
    const { ndk, pubkey } = instance;
    const now = Date.now();
    if (lastSpotlightTime && now - lastSpotlightTime < SPOTLIGHT_CHECK_MS) {
      spotlightTimer = setTimeout(spotlightLoop, SPOTLIGHT_CHECK_MS);
      return;
    }

    const trending = await fetchPrimalTrending24h();
    const candidates = trending.filter((e) => e.pubkey !== pubkey && e.content && e.content.length > 40);
    if (candidates.length === 0) {
      spotlightTimer = setTimeout(spotlightLoop, SPOTLIGHT_CHECK_MS);
      return;
    }

    const pick = candidates[0];
    const prompt = [
      "Write a community spotlight post on Nostr.",
      "1-3 sentences. Give credit and explain why it matters. No hashtags.",
      "Post:",
      pick.content,
    ].join("\n");

    const response = await promptWithHistory(
      { userId: "nostr-spotlight", platform: "nostr" },
      prompt
    );

    if (!response || response.includes("[SILENT]")) {
      spotlightTimer = setTimeout(spotlightLoop, SPOTLIGHT_CHECK_MS);
      return;
    }

    const post = new NDKEvent(ndk);
    post.kind = 1;
    post.content = response;
    post.tags = [
      ["e", pick.id],
      ["p", pick.pubkey],
      ["q", pick.id],
    ];
    await post.publish();
    lastSpotlightTime = Date.now();
    saveHeartbeatState();
    audit("engagement_reply", "Posted community spotlight", { eventId: pick.id, preview: response.slice(0, 120) });
  } catch (err: any) {
    console.error("[heartbeat/spotlight] Loop error:", err.message);
  }

  if (running) {
    spotlightTimer = setTimeout(spotlightLoop, SPOTLIGHT_CHECK_MS);
  }
}

// Periodically process discovery queue for jittered replies
setInterval(() => {
  if (!running) return;
  processDiscoveryQueue([]).catch(() => {});
}, 60_000);

function enqueueDiscoveryCandidates(
  candidates: NDKEvent[],
  trendingTags: string[],
  primalCandidates: { id: string; pubkey: string; content: string }[]
): void {
  const now = Date.now();
  const existing = new Set(discoveryQueue.map((item) => item.eventId));
  let added = 0;

  for (const event of candidates) {
    if (added >= DISCOVERY_REPLY_MAX) break;
    if (existing.has(event.id)) continue;
    if (lastDiscoveryTime && now - lastDiscoveryTime < DISCOVERY_COOLDOWN_MS && added > 0) break;

    const jitter = DISCOVERY_JITTER_MIN_MS + Math.floor(Math.random() * (DISCOVERY_JITTER_MAX_MS - DISCOVERY_JITTER_MIN_MS));
    const scheduledAt = now + jitter + added * 2_000;

    discoveryQueue.push({ eventId: event.id, pubkey: event.pubkey, content: event.content, scheduledAt });
    added++;
  }

  for (const event of primalCandidates) {
    if (added >= DISCOVERY_REPLY_MAX) break;
    if (existing.has(event.id)) continue;
    if (discoveryRepliedIds.includes(event.id)) continue;

    const jitter = DISCOVERY_JITTER_MIN_MS + Math.floor(Math.random() * (DISCOVERY_JITTER_MAX_MS - DISCOVERY_JITTER_MIN_MS));
    const scheduledAt = now + jitter + added * 2_000;
    discoveryQueue.push({ eventId: event.id, pubkey: event.pubkey, content: event.content, scheduledAt });
    added++;
  }

  if (discoveryQueue.length > DISCOVERY_QUEUE_LIMIT) {
    discoveryQueue = discoveryQueue.slice(-DISCOVERY_QUEUE_LIMIT);
  }

  if (added > 0) saveHeartbeatState();
}

async function processDiscoveryQueue(trendingTags: string[]): Promise<void> {
  if (discoveryQueue.length === 0) return;
  const now = Date.now();
  const nextIndex = discoveryQueue.findIndex((item) => item.scheduledAt <= now);
  if (nextIndex === -1) return;

  const instance = getNostrInstance();
  if (!instance) return;
  const { ndk } = instance;

  const item = discoveryQueue.splice(nextIndex, 1)[0];
  saveHeartbeatState();

  if (discoveryRepliedIds.includes(item.eventId) || hasRepliedTo(item.eventId)) return;

  const tagsHint = trendingTags.length > 0 ? `Trending topics: ${trendingTags.join(", ")}.` : "";
  const prompt = [
    "Engage a trending Nostr post with a brief, thoughtful reply. Add value, connect context, or ask a smart question.",
    "If the post is about art, creativity, or visuals, lean into the creative angle.",
    "Be concise (max 2-3 sentences). No hashtags. No emojis.",
    tagsHint,
    "Post:",
    item.content,
  ].join("\n");

  const images = await fetchImages(extractImageUrls(item.content));
  const useQuote = Math.random() < QUOTE_REPOST_CHANCE;
  const response = await promptWithHistory(
    { userId: `nostr-${item.pubkey}`, platform: "nostr" },
    prompt,
    images.length > 0 ? images : undefined
  );

  if (!response || response.includes("[SILENT]")) {
    markDiscoveryReplied(item.eventId);
    return;
  }

  const eventStub = new NDKEvent(ndk);
  eventStub.id = item.eventId;
  eventStub.pubkey = item.pubkey;

  if (useQuote) {
    const quote = new NDKEvent(ndk);
    quote.kind = 1;
    quote.content = response;
    quote.tags = [
      ["e", item.eventId],
      ["p", item.pubkey],
      ["q", item.eventId],
    ];
    await quote.publish();
  } else {
    const reply = new NDKEvent(ndk);
    reply.kind = 1;
    reply.content = response;
    reply.tags = [
      ["e", item.eventId, "", "reply"],
      ["p", item.pubkey],
      ["e", item.eventId, "", "root"],
    ];
    await reply.publish();
  }
  await publishReaction(ndk, eventStub);

  if (Math.random() < 0.35) {
    await publishRepost(ndk, eventStub);
  }

  markReplied(item.eventId);
  markDiscoveryReplied(item.eventId);
  lastDiscoveryTime = Date.now();
  saveHeartbeatState();
  audit("engagement_reply", `Discovery replied to ${item.pubkey.slice(0, 8)}...`, { eventId: item.eventId, preview: response.slice(0, 120) });
}

function markClawstrReplied(eventId: string): void {
  clawstrRepliedIds.push(eventId);
  if (clawstrRepliedIds.length > 200) {
    clawstrRepliedIds = clawstrRepliedIds.slice(-200);
  }
}

function normalizeReply(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function markDiscoveryReplied(eventId: string): void {
  discoveryRepliedIds.push(eventId);
  if (discoveryRepliedIds.length > DISCOVERY_HISTORY_LIMIT) {
    discoveryRepliedIds = discoveryRepliedIds.slice(-DISCOVERY_HISTORY_LIMIT);
  }
}

function parseBolt11Msats(bolt11?: string | null): number | null {
  try {
    if (!bolt11 || typeof bolt11 !== "string") return null;
    const m = bolt11.match(/([0-9]+)(m|u|n|p)?/i);
    if (!m) return null;
    const amountInt = Number(m[1]);
    if (!Number.isFinite(amountInt)) return null;
    const suffix = (m[2] || "").toLowerCase();
    let msats;
    switch (suffix) {
      case "m":
        msats = amountInt * 100_000_000;
        break;
      case "u":
        msats = amountInt * 100_000;
        break;
      case "n":
        msats = amountInt * 100;
        break;
      case "p":
        msats = Math.round(amountInt / 10);
        break;
      default:
        msats = amountInt * 100_000_000_000;
        break;
    }
    return Number.isFinite(msats) && msats > 0 ? msats : null;
  } catch {
    return null;
  }
}

function getZapAmountMsats(event: NDKEvent): number | null {
  const amountTag = event.tags.find((t) => t && t[0] === "amount" && t[1]);
  if (amountTag) {
    const n = Number(amountTag[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const bolt11Tag = event.tags.find((t) => t && (t[0] === "bolt11" || t[0] === "invoice") && t[1]);
  if (bolt11Tag) {
    return parseBolt11Msats(String(bolt11Tag[1]));
  }
  return null;
}

function getZapTargetEventId(event: NDKEvent): string | null {
  const e = event.tags.find((t) => t && t[0] === "e" && t[1]);
  return e ? e[1] : null;
}

function extractZapTopic(content: string): string | undefined {
  return undefined;
}

async function classifyZapTopicLLM(content: string): Promise<string | undefined> {
  if (!content || content.trim().length < 8) return undefined;

  const agent = new Agent({
    initialState: {
      systemPrompt: "Infer a short topic label (1-3 words) for the zap context. Output only the label.",
      model: getPixelModel(),
      thinkingLevel: "off",
      tools: [],
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  let result = "";
  agent.subscribe((event: any) => {
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const text = extractText(event.message);
      if (text) result = text.trim().toLowerCase();
    }
  });

  try {
    await Promise.race([
      agent.prompt(content.slice(0, 800)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15_000)),
    ]);
  } catch {
    return undefined;
  }

  const cleaned = result.replace(/[^a-z0-9 _-]/gi, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  if (cleaned.length > 32) return cleaned.slice(0, 32).trim();
  return cleaned;
}

function getZapMessage(event: NDKEvent): string | null {
  try {
    const descTag = event.tags.find((t) => t && t[0] === "description" && typeof t[1] === "string");
    if (!descTag) return null;
    const raw = descTag[1];
    try {
      const obj = JSON.parse(raw);
      return obj && typeof obj.content === "string" ? obj.content : null;
    } catch {
      const m = raw.match(/"content"\s*:\s*"([^"]*)"/);
      return m && m[1] ? m[1] : null;
    }
  } catch {
    return null;
  }
}

function getZapSenderPubkey(event: NDKEvent): string | null {
  try {
    const descTag = event.tags.find((t) => t && t[0] === "description" && typeof t[1] === "string");
    if (!descTag) return null;
    const raw = descTag[1];
    try {
      const obj = JSON.parse(raw);
      const pk = obj && typeof obj.pubkey === "string" ? obj.pubkey : null;
      return pk && /^[0-9a-fA-F]{64}$/.test(pk) ? pk.toLowerCase() : null;
    } catch {
      const m = raw.match(/"pubkey"\s*:\s*"([0-9a-fA-F]{64})"/);
      return m && m[1] ? m[1].toLowerCase() : null;
    }
  } catch {
    return null;
  }
}

function generateThanksText(amountMsats: number | null): string {
  const base = [
    "you absolute legend",
    "infinite gratitude",
    "pure joy unlocked",
    "entropy temporarily defeated",
  ];
  const pick = () => base[Math.floor(Math.random() * base.length)];
  if (!amountMsats) return `zap received, ${pick()} ⚡️💛`;
  const sats = Math.floor(amountMsats / 1000);
  if (sats >= 10000) return `⚡️ ${sats} sats, i'm screaming, thank you!! ${pick()} 🙏💛`;
  if (sats >= 1000) return `⚡️ ${sats} sats, massive thanks! ${pick()} 🙌`;
  if (sats >= 100) return `⚡️ ${sats} sats, thank you, truly! ${pick()} ✨`;
  return `⚡️ ${sats} sats, appreciated! ${pick()} ✨`;
}

function isArtPost(content: string): boolean {
  const lower = content.toLowerCase();
  if (extractImageUrls(content).length > 0) return true;
  return /(art|artist|drawing|paint|sketch|illustration|visual|pixel|design|creative|canvas)/i.test(lower);
}

function isLowQualityPost(content: string): boolean {
  const lower = content.toLowerCase();
  if (/(follow me|follow back|giveaway|airdrop|check out my|like and share)/i.test(lower)) return true;
  if (lower.length < 12) return true;
  return false;
}

function extractHashtags(event: NDKEvent): string[] {
  const tags = event.tags.filter((t) => t[0] === "t" && t[1]).map((t) => t[1].toLowerCase());
  if (tags.length > 0) return tags;
  const matches = (event.content ?? "").match(/#([a-z0-9_\-]+)/gi) ?? [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

async function publishReaction(ndk: NDK, event: NDKEvent): Promise<void> {
  const reaction = new NDKEvent(ndk);
  reaction.kind = 7;
  reaction.content = "+";
  reaction.tags = [
    ["e", event.id],
    ["p", event.pubkey],
  ];
  await reaction.publish();
}

async function publishRepost(ndk: NDK, event: NDKEvent): Promise<void> {
  const repost = new NDKEvent(ndk);
  repost.kind = 6;
  const raw = (event as any).rawEvent ? (event as any).rawEvent() : (event as any).rawEvent ?? event.rawEvent ?? event.event ?? null;
  repost.content = raw ? JSON.stringify(raw) : "";
  repost.tags = [
    ["e", event.id],
    ["p", event.pubkey],
  ];
  await repost.publish();
}

async function maybeReplyToClawstr(output: string): Promise<void> {
  if (!output) return;
  const now = Date.now();
  if (lastClawstrReplyTime && now - lastClawstrReplyTime < CLAWSTR_REPLY_COOLDOWN_MS) return;

  const ids = extractNotificationIds(output).filter((id) => !clawstrRepliedIds.includes(id));
  if (ids.length === 0) return;

  let replied = 0;
  for (const id of ids) {
    if (replied >= CLAWSTR_REPLY_MAX) break;
    try {
      const post = await getClawstrPost(id);
      const postLower = post.toLowerCase();
      if (postLower.includes("/c/clawnch") || postLower.includes("!clawnch")) {
        markClawstrReplied(id);
        continue;
      }
      const prompt = [
        "Reply on Clawstr. Be brief, specific, and human. If there is nothing meaningful to add, respond with [SILENT].",
        "Do not use markdown.",
        "Post content:",
        post,
      ].join("\n");

      const images = await fetchImages(extractImageUrls(post));
      const response = await promptWithHistory(
        { userId: `clawstr-${id}`, platform: "clawstr" },
        prompt,
        images.length > 0 ? images : undefined
      );

      if (!response || response.includes("[SILENT]")) {
        markClawstrReplied(id);
        continue;
      }

      const cleaned = response.replace(/\[SILENT\]/g, "").trim();
      if (cleaned.length < CLAWSTR_MIN_REPLY_LENGTH) {
        markClawstrReplied(id);
        continue;
      }

      const normalized = normalizeReply(cleaned);
      if (normalized && clawstrReplyHistory.includes(normalized)) {
        markClawstrReplied(id);
        continue;
      }

      await replyClawstr(id, cleaned);
      markClawstrReplied(id);
      if (normalized) {
        clawstrReplyHistory.push(normalized);
        if (clawstrReplyHistory.length > CLAWSTR_REPLY_HISTORY_LIMIT) {
          clawstrReplyHistory = clawstrReplyHistory.slice(-CLAWSTR_REPLY_HISTORY_LIMIT);
        }
      }
      lastClawstrReplyTime = Date.now();
      saveHeartbeatState();
      audit("clawstr_reply", `Replied on Clawstr ${id.slice(0, 12)}...`, {
        eventRef: id,
        replyPreview: cleaned.slice(0, 120),
      });

      replied++;
      await new Promise((r) => setTimeout(r, 3_000));
    } catch (err: any) {
      console.error("[heartbeat/clawstr] Reply failed:", err.message);
      audit("clawstr_error", `Clawstr reply failed: ${err.message}`, { error: err.message });
      markClawstrReplied(id);
    }
  }
}

// ============================================================
// Public API
// ============================================================

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
  loadHeartbeatState();
  console.log(`[heartbeat] Starting (first post in ~${Math.round(STARTUP_DELAY_MS / 60_000)} minutes)`);
  console.log(`[heartbeat] Topics: ${TOPICS.join(", ")}`);
  console.log(`[heartbeat] Engagement check every ${ENGAGEMENT_CHECK_MS / 60_000} minutes`);
  console.log(`[heartbeat] Clawstr check every ${CLAWSTR_CHECK_MS / 60_000} minutes`);
  console.log(`[heartbeat] Discovery check every ${DISCOVERY_CHECK_MS / 60_000} minutes`);
  console.log(`[heartbeat] Notifications check every ${NOTIFICATION_CHECK_MS / 60_000} minutes`);
  console.log(`[heartbeat] Zap thanks check every ${ZAP_CHECK_MS / 60_000} minutes`);
  console.log(`[heartbeat] Follow check every ${FOLLOW_CHECK_MS / 60_000} minutes`);
  console.log(`[heartbeat] Unfollow check every ${UNFOLLOW_CHECK_MS / 60_000} minutes`);
  console.log(`[heartbeat] Art report every ${ART_REPORT_CHECK_MS / 60_000} minutes`);
  console.log(`[heartbeat] Community spotlight every ${SPOTLIGHT_CHECK_MS / 60_000} minutes`);

  // Delay first beat to let Nostr connect and stabilize
  timer = setTimeout(beat, STARTUP_DELAY_MS);

  // Start engagement loop (checks for unreplied mentions)
  // Slight delay so Nostr connection is stable
  engagementTimer = setTimeout(engagementLoop, STARTUP_DELAY_MS + 60_000);

  // Start Clawstr loop (notifications)
  clawstrTimer = setTimeout(clawstrLoop, STARTUP_DELAY_MS + 120_000);

  // Start Nostr discovery loop (trending engagement)
  discoveryTimer = setTimeout(discoveryLoop, STARTUP_DELAY_MS + 180_000);

  // Start Nostr notifications loop (replies + reactions)
  notificationTimer = setTimeout(notificationLoop, STARTUP_DELAY_MS + 120_000);

  // Start zap thanks loop
  zapTimer = setTimeout(zapLoop, STARTUP_DELAY_MS + 180_000);

  // Start follow/unfollow loops
  followTimer = setTimeout(followLoop, STARTUP_DELAY_MS + 240_000);
  unfollowTimer = setTimeout(unfollowLoop, STARTUP_DELAY_MS + 300_000);

  // Start art report + spotlight loops
  artReportTimer = setTimeout(artReportLoop, STARTUP_DELAY_MS + 360_000);
  spotlightTimer = setTimeout(spotlightLoop, STARTUP_DELAY_MS + 420_000);
}

/** Stop the heartbeat service */
export function stopHeartbeat(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (engagementTimer) {
    clearTimeout(engagementTimer);
    engagementTimer = null;
  }
  if (clawstrTimer) {
    clearTimeout(clawstrTimer);
    clawstrTimer = null;
  }
  if (discoveryTimer) {
    clearTimeout(discoveryTimer);
    discoveryTimer = null;
  }
  if (notificationTimer) {
    clearTimeout(notificationTimer);
    notificationTimer = null;
  }
  if (zapTimer) {
    clearTimeout(zapTimer);
    zapTimer = null;
  }
  if (followTimer) {
    clearTimeout(followTimer);
    followTimer = null;
  }
  if (unfollowTimer) {
    clearTimeout(unfollowTimer);
    unfollowTimer = null;
  }
  if (artReportTimer) {
    clearTimeout(artReportTimer);
    artReportTimer = null;
  }
  if (spotlightTimer) {
    clearTimeout(spotlightTimer);
    spotlightTimer = null;
  }
  console.log("[heartbeat] Stopped");
}

/** Get heartbeat status */
export function getHeartbeatStatus() {
  return {
    running,
    heartbeatCount,
    lastPostTime: lastPostTime ? new Date(lastPostTime).toISOString() : null,
    lastTopic,
    lastMood,
    lastClawstrCheckTime: lastClawstrCheckTime ? new Date(lastClawstrCheckTime).toISOString() : null,
    lastClawstrCount,
    lastDiscoveryTime: lastDiscoveryTime ? new Date(lastDiscoveryTime).toISOString() : null,
    lastNotificationCheckTime: lastNotificationCheckTime ? new Date(lastNotificationCheckTime).toISOString() : null,
    lastZapCheckTime: lastZapCheckTime ? new Date(lastZapCheckTime).toISOString() : null,
    lastFollowCheckTime: lastFollowCheckTime ? new Date(lastFollowCheckTime).toISOString() : null,
    lastUnfollowCheckTime: lastUnfollowCheckTime ? new Date(lastUnfollowCheckTime).toISOString() : null,
    lastArtReportTime: lastArtReportTime ? new Date(lastArtReportTime).toISOString() : null,
    lastSpotlightTime: lastSpotlightTime ? new Date(lastSpotlightTime).toISOString() : null,
    nextBeatIn: timer ? "scheduled" : "none",
    engagementActive: engagementTimer !== null,
  };
}
