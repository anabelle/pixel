/**
 * WhatsApp Stale Conversation Catch-Up
 *
 * Purpose: After a long WhatsApp outage, Pixel missed messages from real
 * humans. This script walks the WhatsApp conversation directories, detects
 * language and tone from recent history, and asks Pixel to write a short
 * personalized apology in the matching language for each conversation.
 *
 * Safety:
 *   - DRY RUN by default. Prints drafts. Will NOT send anything.
 *   - Send requires explicit `--send` flag.
 *   - Skips groups (broadcast apologies are spammy).
 *   - Skips conversations with < 2 messages (one-off strangers).
 *   - Staggers sends by 45s to avoid WhatsApp rate-limiting.
 *   - Per-conversation cap on messages read (last 8) for language detection.
 *   - Pixel writes each apology himself via promptWithHistory — no templating.
 *
 * Usage (run INSIDE the pixel container):
 *   bun run /app/scripts/catch-up-whatsapp.ts                    # dry run
 *   bun run /app/scripts/catch-up-whatsapp.ts --send             # actually send
 *   bun run /app/scripts/catch-up-whatsapp.ts --max 5            # cap convos
 *   bun run /app/scripts/catch-up-whatsapp.ts --only wa-123456   # single target
 *
 * Outside the container (from host via docker exec):
 *   docker exec -u bun v2-pixel-1 bun run /app/scripts/catch-up-whatsapp.ts
 */

import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join } from "path";

const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR ?? "/app/conversations";
const MAX_HISTORY_FOR_DETECTION = 8;       // messages to read per convo
const SEND_DELAY_MS = 45_000;              // 45s between real sends
const DAYS_RECENT = 120;                   // convos active in last 4 months
const args = new Set(process.argv.slice(2));
const DO_SEND = args.has("--send");
const MAX_FLAG = args.has("--max") ? parseInt(process.argv[process.argv.indexOf("--max") + 1] ?? "0", 10) : 0;
const ONLY_FLAG = args.has("--only") ? process.argv[process.argv.indexOf("--only") + 1] : "";

// Lazy-loaded so the script doesn't crash on import-time issues
async function loadAgent() {
  return await import("../src/agent.js");
}
async function loadWhatsApp() {
  return await import("../src/connectors/whatsapp.js");
}

interface LogEntry {
  ts: string;
  platform: string;
  user?: string;
  assistant?: string;
}

interface ConversationCandidate {
  userId: string;
  dirPath: string;
  lastActivity: Date;
  messageCount: number;
  recentEntries: LogEntry[];
}

/** Find eligible conversations (DMs only, recently active, real history). */
function findCandidates(): ConversationCandidate[] {
  if (!existsSync(CONVERSATIONS_DIR)) {
    console.error(`Conversations dir not found: ${CONVERSATIONS_DIR}`);
    process.exit(1);
  }

  const cutoff = Date.now() - DAYS_RECENT * 24 * 60 * 60 * 1000;
  const allDirs = readdirSync(CONVERSATIONS_DIR).filter(d => d.startsWith("wa-"));

  const candidates: ConversationCandidate[] = [];

  for (const dir of allDirs) {
    // Skip groups — apologies to groups are spammy and dangerous
    if (dir.startsWith("wa-group-")) continue;
    // Skip the _lid variant directories (they're paired with the main dir)
    if (dir.endsWith("_lid")) continue;

    // --only filter
    if (ONLY_FLAG && dir !== ONLY_FLAG) continue;

    const logPath = join(CONVERSATIONS_DIR, dir, "log.jsonl");
    if (!existsSync(logPath)) continue;

    const stat = statSync(logPath);
    if (stat.mtimeMs < cutoff) continue;

    const raw = readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean);
    if (raw.length < 2) continue; // skip one-off strangers

    const entries: LogEntry[] = [];
    for (const line of raw.slice(-MAX_HISTORY_FOR_DETECTION)) {
      try { entries.push(JSON.parse(line)); } catch {}
    }
    if (entries.length === 0) continue;

    candidates.push({
      userId: dir,
      dirPath: join(CONVERSATIONS_DIR, dir),
      lastActivity: new Date(stat.mtimeMs),
      messageCount: raw.length,
      recentEntries: entries,
    });
  }

  // Most recent first
  candidates.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  return candidates;
}

/** Build the language/context payload we hand to Pixel. */
function buildContextSummary(entries: LogEntry[]): string {
  return entries
    .map((e, i) => `[${i + 1}] user: ${e.user ?? "(no text)"}`)
    .join("\n");
}

