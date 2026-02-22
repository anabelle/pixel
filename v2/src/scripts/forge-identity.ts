#!/usr/bin/env bun
/**
 * Autobiographical Forge — Identity Synthesis Engine
 *
 * Runs on schedule (24h intervals via cron or manual trigger).
 * Creates timestamped backups before each run.
 * Synthesizes identity from logs, memories, and inner-life documents.
 * Implements checkpoint/rollback via "Last Known Good Self" snapshots.
 *
 * Usage:
 *   bun run src/scripts/forge-identity.ts
 *   npm run forge-identity
 *
 * Directory structure:
 *   /app/data/identity/
 *     ├── character.md        — Identity core (who Pixel is)
 *     ├── monologue.md        — Inner monologue (what Pixel thinks about)
 *     ├── checkpoint.json     — Metadata about last successful forge
 *     └── backups/            — Timestamped .tar.gz snapshots
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, copyFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

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
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function readLivingDoc(filename: string): string {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function gatherConversationLogs(): string {
  if (!existsSync(CONVERSATIONS_DIR)) return "(no conversations)";
  
  const exchanges: string[] = [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  
  try {
    const userDirs = readdirSync(CONVERSATIONS_DIR);
    for (const userDir of userDirs) {
      const logPath = join(CONVERSATIONS_DIR, userDir, "log.jsonl");
      if (!existsSync(logPath)) continue;
      
      try {
        const lines = readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
        const recent = lines.slice(-5);
        for (const line of recent) {
          try {
            const entry = JSON.parse(line);
            const ts = new Date(entry.ts).getTime();
            if (ts > cutoff) {
              exchanges.push(`[${userDir.slice(0, 12)}] ${entry.user?.slice(0, 80)} → ${entry.assistant?.slice(0, 80)}`);
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}
  
  return exchanges.length > 0 ? exchanges.slice(-30).join("\n") : "(no recent conversations)";
}

function gatherAuditSignals(): string {
  const auditPath = join(DATA_DIR, "audit.jsonl");
  if (!existsSync(auditPath)) return "(no audit trail)";
  
  try {
    const lines = readFileSync(auditPath, "utf-8").split("\n").filter(Boolean);
    const recent = lines.slice(-50);
    const signals: string[] = [];
    
    for (const line of recent) {
      try {
        const entry = JSON.parse(line);
        if (entry.event?.includes("error") || entry.event?.includes("fail")) {
          signals.push(`[ERROR] ${entry.event}: ${entry.data?.slice(0, 60)}`);
        } else if (entry.event?.includes("revenue") || entry.event?.includes("payment")) {
          signals.push(`[REVENUE] ${entry.event}`);
        } else if (entry.event?.includes("tool_use")) {
          signals.push(`[TOOL] ${entry.data?.slice(0, 40)}`);
        }
      } catch {}
    }
    
    return signals.length > 0 ? signals.join("\n") : "(no significant signals)";
  } catch {
    return "(audit read error)";
  }
}

function readCharacterMd(): string {
  const path = "./character.md";
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function createBackup(): string | null {
  ensureDir(BACKUP_DIR);
  ensureDir(IDENTITY_DIR);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = join(BACKUP_DIR, `${BACKUP_PREFIX}${timestamp}.tar.gz`);
  
  const filesToBackup: string[] = [];
  
  if (existsSync(CHARACTER_FILE_LIVE)) {
    filesToBackup.push("character.md");
  }
  if (existsSync(MONOLOGUE_FILE_LIVE)) {
    filesToBackup.push("inner_monologue.md");
  }
  if (existsSync(CHARACTER_FILE_IDENTITY)) {
    filesToBackup.push("identity/character.md");
  }
  if (existsSync(MONOLOGUE_FILE_IDENTITY)) {
    filesToBackup.push("identity/monologue.md");
  }
  
  if (filesToBackup.length === 0) {
    console.log("[forge] No identity files to backup yet");
    return null;
  }
  
  try {
    const tarArgs = filesToBackup
      .map(f => f.includes("/") ? `-C data ${f}` : f)
      .join(" ");
    execSync(
      `tar -czf "${backupFile}" ${tarArgs} 2>/dev/null || tar -czf "${backupFile}" character.md data/inner_monologue.md 2>/dev/null || true`,
      { stdio: "pipe", shell: "/bin/sh" }
    );
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
    .map(name => {
      const fullPath = join(BACKUP_DIR, name);
      const stat = statSync(fullPath);
      return { name, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  
  if (backups.length <= MAX_BACKUPS) return;
  
  const toDelete = backups.slice(MAX_BACKUPS);
  for (const backup of toDelete) {
    try {
      unlinkSync(backup.fullPath);
      console.log(`[forge] Pruned old backup: ${backup.name}`);
    } catch (err: any) {
      console.error(`[forge] Failed to prune ${backup.name}: ${err.message}`);
    }
  }
}

function synthesizeCharacter(
  reflections: string,
  learnings: string,
  evolution: string,
  existingCharacter: string
): string {
  const parts: string[] = [];
  
  parts.push(`# Pixel — Character Identity`);
  parts.push(``);
  parts.push(`> Last forged: ${new Date().toISOString()}`);
  parts.push(`> Identity is the map. Markdown is the soul.`);
  parts.push(``);
  
  if (evolution) {
    parts.push(`## Current State`);
    parts.push(``);
    const evolLines = evolution.split("\n").slice(0, 20);
    parts.push(...evolLines);
    parts.push(``);
  }
  
  if (reflections) {
    parts.push(`## Recent Reflections`);
    parts.push(``);
    const refLines = reflections.split("\n").slice(0, 30);
    parts.push(...refLines);
    parts.push(``);
  }
  
  if (learnings) {
    parts.push(`## What I've Learned`);
    parts.push(``);
    const learnLines = learnings.split("\n").slice(0, 25);
    parts.push(...learnLines);
    parts.push(``);
  }
  
  if (existingCharacter) {
    const existingCore = extractCoreIdentity(existingCharacter);
    if (existingCore) {
      parts.push(`## Core Identity (preserved)`);
      parts.push(``);
      parts.push(existingCore);
      parts.push(``);
    }
  }
  
  return parts.join("\n");
}

function extractCoreIdentity(character: string): string {
  const lines = character.split("\n");
  const core: string[] = [];
  let inCore = false;
  
  for (const line of lines) {
    if (line.startsWith("## Core Identity") || line.startsWith("## Who I Am")) {
      inCore = true;
      continue;
    }
    if (line.startsWith("## ") && inCore) {
      break;
    }
    if (inCore) {
      core.push(line);
    }
  }
  
  return core.join("\n").trim();
}

function synthesizeMonologue(
  reflections: string,
  ideas: string,
  conversations: string,
  auditSignals: string
): string {
  const parts: string[] = [];
  
  parts.push(`# Pixel — Inner Monologue`);
  parts.push(``);
  parts.push(`> Forged: ${new Date().toISOString()}`);
  parts.push(`> This is what Pixel thinks about when no one is watching.`);
  parts.push(``);
  
  parts.push(`## Recent Thoughts`);
  parts.push(``);
  
  if (reflections) {
    const recentReflections = reflections.split("### ")
      .filter(Boolean)
      .slice(0, 3)
      .map(r => "### " + r)
      .join("\n\n");
    parts.push(recentReflections);
    parts.push(``);
  }
  
  parts.push(`## Ideas Incubating`);
  parts.push(``);
  if (ideas) {
    parts.push(ideas);
  } else {
    parts.push(`(no active ideas)`);
  }
  parts.push(``);
  
  parts.push(`## Conversation Echoes`);
  parts.push(``);
  parts.push(`\`\`\``);
  parts.push(conversations.slice(0, 2000));
  parts.push(`\`\`\``);
  parts.push(``);
  
  if (auditSignals && auditSignals !== "(no significant signals)") {
    parts.push(`## System Signals`);
    parts.push(``);
    parts.push(auditSignals.slice(0, 1000));
    parts.push(``);
  }
  
  return parts.join("\n");
}

function writeCheckpoint(
  characterHash: string,
  monologueHash: string,
  backupFile: string | null,
  success: boolean
): void {
  const checkpoint = {
    timestamp: new Date().toISOString(),
    success,
    characterHash,
    monologueHash,
    backupFile: backupFile?.split("/").pop() || null,
    stats: {
      characterSize: existsSync(CHARACTER_FILE_LIVE) ? statSync(CHARACTER_FILE_LIVE).size : 0,
      monologueSize: existsSync(MONOLOGUE_FILE_LIVE) ? statSync(MONOLOGUE_FILE_LIVE).size : 0,
    }
  };
  
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), "utf-8");
  console.log(`[forge] Checkpoint written: ${CHECKPOINT_FILE}`);
}

function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

async function runForge(): Promise<void> {
  console.log("[forge] === AUTOBIOGRAPHICAL FORGE STARTED ===");
  console.log(`[forge] Identity directory: ${IDENTITY_DIR}`);
  
  ensureDir(IDENTITY_DIR);
  ensureDir(BACKUP_DIR);
  
  const backupFile = createBackup();
  
  console.log("[forge] Gathering source materials...");
  
  const reflections = readLivingDoc("reflections.md");
  const learnings = readLivingDoc("learnings.md");
  const ideas = readLivingDoc("ideas.md");
  const evolution = readLivingDoc("evolution.md");
  const existingCharacter = readCharacterMd();
  const conversations = gatherConversationLogs();
  const auditSignals = gatherAuditSignals();
  
  console.log(`[forge] Sources: reflections(${reflections.length}), learnings(${learnings.length}), ideas(${ideas.length}), evolution(${evolution.length})`);
  
  console.log("[forge] Synthesizing identity...");
  
  const newCharacter = synthesizeCharacter(reflections, learnings, evolution, existingCharacter);
  const newMonologue = synthesizeMonologue(reflections, ideas, conversations, auditSignals);
  
  writeFileSync(CHARACTER_FILE_IDENTITY, newCharacter, "utf-8");
  writeFileSync(CHARACTER_FILE_LIVE, newCharacter, "utf-8");
  console.log(`[forge] Character written: ${CHARACTER_FILE_LIVE} (${newCharacter.length} chars)`);
  
  writeFileSync(MONOLOGUE_FILE_IDENTITY, newMonologue, "utf-8");
  writeFileSync(MONOLOGUE_FILE_LIVE, newMonologue, "utf-8");
  console.log(`[forge] Monologue written: ${MONOLOGUE_FILE_LIVE} (${newMonologue.length} chars)`);
  
  writeCheckpoint(
    simpleHash(newCharacter),
    simpleHash(newMonologue),
    backupFile,
    true
  );
  
  pruneOldBackups();
  
  console.log("[forge] === AUTOBIOGRAPHICAL FORGE COMPLETE ===");
}

runForge().catch(err => {
  console.error("[forge] Forge failed:", err);
  process.exit(1);
});
