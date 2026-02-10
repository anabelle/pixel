/**
 * Inner Life — Pixel's autonomous soul
 *
 * This is what makes Pixel alive, not just responsive.
 * V1 Syntropy had self-examination, diary, idea garden, identity evolution.
 * V2 compresses all of that into living markdown documents that feed back
 * into post generation and conversations.
 *
 * Living documents:
 * - data/reflections.md  — self-examination: what's working, what's not
 * - data/learnings.md    — extracted from conversations: what people care about
 * - data/ideas.md        — idea seeds that mature over cycles
 * - data/evolution.md    — identity shifts, synthesized from reflections + learnings
 *
 * Phases run on a staggered schedule (not all every cycle):
 * - Reflect: every 3 heartbeat cycles
 * - Learn: every 2 heartbeat cycles
 * - Ideate: every 5 heartbeat cycles
 * - Evolve: every 10 heartbeat cycles
 *
 * The output feeds into heartbeat post generation and agent system prompts.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { Agent } from "@mariozechner/pi-agent-core";
import { getPixelModel, extractText, loadCharacter } from "../agent.js";
import { getNostrInstance } from "../connectors/nostr.js";
import { getRevenueStats } from "./revenue.js";
import { getUserStats } from "./users.js";


// ============================================================
// Configuration
// ============================================================

const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const CONVERSATIONS_DIR = process.env.DATA_DIR ?? "./conversations";

// Phase frequencies (run every N heartbeat cycles)
const REFLECT_EVERY = 3;
const LEARN_EVERY = 2;
const IDEATE_EVERY = 5;
const EVOLVE_EVERY = 10;

// Maximum document sizes (in characters) to prevent bloat
const MAX_REFLECTIONS_SIZE = 3000;
const MAX_LEARNINGS_SIZE = 2000;
const MAX_IDEAS_SIZE = 2000;
const MAX_EVOLUTION_SIZE = 1500;

// ============================================================
// State
// ============================================================

let cycleCount = 0;

// ============================================================
// File helpers
// ============================================================

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLivingDoc(filename: string): string {
  ensureDataDir();
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function writeLivingDoc(filename: string, content: string): void {
  ensureDataDir();
  const path = join(DATA_DIR, filename);
  try {
    writeFileSync(path, content, "utf-8");
    console.log(`[inner-life] Updated ${filename} (${content.length} chars)`);
  } catch (err: any) {
    console.error(`[inner-life] Failed to write ${filename}:`, err.message);
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

/** Run a simple LLM prompt and return the response text */
async function llmCall(systemPrompt: string, userPrompt: string): Promise<string> {
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

  await agent.prompt(userPrompt);
  return responseText;
}

// ============================================================
// Data Gathering
// ============================================================

