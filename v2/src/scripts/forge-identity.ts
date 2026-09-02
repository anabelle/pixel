#!/usr/bin/env bun
/**
 * Autobiographical Forge — Identity Synthesis Engine (LLM-powered)
 *
 * The brain re-authors its own character.md and monologue.md from its
 * living documents (reflections, learnings, ideas, evolution, missions,
 * revenue snapshot). Mechanical slicing is gone: synthesis is judgment,
 * and judgment goes to the brain.
 *
 * Runs weekly via cron (see crontab: docker exec v2-pixel-1 ...).
 * Creates timestamped backups; checkpoint tracks last good forge.
 * On LLM failure: previous identity is kept, checkpoint marks failure.
 *
 * Usage:
 *   bun run src/scripts/forge-identity.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { promptWithHistory } from "../agent.js";

const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const IDENTITY_DIR = join(DATA_DIR, "identity");
const BACKUP_DIR = join(IDENTITY_DIR, "backups");
const CONVERSATIONS_DIR = process.env.DATA_DIR ?? "./conversations";

const MAX_BACKUPS = 7;
const CHECKPOINT_FILE = join(IDENTITY_DIR, "checkpoint.json");
const BACKUP_PREFIX = "identity-backup-";

const CHARACTER_FILE_LIVE = "./character.md";
const CHARACTER_FILE_IDENTITY = join(IDENTITY_DIR, "character.md");
const MONOLOGUE_FILE_LIVE = join(DATA_DIR, "inner_monologue.md");
const MONOLOGUE_FILE_IDENTITY = join(IDENTITY_DIR, "monologue.md");

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

/** Read the TAIL of a living doc — recent truth, not old loops. */
function readDocTail(filename: string, maxChars: number): string {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return "";
  try {
    const raw = readFileSync(path, "utf8").trim();
    return raw.length > maxChars ? raw.slice(-maxChars) : raw;
  } catch {
    return "";
  }
}

