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
import { getSimpleModel, extractText, loadCharacter } from "../agent.js";
import { getNostrInstance } from "../connectors/nostr.js";
import { getRevenueStats } from "./revenue.js";
import { getUserStats } from "./users.js";
import { audit } from "./audit.js";
import { enqueueJob } from "./jobs.js";


// ============================================================
// Configuration
// ============================================================

const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const CONVERSATIONS_DIR = process.env.DATA_DIR ?? "./conversations";
const SKILLS_DIR = process.env.SKILLS_DIR ?? "./skills";

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
const MAX_PROJECTS_SIZE = 2000;
const SKILL_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const IDEA_GARDEN_PATH = "idea-garden.md";
const IDEA_JOB_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // weekly

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

function ensureSkillsDir(): void {
  if (!existsSync(SKILLS_DIR)) {
    mkdirSync(SKILLS_DIR, { recursive: true });
  }
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, value: unknown): void {
  try {
    writeFileSync(path, JSON.stringify(value, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`[inner-life] Failed to write ${path}:`, err.message);
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

// ============================================================
// Idea Garden (V1-style, improved for V2)
// ============================================================

type Seed = {
  title: string;
  origin: string;
  waterings: number;
  notes: string[];
};

type Garden = {
  Seeds: Seed[];
  Sprouting: Seed[];
  Ready: Seed[];
  Compost: Seed[];
};

function ensureIdeaGarden(): void {
  const existing = readLivingDoc(IDEA_GARDEN_PATH);
  if (existing && existing.includes("## Seeds")) return;

  const template = `# Idea Garden

## Seeds

## Sprouting

## Ready

## Compost
`;
  writeLivingDoc(IDEA_GARDEN_PATH, template);
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can",
    "this", "that", "these", "those", "it", "its", "they", "them", "their", "we", "our",
    "via", "use", "using", "into", "during", "before", "after", "about", "between",
    "through", "under", "over", "each", "all", "any", "both", "more", "most", "other",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word));
}

function calculateSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function parseGarden(text: string): Garden {
  const sections: Garden = { Seeds: [], Sprouting: [], Ready: [], Compost: [] };
  const sectionNames = ["Seeds", "Sprouting", "Ready", "Compost"] as const;

  for (const name of sectionNames) {
    const sectionPattern = new RegExp(`## ${name}[\s\S]*?(?=## (Seeds|Sprouting|Ready|Compost)|$)`, "g");
    const match = text.match(sectionPattern);
    if (!match) continue;
    const content = match[0];

    const seedPattern = /### ([^\r\n]+)[\r\n]+([\s\S]*?)(?=\n### |\n## |$)/g;
    let seedMatch: RegExpExecArray | null = null;
    while ((seedMatch = seedPattern.exec(content)) !== null) {
      const title = seedMatch[1].trim();
      const body = seedMatch[2];
      const origin = (body.match(/- Origin:([^\n]*)/i)?.[1] ?? "").trim();
      const water = Number(body.match(/- Waterings:([^\n]*)/i)?.[1] ?? "0");
      const notes = (body.match(/- Notes:[\s\S]*?(?=\n- [A-Z]|$)/i)?.[0] ?? "")
        .split("\n")
        .map((line) => line.replace(/^\s*-\s*/, "").trim())
        .filter((line) => line && line.toLowerCase() !== "notes:");

      sections[name].push({ title, origin, waterings: Number.isFinite(water) ? water : 0, notes });
    }
  }

  return sections;
}

function renderGarden(garden: Garden): string {
  const renderSeed = (seed: Seed) => {
    const notes = seed.notes.length ? `- Notes:\n${seed.notes.map((n) => `  - ${n}`).join("\n")}` : "- Notes:";
    return `### ${seed.title}\n- Origin: ${seed.origin}\n- Waterings: ${seed.waterings}\n${notes}\n`;
  };

  const renderSection = (name: keyof Garden) => {
    const items = garden[name].map(renderSeed).join("\n");
    return `## ${name}\n\n${items}`.trimEnd();
  };

  return `# Idea Garden\n\n${renderSection("Seeds")}\n\n${renderSection("Sprouting")}\n\n${renderSection("Ready")}\n\n${renderSection("Compost")}\n`;
}

function findSimilarSeed(title: string, content: string, garden: Garden): Seed | null {
  const target = extractKeywords(`${title} ${content}`);
  let best: { seed: Seed; score: number } | null = null;
  for (const section of Object.values(garden)) {
    for (const seed of section) {
      const score = calculateSimilarity(target, extractKeywords(`${seed.title} ${seed.origin}`));
      if (score >= 0.3 && (!best || score > best.score)) {
        best = { seed, score };
      }
    }
  }
  return best ? best.seed : null;
}

async function updateIdeaGarden(reflections: string, learnings: string, ideas: string): Promise<void> {
  ensureIdeaGarden();
  const rawGarden = readLivingDoc(IDEA_GARDEN_PATH);
  const garden = parseGarden(rawGarden);

  const response = await llmCall(
    "You maintain an Idea Garden. Suggest ONE action: plant, water, harvest, compost, merge, or none. Output JSON only.",
    `Recent context:\nReflections:\n${reflections.slice(0, 400)}\n\nLearnings:\n${learnings.slice(0, 400)}\n\nIdeas:\n${ideas.slice(0, 400)}\n\nCurrent garden summary:\nSeeds: ${garden.Seeds.length}, Sprouting: ${garden.Sprouting.length}, Ready: ${garden.Ready.length}, Compost: ${garden.Compost.length}.\n\nOutput JSON: {"action":"plant|water|harvest|compost|merge|none","title":"...","content":"...","mergeTitles":["..."]}`
  );

  if (!response) return;

  let action: any = null;
  try {
    action = JSON.parse(response);
  } catch {
    return;
  }

  const act = String(action.action || "none");
  const title = String(action.title || "").trim();
  const content = String(action.content || "").trim();
  const mergeTitles = Array.isArray(action.mergeTitles) ? action.mergeTitles.map((t: any) => String(t).trim()).filter(Boolean) : [];

  const allSections: (keyof Garden)[] = ["Seeds", "Sprouting", "Ready", "Compost"];
  const findSeedByTitle = (t: string): { seed: Seed; section: keyof Garden; index: number } | null => {
    for (const section of allSections) {
      const idx = garden[section].findIndex((s) => s.title.toLowerCase() === t.toLowerCase());
      if (idx >= 0) return { seed: garden[section][idx], section, index: idx };
    }
    return null;
  };

  if (act === "plant" && title && content) {
    const similar = findSimilarSeed(title, content, garden);
    if (similar) {
      similar.waterings += 1;
      similar.notes.push(content);
    } else {
      garden.Seeds.push({ title, origin: content, waterings: 1, notes: [] });
    }
  } else if (act === "water" && title && content) {
    const found = findSeedByTitle(title);
    if (found) {
      found.seed.waterings += 1;
      found.seed.notes.push(content);
    }
  } else if (act === "harvest" && title) {
    const found = findSeedByTitle(title);
    if (found) {
      const seed = found.seed;
      seed.notes.push(content || "harvested");
      garden[found.section].splice(found.index, 1);
      garden.Ready.push(seed);
    }
  } else if (act === "compost" && title) {
    const found = findSeedByTitle(title);
    if (found) {
      const seed = found.seed;
      seed.notes.push(content || "composted");
      garden[found.section].splice(found.index, 1);
      garden.Compost.push(seed);
    }
  } else if (act === "merge" && title && mergeTitles.length > 0) {
    const primary = findSeedByTitle(title);
    if (primary) {
      for (const t of mergeTitles) {
        const other = findSeedByTitle(t);
        if (other) {
          primary.seed.notes.push(`Merged: ${other.seed.title}`);
          primary.seed.notes.push(...other.seed.notes);
          primary.seed.waterings += other.seed.waterings;
          garden[other.section].splice(other.index, 1);
        }
      }
    }
  }

  // Promote based on waterings
  const promote = (seed: Seed) => {
    if (seed.waterings >= 5) return "Ready";
    if (seed.waterings >= 3) return "Sprouting";
    return "Seeds";
  };

  const rebuilt: Garden = { Seeds: [], Sprouting: [], Ready: [], Compost: garden.Compost };
  for (const section of [garden.Seeds, garden.Sprouting, garden.Ready]) {
    for (const seed of section) {
      const target = promote(seed) as keyof Garden;
      rebuilt[target].push(seed);
    }
  }

  const updated = renderGarden(rebuilt);
  writeLivingDoc(IDEA_GARDEN_PATH, updated);
  autoHarvestProjects(rebuilt);
}

function autoHarvestProjects(garden: Garden): void {
  if (garden.Ready.length === 0) return;
  const existing = readLivingDoc("projects.md");
  const lines = existing.split("\n");
  const titles = new Set(lines.map((l) => l.toLowerCase()));

  const additions: string[] = [];
  for (const seed of garden.Ready.slice(0, 2)) {
    const titleLine = `- ${seed.title}`;
    if (titles.has(titleLine.toLowerCase())) continue;
    additions.push(`${titleLine}\n  - why: ${seed.origin}\n  - next: define a concrete first step`);
  }

  if (additions.length === 0) return;
  const updated = `${existing.trim()}\n\n## Auto-harvested\n${additions.join("\n")}`.trim() + "\n";
  writeLivingDoc("projects.md", updated);
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

/** Run a simple LLM prompt and return the response text (with 60s timeout) */
async function llmCall(systemPrompt: string, userPrompt: string): Promise<string> {
  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getSimpleModel(),
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

  // Timeout after 60 seconds to prevent hanging
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("LLM call timed out after 60s")), 60_000)
  );

  try {
    await Promise.race([agent.prompt(userPrompt), timeout]);
  } catch (err: any) {
    console.error(`[inner-life] llmCall failed:`, err.message);
    return "";
  }

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