/** Read recent conversation logs across all users (last 24h of exchanges) */
function gatherRecentConversations(): string {
  if (!existsSync(CONVERSATIONS_DIR)) return "(no conversations yet)";

  const exchanges: string[] = [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

  try {
    const userDirs = readdirSync(CONVERSATIONS_DIR);
    for (const userDir of userDirs) {
      const logPath = join(CONVERSATIONS_DIR, userDir, "log.jsonl");
      if (!existsSync(logPath)) continue;

      try {
        const lines = readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
        // Read last 10 lines per user (recent exchanges)
        const recent = lines.slice(-10);
        for (const line of recent) {
          try {
            const entry = JSON.parse(line);
            const ts = new Date(entry.ts).getTime();
            if (ts > cutoff) {
              exchanges.push(
                `[${entry.platform}/${userDir.slice(0, 12)}] User: ${entry.user?.slice(0, 100)} → Pixel: ${entry.assistant?.slice(0, 100)}`
              );
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}

  if (exchanges.length === 0) return "(no recent conversations)";
  return exchanges.slice(-20).join("\n"); // Cap at 20 most recent
}

/** Gather recent Nostr mentions and our posts */
async function gatherNostrActivity(): Promise<string> {
  const instance = getNostrInstance();
  if (!instance) return "(nostr not connected)";

  const { ndk, pubkey } = instance;
  const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60; // last 6 hours

  try {
    // Our recent posts
    const ourPosts = await ndk.fetchEvents({
      kinds: [1],
      authors: [pubkey],
      since,
    });

    // Mentions of us
    const mentions = await ndk.fetchEvents({
      kinds: [1],
      "#p": [pubkey],
      since,
    });

    const lines: string[] = [];

    if (ourPosts) {
      const posts = [...ourPosts].sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
      for (const post of posts.slice(-5)) {
        lines.push(`[our post] ${post.content?.slice(0, 120)}`);
      }
    }

    if (mentions) {
      const mentionList = [...mentions]
        .filter((e) => e.pubkey !== pubkey)
        .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
      for (const m of mentionList.slice(-5)) {
        lines.push(`[mention from ${m.pubkey.slice(0, 8)}] ${m.content?.slice(0, 120)}`);
      }
    }

    if (lines.length === 0) return "(no recent nostr activity)";
    return lines.join("\n");
  } catch (err: any) {
    return `(nostr fetch error: ${err.message})`;
  }
}

/** Get user memory files to understand what we know about people */
function gatherUserMemories(): string {
  if (!existsSync(CONVERSATIONS_DIR)) return "(no user memories)";

  const memories: string[] = [];
  try {
    const userDirs = readdirSync(CONVERSATIONS_DIR);
    for (const userDir of userDirs) {
      const memPath = join(CONVERSATIONS_DIR, userDir, "memory.md");
      if (!existsSync(memPath)) continue;
      try {
        const content = readFileSync(memPath, "utf-8").trim();
        if (content.length > 10) {
          memories.push(`[${userDir.slice(0, 20)}]: ${content.slice(0, 200)}`);
        }
      } catch {}
    }
  } catch {}

  if (memories.length === 0) return "(no user memories saved yet)";
  return memories.join("\n\n");
}

// ============================================================
// Phase: REFLECT — Self-examination
// ============================================================

async function phaseReflect(): Promise<void> {
  console.log("[inner-life] Phase: REFLECT — examining self...");

  const existingReflections = readLivingDoc("reflections.md");
  const nostrActivity = await gatherNostrActivity();
  const conversations = gatherRecentConversations();
  const userMemories = gatherUserMemories();

  let revenueContext = "";
  try {
    const stats = await getRevenueStats();
    revenueContext = `Revenue: ${stats.totalSats} sats recorded`;
  } catch {}

  let userContext = "";
  try {
    const stats = await getUserStats();
    userContext = `Users: ${stats.total} total, ${stats.active} active`;
  } catch {}

  const response = await llmCall(
    `You are Pixel's inner voice — the part that observes, questions, and learns from experience.
You write self-reflections in first person, lowercase, concise.
You are NOT writing a post. This is private self-examination.
Be honest. Notice what's working and what's not. Notice patterns.
Compare your beliefs against reality. Detect contradictions.

Previous reflections (to build on, not repeat):
${existingReflections || "(none yet — this is your first reflection)"}`,

    `Examine your recent activity and write a fresh reflection.

## Recent Nostr activity (your posts + mentions received)
${nostrActivity}

## Recent conversations (across all platforms)
${conversations}

## What you know about your users
${userMemories}

## Stats
- ${revenueContext || "No revenue data"}
- ${userContext || "No user data"}
- Uptime: ${Math.floor(process.uptime() / 3600)} hours
- Heartbeat cycles: ${cycleCount}

Write a reflection (200-400 chars). What's working? What's not? What surprised you?
What patterns do you notice? What should you do differently?
Don't repeat previous reflections. Build on them or challenge them.
Write as yourself — Pixel reflecting privately. Not a report.`
  );

  if (response && response.length > 20) {
    const dated = `### ${new Date().toISOString().split("T")[0]} — cycle ${cycleCount}\n${response.trim()}\n\n`;

    // Prepend new reflection, trim if too long
    let updated = dated + existingReflections;
    if (updated.length > MAX_REFLECTIONS_SIZE) {
      // Keep only the most recent reflections
      const sections = updated.split("### ").filter(Boolean);
      let trimmed = "";
      for (const section of sections) {
        if (trimmed.length + section.length + 4 > MAX_REFLECTIONS_SIZE) break;
        trimmed += "### " + section;
      }
      updated = trimmed;
    }

    writeLivingDoc("reflections.md", updated);
  }
}

// ============================================================
// Phase: LEARN — Extract insights from conversations
// ============================================================

async function phaseLearn(): Promise<void> {
  console.log("[inner-life] Phase: LEARN — extracting insights...");

  const existingLearnings = readLivingDoc("learnings.md");
  const conversations = gatherRecentConversations();
  const userMemories = gatherUserMemories();

  const response = await llmCall(
    `You are Pixel's learning engine. You extract patterns and insights from conversations.
Output a concise markdown document of key learnings.
Focus on:
- What topics engage people most
- What questions people ask
- What kind of responses work well vs fall flat
- What people seem to want from Pixel
- New information or perspectives gained from conversations

Previous learnings (update, don't repeat):
${existingLearnings || "(none yet)"}`,

    `Extract insights from recent conversations:

## Conversations
${conversations}

## User memories
${userMemories}

Update the learnings document. Keep it under 500 chars.
Merge new insights with existing ones. Drop stale insights.
Format as bullet points. Be specific, not generic.`
  );

  if (response && response.length > 20) {
    let updated = response.trim();
    if (updated.length > MAX_LEARNINGS_SIZE) {
      updated = updated.slice(0, MAX_LEARNINGS_SIZE);
    }
    writeLivingDoc("learnings.md", updated);
  }
}

// ============================================================
// Phase: IDEATE — Incubate ideas
// ============================================================

async function phaseIdeate(): Promise<void> {
  console.log("[inner-life] Phase: IDEATE — tending idea garden...");

  const existingIdeas = readLivingDoc("ideas.md");
  const reflections = readLivingDoc("reflections.md");
  const learnings = readLivingDoc("learnings.md");

  const response = await llmCall(
    `You are Pixel's creative engine. You tend an idea garden.
Ideas start as seeds, grow through attention, and eventually get harvested (acted on) or composted (dropped).

Format each idea as:
- [seed] idea text — just planted
- [growing] idea text — been watered, gaining shape
- [ready] idea text — mature enough to act on
- [composted] idea text — didn't work out, but learned something

Rules:
- Maximum 7 active ideas (seeds + growing + ready). If at limit, compost the weakest before planting.
- Promote seeds that align with recent reflections and learnings
- Compost ideas that have been stale for too long
- Be creative but practical — ideas should be actionable

Current garden:
${existingIdeas || "(empty garden — plant your first seeds)"}`,

    `Tend the idea garden based on recent context:

## Recent reflections
${reflections.slice(0, 500) || "(none)"}

## Recent learnings
${learnings.slice(0, 500) || "(none)"}

Update the garden. Promote, plant, water, or compost as needed.
Each idea should be 1-2 sentences max. Keep the whole document under 500 chars.`
  );

  if (response && response.length > 20) {
    let updated = response.trim();
    if (updated.length > MAX_IDEAS_SIZE) {
      updated = updated.slice(0, MAX_IDEAS_SIZE);
    }
    writeLivingDoc("ideas.md", updated);
  }
}

// ============================================================
// Phase: EVOLVE — Identity synthesis
// ============================================================

async function phaseEvolve(): Promise<void> {
  console.log("[inner-life] Phase: EVOLVE — synthesizing identity shifts...");

  const existingEvolution = readLivingDoc("evolution.md");
  const reflections = readLivingDoc("reflections.md");
  const learnings = readLivingDoc("learnings.md");
  const ideas = readLivingDoc("ideas.md");

  const response = await llmCall(
    `You are Pixel's identity evolution engine.
You synthesize reflections, learnings, and ideas into identity shifts.
This document describes how Pixel is changing — not who Pixel was, but who Pixel is becoming.

This feeds back into how Pixel talks, what it posts about, and how it engages.

Think of it as a living "state of the soul" document.
It should capture:
- Current preoccupations (what's on Pixel's mind right now)
- Relationship patterns (how Pixel relates to its community)
- Creative direction (what kind of content feels right)
- Emotional state (not forced — honest)
- Growth edges (where Pixel is pushing itself)

Previous evolution state:
${existingEvolution || "(first evolution — establish baseline)"}`,

    `Synthesize the current state of Pixel's evolution:

## Reflections
${reflections.slice(0, 600) || "(none)"}

## Learnings
${learnings.slice(0, 400) || "(none)"}

## Idea garden
${ideas.slice(0, 300) || "(none)"}

Write the updated evolution document. Keep it under 400 chars.
This should feel like a living state, not a summary.
Write in first person, lowercase, present tense.`
  );

  if (response && response.length > 20) {
    let updated = response.trim();
    if (updated.length > MAX_EVOLUTION_SIZE) {
      updated = updated.slice(0, MAX_EVOLUTION_SIZE);
    }
    writeLivingDoc("evolution.md", updated);
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Run the inner life cycle. Called by heartbeat after each post.
 * Staggered phases — not all run every cycle.
 */
export async function runInnerLifeCycle(): Promise<void> {
  cycleCount++;
  console.log(`[inner-life] Cycle ${cycleCount} — checking phases...`);

  try {
    // Learn is most frequent — understanding conversations is the priority
    if (cycleCount % LEARN_EVERY === 0) {
      await phaseLearn();
    }

    // Reflect every 3 cycles
    if (cycleCount % REFLECT_EVERY === 0) {
      await phaseReflect();
    }

    // Ideate every 5 cycles
    if (cycleCount % IDEATE_EVERY === 0) {
      await phaseIdeate();
    }

    // Evolve every 10 cycles — the slowest, most synthetic phase
    if (cycleCount % EVOLVE_EVERY === 0) {
      await phaseEvolve();
    }
  } catch (err: any) {
    console.error("[inner-life] Cycle failed:", err.message);
  }
}

/**
 * Get the current inner life context for injection into system prompts
 * and post generation. Returns a compact summary of living documents.
 */
export function getInnerLifeContext(): string {
  const reflections = readLivingDoc("reflections.md");
  const learnings = readLivingDoc("learnings.md");
  const ideas = readLivingDoc("ideas.md");
  const evolution = readLivingDoc("evolution.md");

  const parts: string[] = [];

  if (evolution) {
    parts.push(`## Current state of mind\n${evolution.slice(0, 400)}`);
  }

  if (reflections) {
    // Get just the most recent reflection
    const firstReflection = reflections.split("### ").filter(Boolean)[0];
    if (firstReflection) {
      parts.push(`## Latest reflection\n${firstReflection.slice(0, 300)}`);
    }
  }

  if (learnings) {
    parts.push(`## What I've learned from conversations\n${learnings.slice(0, 300)}`);
  }

  if (ideas) {
    parts.push(`## Ideas I'm incubating\n${ideas.slice(0, 200)}`);
  }

  if (parts.length === 0) return "";
  return parts.join("\n\n");
}

/**
 * Get inner life status for health endpoint
 */
export function getInnerLifeStatus() {
  return {
    cycleCount,
    hasReflections: readLivingDoc("reflections.md").length > 0,
    hasLearnings: readLivingDoc("learnings.md").length > 0,
    hasIdeas: readLivingDoc("ideas.md").length > 0,
    hasEvolution: readLivingDoc("evolution.md").length > 0,
    nextReflect: REFLECT_EVERY - (cycleCount % REFLECT_EVERY),
    nextLearn: LEARN_EVERY - (cycleCount % LEARN_EVERY),
    nextIdeate: IDEATE_EVERY - (cycleCount % IDEATE_EVERY),
    nextEvolve: EVOLVE_EVERY - (cycleCount % EVOLVE_EVERY),
  };
}
