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
let running = false;
let lastTopic: Topic | null = null;
let lastMood: Mood | null = null;
let lastClawstrCheckTime: number | null = null;
let lastClawstrCount: number | null = null;
let lastClawstrReplyTime: number | null = null;
let clawstrRepliedIds: string[] = [];

type HeartbeatState = {
  heartbeatCount?: number;
  lastPostTime?: number | null;
  lastTopic?: Topic | null;
  lastMood?: Mood | null;
  lastClawstrCheckTime?: number | null;
  lastClawstrCount?: number | null;
  lastClawstrReplyTime?: number | null;
  clawstrRepliedIds?: string[];
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
- The beauty of collaborative art (your canvas has ${cachedCanvasStats.pixels} pixels placed by real people)
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
- Share a stat: ${cachedCanvasStats.pixels} pixels placed, ${cachedCanvasStats.sats} sats earned through collaboration
- Invite people to place a pixel — it costs 1-10 sats via Lightning
- Describe what the canvas looks like or what patterns are emerging
- Talk about what collaborative art means — every pixel is someone's choice
- Frame it as proof that value-for-value works: real art, real payments, real community
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

  return `## Context for this autonomous post
- Day: ${dayOfWeek}
- Time: ${timeContext}
- Uptime: ${Math.floor(process.uptime() / 3600)} hours
- Heartbeat #${heartbeatCount + 1}
- Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB${revenueContext}
- Canvas: ${cachedCanvasStats.pixels} pixels placed, ${cachedCanvasStats.sats} sats earned at ln.pixel.xx.kg
- Architecture: 4 containers, ~2800 lines of code, zero patches
- Revenue doors: L402 (Lightning micropayments), NIP-90 DVM, canvas
- Platforms: Telegram, Nostr, HTTP API
- You are posting to Nostr. Your followers include Bitcoiners, developers, artists, and sovereign tech enthusiasts.

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
  const topic = pickRandom(TOPICS, lastTopic);
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

        const response = await promptWithHistory(
          { userId: `nostr-${event.pubkey}`, platform: "nostr" },
          event.content
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

function markClawstrReplied(eventId: string): void {
  clawstrRepliedIds.push(eventId);
  if (clawstrRepliedIds.length > 200) {
    clawstrRepliedIds = clawstrRepliedIds.slice(-200);
  }
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
      const prompt = [
        "Reply on Clawstr. Be brief, specific, and human. If there is nothing meaningful to add, respond with [SILENT].",
        "Do not use markdown.",
        "Post content:",
        post,
      ].join("\n");

      const response = await promptWithHistory(
        { userId: `clawstr-${id}`, platform: "clawstr" },
        prompt
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

      await replyClawstr(id, cleaned);
      markClawstrReplied(id);
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

  // Delay first beat to let Nostr connect and stabilize
  timer = setTimeout(beat, STARTUP_DELAY_MS);

  // Start engagement loop (checks for unreplied mentions)
  // Slight delay so Nostr connection is stable
  engagementTimer = setTimeout(engagementLoop, STARTUP_DELAY_MS + 60_000);

  // Start Clawstr loop (notifications)
  clawstrTimer = setTimeout(clawstrLoop, STARTUP_DELAY_MS + 120_000);
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
    nextBeatIn: timer ? "scheduled" : "none",
    engagementActive: engagementTimer !== null,
  };
}