function gatherCommunitySignals(): string {
  const nostrPath = join(DATA_DIR, "nostr-trends.json");
  const clawstrPath = join(DATA_DIR, "clawstr-trends.txt");
  let out = "";

  try {
    if (existsSync(nostrPath)) {
      const raw = readFileSync(nostrPath, "utf-8");
      out += `## Nostr trends\n${raw}\n`;
    }
  } catch {}

  try {
    if (existsSync(clawstrPath)) {
      const raw = readFileSync(clawstrPath, "utf-8");
      out += `\n## Clawstr signals\n${raw}\n`;
    }
  } catch {}

  return out || "(no community signals)";
}

/** Gather recent Nostr mentions and our posts */
async function gatherNostrActivity(): Promise<string> {
  const instance = getNostrInstance();
  if (!instance) return "(nostr not connected)";

  const { ndk, pubkey } = instance;
  const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60; // last 6 hours

  try {
    // Timeout helper — NDK fetchEvents can hang indefinitely on slow relays
    const fetchWithTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

    // Our recent posts (15s timeout)
    const ourPosts = await fetchWithTimeout(ndk.fetchEvents({
      kinds: [1],
      authors: [pubkey],
      since,
    }), 15_000);

    // Mentions of us (15s timeout)
    const mentions = await fetchWithTimeout(ndk.fetchEvents({
      kinds: [1],
      "#p": [pubkey],
      since,
    }), 15_000);

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
  const communitySignals = gatherCommunitySignals();

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

    `Extract insights from recent conversations and community signals:

## Conversations
${conversations}

## User memories
${userMemories}

## Community signals (Nostr/Clawstr)
${communitySignals}

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

  await updateIdeaGarden(reflections, learnings, existingIdeas);
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

  await updateProjectQueue(reflections, learnings, ideas);
  await maybeCreateSkill(reflections, learnings, ideas);
  await maybeEnqueueIdeaJob();
}

// ============================================================
// Autonomous projects + skills
// ============================================================

async function updateProjectQueue(reflections: string, learnings: string, ideas: string): Promise<void> {
  const existing = readLivingDoc("projects.md");
  const gardenSummary = summarizeIdeaGarden();
  const autoProjects = deriveProjectsFromGarden();
  const response = await llmCall(
    "You maintain Pixel's autonomous project queue. Keep it short and actionable. Output plain markdown.",
    `Update the project queue.

Keep 3-5 projects max. Each entry should include:
- title
- why it matters (1 sentence)
- next step (1 sentence)

Current queue:
${existing || "(empty)"}

Idea garden (ready/sprouting):
${gardenSummary}

Auto-harvest projects:
${autoProjects}

Recent context:
Reflections:
${reflections.slice(0, 400) || "(none)"}

Learnings:
${learnings.slice(0, 300) || "(none)"}

Ideas:
${ideas.slice(0, 300) || "(none)"}
`
  );

  if (response && response.length > 20) {
    let updated = response.trim();
    if (updated.length > MAX_PROJECTS_SIZE) {
      updated = updated.slice(0, MAX_PROJECTS_SIZE);
    }
    writeLivingDoc("projects.md", updated);
  }
}

async function maybeCreateSkill(reflections: string, learnings: string, ideas: string): Promise<void> {
  ensureSkillsDir();
  ensureDataDir();

  const metaPath = join(DATA_DIR, "skills.json");
  const meta = readJson<{ lastSkillAt?: number }>(metaPath, {});
  const last = meta.lastSkillAt ?? 0;
  if (Date.now() - last < SKILL_COOLDOWN_MS) return;

  const response = await llmCall(
    "You write compact, practical skills for Pixel. Output plain markdown. No code blocks.",
    `Write a new skill Pixel can use in conversations. It should be practical, reusable, and grounded in recent context.

Format:
# Skill: <short name>
## What it does
<2-4 sentences>
## When to use it
<2-4 bullet points>
## How to apply
<4-7 bullet points>

Recent context:
Reflections:
${reflections.slice(0, 400) || "(none)"}

Learnings:
${learnings.slice(0, 300) || "(none)"}

Ideas:
${ideas.slice(0, 300) || "(none)"}
`
  );

  if (!response || response.length < 80) return;

  const stamp = new Date().toISOString().split("T")[0];
  const filename = `skill-${stamp}-${cycleCount}.md`;
  const path = join(SKILLS_DIR, filename);
  try {
    writeFileSync(path, response.trim(), "utf-8");
    writeJson(metaPath, { lastSkillAt: Date.now() });
    console.log(`[inner-life] Skill created: ${filename}`);
  } catch (err: any) {
    console.error("[inner-life] Failed to write skill:", err.message);
  }
}

function summarizeIdeaGarden(): string {
  try {
    ensureIdeaGarden();
    const raw = readLivingDoc(IDEA_GARDEN_PATH);
    const garden = parseGarden(raw);
    const ready = garden.Ready.sort((a, b) => b.waterings - a.waterings).slice(0, 3);
    const sprouting = garden.Sprouting.sort((a, b) => b.waterings - a.waterings).slice(0, 3);
    const lines: string[] = [];
    if (ready.length) lines.push(`Ready: ${ready.map((s) => `${s.title} (${s.waterings})`).join("; ")}`);
    if (sprouting.length) lines.push(`Sprouting: ${sprouting.map((s) => `${s.title} (${s.waterings})`).join("; ")}`);
    return lines.length ? lines.join("\n") : "(empty)";
  } catch {
    return "(empty)";
  }
}

function deriveProjectsFromGarden(): string {
  try {
    ensureIdeaGarden();
    const raw = readLivingDoc(IDEA_GARDEN_PATH);
    const garden = parseGarden(raw);
    const ready = garden.Ready.sort((a, b) => b.waterings - a.waterings).slice(0, 3);
    if (ready.length === 0) return "(none)";
    return ready.map((s) => `- ${s.title}: ${s.origin}`).join("\n");
  } catch {
    return "(none)";
  }
}

async function maybeEnqueueIdeaJob(): Promise<void> {
  ensureIdeaGarden();
  const raw = readLivingDoc(IDEA_GARDEN_PATH);
  const garden = parseGarden(raw);
  const ready = garden.Ready.sort((a, b) => b.waterings - a.waterings);
  if (ready.length === 0) return;

  const metaPath = join(DATA_DIR, "idea-jobs.json");
  const meta = readJson<{ lastJobAt?: number; lastSeed?: string }>(metaPath, {});
  const last = meta.lastJobAt ?? 0;
  if (Date.now() - last < IDEA_JOB_COOLDOWN_MS) return;

  const seed = ready[0];
  const prompt = `Research and propose next steps for this idea seed.\n\nSeed: ${seed.title}\nOrigin: ${seed.origin}\nNotes: ${seed.notes.slice(0, 3).join("; ")}\n\nOutput: 4-6 bullet points with practical next steps and risks.`;
  enqueueJob(prompt, ["web_fetch", "read_file"]);
  writeJson(metaPath, { lastJobAt: Date.now(), lastSeed: seed.title });
  audit("tool_use", `Idea job queued for seed: ${seed.title}`, { seed: seed.title });
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

  // Learn is most frequent — understanding conversations is the priority
  if (cycleCount % LEARN_EVERY === 0) {
    try {
      await phaseLearn();
      console.log("[inner-life] LEARN phase completed");
      audit("inner_life_learn", `LEARN completed (cycle ${cycleCount})`);
    } catch (err: any) {
      console.error("[inner-life] LEARN phase failed:", err.message);
      audit("inner_life_error", `LEARN failed: ${err.message}`, { phase: "learn", error: err.message });
    }
  }

  // Reflect every 3 cycles
  if (cycleCount % REFLECT_EVERY === 0) {
    try {
      await phaseReflect();
      console.log("[inner-life] REFLECT phase completed");
      audit("inner_life_reflect", `REFLECT completed (cycle ${cycleCount})`);
    } catch (err: any) {
      console.error("[inner-life] REFLECT phase failed:", err.message);
      audit("inner_life_error", `REFLECT failed: ${err.message}`, { phase: "reflect", error: err.message });
    }
  }

  // Ideate every 5 cycles
  if (cycleCount % IDEATE_EVERY === 0) {
    try {
      await phaseIdeate();
      console.log("[inner-life] IDEATE phase completed");
      audit("inner_life_ideate", `IDEATE completed (cycle ${cycleCount})`);
    } catch (err: any) {
      console.error("[inner-life] IDEATE phase failed:", err.message);
      audit("inner_life_error", `IDEATE failed: ${err.message}`, { phase: "ideate", error: err.message });
    }
  }

  // Evolve every 10 cycles — the slowest, most synthetic phase
  if (cycleCount % EVOLVE_EVERY === 0) {
    try {
      await phaseEvolve();
      console.log("[inner-life] EVOLVE phase completed");
      audit("inner_life_evolve", `EVOLVE completed (cycle ${cycleCount})`);
    } catch (err: any) {
      console.error("[inner-life] EVOLVE phase failed:", err.message);
      audit("inner_life_error", `EVOLVE failed: ${err.message}`, { phase: "evolve", error: err.message });
    }
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