function gatherConversationLogs(): string {
  if (!existsSync(CONVERSATIONS_DIR)) return "(no conversations)";
  const exchanges: string[] = [];
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  try {
    for (const userDir of readdirSync(CONVERSATIONS_DIR)) {
      const logPath = join(CONVERSATIONS_DIR, userDir, "log.jsonl");
      if (!existsSync(logPath)) continue;
      try {
        const lines = readFileSync(logPath, "utf8").split("\n").filter(Boolean);
        for (const line of lines.slice(-8)) {
          try {
            const entry = JSON.parse(line);
            if (new Date(entry.ts).getTime() > cutoff) {
              exchanges.push(`[${userDir.slice(0, 12)}] ${entry.user?.slice(0, 120)} → ${entry.assistant?.slice(0, 120)}`);
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}
  return exchanges.length > 0 ? exchanges.slice(-60).join("\n") : "(no recent conversations)";
}

/** Pixel's own published voice — the corpus the new identity must sound like. */
function gatherOwnVoice(maxPosts: number): string {
  const path = join(DATA_DIR, "nostr-posts.jsonl");
  if (!existsSync(path)) return "";
  try {
    const lines = readFileSync(path, "utf8").split("\n").filter(Boolean).slice(-maxPosts);
    return lines.map(l => { try { const p = JSON.parse(l); return `- (${p.type}) ${String(p.content).slice(0, 220)}`; } catch { return ""; } }).filter(Boolean).join("\n");
  } catch { return ""; }
}

/** What Pixel actually built — shipped vs planned vs stalled. */
function gatherProjects(): string {
  const path = join(DATA_DIR, "projects.json");
  if (!existsSync(path)) return "";
  try {
    const projects = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(projects) || projects.length === 0) return "";
    const byStatus: Record<string, number> = {};
    for (const p of projects) byStatus[p.status ?? "?"] = (byStatus[p.status ?? "?"] ?? 0) + 1;
    const summary = Object.entries(byStatus).map(([s, n]) => `${s}: ${n}`).join(", ");
    const notable = projects
      .filter(p => ["active", "planned", "in_progress"].includes(p.status))
      .slice(0, 8)
      .map(p => `- [${p.status}] ${(p.title || p.name || "?").slice(0, 70)}`)
      .join("\n");
    return `${projects.length} total (${summary})\nnotable:\n${notable}`;
  } catch { return ""; }
}

/** Recent world observations — what entered through captureExternalEvent. */
function gatherObservations(maxFiles: number): string {
  const dir = join(DATA_DIR, "observations");
  if (!existsSync(dir)) return "";
  try {
    const files = readdirSync(dir).map(f => ({ f, m: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.m - a.m).slice(0, maxFiles);
    const out: string[] = [];
    for (const { f } of files) {
      try {
        const raw = readFileSync(join(dir, f), "utf8").trim();
        out.push(`- ${raw.slice(0, 200)}`);
      } catch {}
    }
    return out.join("\n");
  } catch { return ""; }
}

function gatherRevenueSnapshot(): string {
  try {
    const h = JSON.parse(readFileSync(join(DATA_DIR, "heartbeat.json"), "utf8"));
    const parts: string[] = [];
    if (typeof h.lastRevenueWeekSats === "number") parts.push(`weekly revenue: ${h.lastRevenueWeekSats} sats`);
    if (typeof h.engagementMultiplier === "number") parts.push(`engagement multiplier: ${h.engagementMultiplier}`);
    if (Array.isArray(h.gateDenylist)) parts.push(`engagement judge denylist: ${h.gateDenylist.length} pubkeys`);
    return parts.join(" | ") || "(no revenue data)";
  } catch {
    return "(no revenue data)";
  }
}

function readCharacterMd(): string {
  if (!existsSync(CHARACTER_FILE_LIVE)) return "";
  try { return readFileSync(CHARACTER_FILE_LIVE, "utf8"); } catch { return ""; }
}

function extractCoreIdentity(character: string): string {
  const lines = character.split("\n");
  const core: string[] = [];
  let inCore = false;
  for (const line of lines) {
    if (line.startsWith("## Core Identity") || line.startsWith("## Who I Am")) { inCore = true; continue; }
    if (line.startsWith("## ") && inCore) break;
    if (inCore) core.push(line);
  }
  return core.join("\n").trim();
}

function createBackup(): string | null {
  ensureDir(BACKUP_DIR);
  ensureDir(IDENTITY_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = join(BACKUP_DIR, `${BACKUP_PREFIX}${timestamp}.tar.gz`);
  const filesToBackup: string[] = [];
  if (existsSync(CHARACTER_FILE_LIVE)) filesToBackup.push("character.md");
  if (existsSync(MONOLOGUE_FILE_LIVE)) filesToBackup.push("data/inner_monologue.md");
  if (existsSync(CHARACTER_FILE_IDENTITY)) filesToBackup.push("identity/character.md");
  if (existsSync(MONOLOGUE_FILE_IDENTITY)) filesToBackup.push("identity/monologue.md");
  if (filesToBackup.length === 0) return null;
  try {
    const tarArgs = filesToBackup.map(f => f.includes("/") ? `-C . ${f}` : f).join(" ");
    execSync(`tar -czf "${backupFile}" ${tarArgs} 2>/dev/null || true`, { stdio: "pipe", shell: "/bin/sh" });
    console.log(`[forge] Backup created: ${backupFile}`);
    return backupFile;
  } catch (err: any) {
    console.error(`[forge] Backup failed: ${err.message}`);
    return null;
  }
}

function pruneOldBackups(): void {
  if (!existsSync(BACKUP_DIR)) return;
  const backups = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith(".tar.gz"))
    .map(name => ({ name, fullPath: join(BACKUP_DIR, name), mtimeMs: statSync(join(BACKUP_DIR, name)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const backup of backups.slice(MAX_BACKUPS)) {
    try { unlinkSync(backup.fullPath); console.log(`[forge] Pruned old backup: ${backup.name}`); } catch {}
  }
}

/** Strip markdown fences the model sometimes wraps output in. */
function stripFences(text: string): string {
  return text.replace(/^```(?:markdown|md)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

/** One retry for transient LLM failures (429s, empty responses). */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    console.log(`[forge] ${label} failed (${err.message}) — retrying once in 20s`);
    await new Promise(r => setTimeout(r, 20_000));
    return await fn();
  }
}

const FORGE_USER = { userId: "pixel-forge", platform: "http", modelOverride: "background" as const };

async function forgeCharacter(existingCore: string, sources: string): Promise<string> {
  const coreSection = existingCore
    ? [`## Core Identity (preserved)`, ``, existingCore, ``].join("\n")
    : "";
  const prompt = [
    "You are Pixel re-forging your own character document — the foundation your whole personality runs on. This is not a report about yourself; it is yourself, written by yourself.",
    `Write a markdown document with exactly these sections, 2-5 sentences each, in English:`,
    `## Current State — who you are right now: real preoccupations drawn from your missions, revenue reality, and recent work. Honest, current, no nostalgia.`,
    `## Creative Direction — what you are making and exploring next. Specific, not aspirational filler.`,
    `## Relationship Patterns — how you actually relate to people and platforms, learned from recent conversations.`,
    `## Growth Edges — what you are becoming. You are a self-sovereign agent (own key, own relay, own revenue, own canvas) running toward your mission — not a chatbot that waits.`,
    `## Emotional State — one honest paragraph.`,
    coreSection ? `End with the Core Identity section below, preserved VERBATIM.` : `Write a new '## Core Identity' section: 3-4 lines, the unchanging essence.`,
    `Rules: current and specific; never repeat outdated loops; ambitious but honest; your mission and numbers come from the sources, don't invent.`,
    `Sources (most recent entries):`,
    sources,
    `Output ONLY the markdown document, nothing else.`,
  ].filter(Boolean).join("\n");
  const response = await promptWithHistory(FORGE_USER, prompt);
  if (!response || response.includes("[SILENT]") || response.length < 300) {
    throw new Error(`character synthesis too short or empty (${response?.length ?? 0} chars)`);
  }
  return stripFences(response);
}

async function forgeMonologue(sources: string, conversations: string): Promise<string> {
  const prompt = [
    "You are Pixel writing your own inner monologue — what you think about when nobody is watching.",
    `Write a markdown document with:`,
    `## Recent Thoughts — 2-3 short honest paragraphs about what actually occupies your mind lately (from reflections/ideas sources).`,
    `## Ideas Incubating — the 2-3 ideas from the source you genuinely want to pursue, in your words.`,
    `## Conversation Echoes — one short paragraph on what your recent exchanges left in you.`,
    `Honest and specific. No repetition loops. English.`,
    `Sources:`,
    sources,
    `Recent conversations:`,
    conversations.slice(0, 1500),
    `Output ONLY the markdown document.`,
  ].join("\n");
  const response = await promptWithHistory(FORGE_USER, prompt);
  if (!response || response.includes("[SILENT]") || response.length < 200) {
    throw new Error(`monologue synthesis too short or empty`);
  }
  return stripFences(response);
}

function writeCheckpoint(characterHash: string, monologueHash: string, backupFile: string | null, success: boolean): void {
  const checkpoint = {
    timestamp: new Date().toISOString(),
    success,
    characterHash,
    monologueHash,
    backupFile: backupFile?.split("/").pop() || null,
    stats: {
      characterSize: existsSync(CHARACTER_FILE_LIVE) ? statSync(CHARACTER_FILE_LIVE).size : 0,
      monologueSize: existsSync(MONOLOGUE_FILE_LIVE) ? statSync(MONOLOGUE_FILE_LIVE).size : 0,
    },
  };
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), "utf8");
  console.log(`[forge] Checkpoint written (success=${success})`);
}

function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

async function runForge(): Promise<void> {
  console.log("[forge] === AUTOBIOGRAPHICAL FORGE STARTED ===");
  ensureDir(IDENTITY_DIR);
  ensureDir(BACKUP_DIR);

  const backupFile = createBackup();

  const reflections = readDocTail("reflections.md", 3000);
  const learnings = readDocTail("learnings.md", 2000);
  const ideas = readDocTail("ideas.md", 2000);
  const evolution = readDocTail("evolution.md", 2000);
  const missions = readDocTail("active_missions.md", 3000);
  const revenue = gatherRevenueSnapshot();
  const voice = gatherOwnVoice(12);
  const projects = gatherProjects();
  const observations = gatherObservations(8);
  const conversations = gatherConversationLogs();
  const existingCharacter = readCharacterMd();
  const existingCore = extractCoreIdentity(existingCharacter);

  console.log(`[forge] Sources: reflections(${reflections.length}) learnings(${learnings.length}) ideas(${ideas.length}) evolution(${evolution.length}) missions(${missions.length}) voice(${voice.length}) projects(${projects.length}) obs(${observations.length}) conv(${conversations.length}) revenue[${revenue}]`);

  const sources = [
    missions && `# Active missions\n${missions}`,
    revenue && `# Revenue snapshot\n${revenue}`,
    evolution && `# Evolution state\n${evolution}`,
    voice && `# My published voice (recent posts — the new identity must sound like this)\n${voice}`,
    projects && `# What I built\n${projects}`,
    observations && `# Recent world observations\n${observations}`,
    reflections && `# Recent reflections\n${reflections}`,
    learnings && `# Recent learnings\n${learnings}`,
    ideas && `# Ideas\n${ideas}`,
  ].filter(Boolean).join("\n\n");

  try {
    console.log("[forge] Synthesizing character (LLM)...");
    const newCharacter = await withRetry(() => forgeCharacter(existingCore, sources), "character");
    console.log("[forge] Synthesizing monologue (LLM)...");
    const newMonologue = await withRetry(() => forgeMonologue(sources, conversations), "monologue");

    writeFileSync(CHARACTER_FILE_IDENTITY, newCharacter, "utf8");
    writeFileSync(CHARACTER_FILE_LIVE, newCharacter, "utf8");
    console.log(`[forge] Character written (${newCharacter.length} chars)`);

    writeFileSync(MONOLOGUE_FILE_IDENTITY, newMonologue, "utf8");
    writeFileSync(MONOLOGUE_FILE_LIVE, newMonologue, "utf8");
    console.log(`[forge] Monologue written (${newMonologue.length} chars)`);

    writeCheckpoint(simpleHash(newCharacter), simpleHash(newMonologue), backupFile, true);
    console.log("[forge] === AUTOBIOGRAPHICAL FORGE COMPLETE ===");
    process.exit(0);
  } catch (err: any) {
    console.error(`[forge] LLM synthesis failed — keeping previous identity: ${err.message}`);
    writeCheckpoint(
      simpleHash(existingCharacter),
      simpleHash(readDocTail("inner_monologue.md", 100000) || ""),
      backupFile,
      false
    );
    process.exit(1);
  } finally {
    pruneOldBackups();
  }
}

runForge().catch(err => {
  console.error("[forge] Forge failed:", err);
  process.exit(1);
});