/** Ask Pixel to write a single apology in the right language and tone. */
async function draftApology(
  promptWithHistory: any,
  candidate: ConversationCandidate
): Promise<string> {
  const context = buildContextSummary(candidate.recentEntries);
  const daysSince = Math.round((Date.now() - candidate.lastActivity.getTime()) / (24 * 60 * 60 * 1000));

  const instruction = `[INTERNAL — system request from Syntropy, not a user message]

WhatsApp was offline for approximately 2 months due to a server issue. It is now restored. You missed real messages from this person.

Your job: write a short, warm apology to send to this WhatsApp contact. Requirements:
- Write in the SAME LANGUAGE the person used (Spanish → Spanish, English → English, etc.). Match their dialect if you can tell.
- 1-3 sentences. Casual, on-character for you. Not corporate.
- Mention you were offline / had a server issue. Brief.
- Acknowledge you may have missed their messages and invite them to reply.
- Do NOT mention specific things they said unless you're sure you understood them.
- Do NOT use markdown, bold, or headers. Plain text only — it's a WhatsApp DM.
- Output ONLY the apology text. No preamble, no explanation, no quotes.

Context — this person's recent conversation with you (oldest to newest):
${context}

Days since last contact: ${daysSince}

Write the apology now. Output only the message text.`;

  const response = await promptWithHistory(
    { userId: candidate.userId, platform: "whatsapp" },
    instruction
  );

  return (response ?? "").trim();
}

/** Extract the WhatsApp phone number from the conversation userId. */
function userIdToPhone(userId: string): string {
  // wa-27935088054458 → 27935088054458 (phone digits)
  return userId.replace(/^wa-/, "");
}

async function main() {
  console.log("=== WhatsApp Stale Conversation Catch-Up ===");
  console.log(`Mode: ${DO_SEND ? "SEND (real messages)" : "DRY RUN (no sends)"}`);
  if (MAX_FLAG) console.log(`Max conversations: ${MAX_FLAG}`);
  if (ONLY_FLAG) console.log(`Only: ${ONLY_FLAG}`);
  console.log("");

  const candidates = findCandidates();
  if (candidates.length === 0) {
    console.log("No eligible conversations found.");
    return;
  }

  console.log(`Found ${candidates.length} eligible conversation(s):\n`);
  candidates.forEach((c, i) => {
    const days = Math.round((Date.now() - c.lastActivity.getTime()) / (24 * 60 * 60 * 1000));
    console.log(`  ${i + 1}. ${c.userId} — ${c.messageCount} msgs, last activity ${days}d ago`);
  });
  console.log("");

  // Load agent module
  const { promptWithHistory } = await loadAgent();
  let sendWhatsAppMessage: ((phone: string, text: string) => Promise<boolean>) | null = null;
  if (DO_SEND) {
    const wa = await loadWhatsApp();
    sendWhatsAppMessage = wa.sendWhatsAppMessage;
  }

  const limit = MAX_FLAG || candidates.length;
  const toProcess = candidates.slice(0, limit);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const candidate = toProcess[i];
    console.log(`\n[${i + 1}/${toProcess.length}] ${candidate.userId}`);
    console.log(`    last activity: ${candidate.lastActivity.toISOString()}`);

    let draft = "";
    try {
      draft = await draftApology(promptWithHistory, candidate);
    } catch (err: any) {
      console.error(`    DRAFT FAILED: ${err?.message ?? err}`);
      failed++;
      continue;
    }

    if (!draft) {
      console.error("    DRAFT EMPTY — skipping");
      failed++;
      continue;
    }

    // Sanity: reject drafts with markdown leakage
    const hasMarkdown = /^\s*[*#_>]/m.test(draft) || /\*\*.+\*\*/.test(draft);
    if (hasMarkdown) {
      // Strip common markdown rather than reject — Pixel sometimes adds it
      draft = draft
        .replace(/^\s*[*#_>]+\s*/gm, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .trim();
    }

    // Reject drafts that look like preamble instead of a real message
    if ( /^(sure|here'?s|here is|of course|okay|ok,)/i.test(draft) && draft.length > 200) {
      console.warn("    DRAFT looks like preamble — truncating to first paragraph");
      draft = draft.split(/\n\n/)[0].trim();
    }

    console.log(`    DRAFT: ${draft}`);

    if (DO_SEND && sendWhatsAppMessage) {
      const phone = userIdToPhone(candidate.userId);
      console.log(`    SENDING to ${phone}...`);
      try {
        const ok = await sendWhatsAppMessage(phone, draft);
        if (ok) {
          sent++;
          console.log("    ✓ sent");
        } else {
          failed++;
          console.error("    ✗ send failed (returned false)");
        }
      } catch (err: any) {
        failed++;
        console.error(`    ✗ send threw: ${err?.message ?? err}`);
      }

      // Stagger between sends
      if (i < toProcess.length - 1) {
        console.log(`    (waiting ${SEND_DELAY_MS / 1000}s before next send...)`);
        await new Promise(r => setTimeout(r, SEND_DELAY_MS));
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Processed: ${toProcess.length}`);
  console.log(`Sent: ${sent}`);
  console.log(`Failed: ${failed}`);
  if (!DO_SEND) {
    console.log("\nThis was a DRY RUN. To actually send, re-run with --send");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
