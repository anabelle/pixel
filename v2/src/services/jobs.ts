import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync, unlinkSync, rmdirSync } from "fs";
import { backgroundLlmCall } from "../agent.js";
import { pixelTools } from "./tools.js";
import { audit } from "./audit.js";
import { sendTelegramMessage } from "../connectors/telegram.js";
import { sendWhatsAppMessage } from "../connectors/whatsapp.js";
import { sendNostrDm } from "../connectors/nostr.js";
import { join } from "path";

// Late-bound reference to promptWithHistory to avoid circular import
// (agent.ts imports from jobs.ts via tools, jobs.ts needs agent.ts to wake Pixel up)
let _promptWithHistory: ((options: any, message: string) => Promise<string>) | null = null;

async function getPromptWithHistory() {
  if (!_promptWithHistory) {
    const mod = await import("../agent.js");
    _promptWithHistory = mod.promptWithHistory;
  }
  return _promptWithHistory;
}

type JobStatus = "pending" | "running" | "completed" | "failed";

export type JobEntry = {
  id: string;
  prompt: string;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  toolsAllowed?: string[];
  output?: string;
  error?: string;
  retries?: number;
  // Callback fields for delivering results to users
  callbackPlatform?: string;
  callbackChatId?: string;
  callbackUserId?: string;
  callbackLabel?: string;
  // Internal mode: for Pixel's autonomous learning (no user notification)
  internal?: boolean;
};

export interface JobCallback {
  platform: string;
  chatId: string;
  userId: string;
  label?: string;
  internal?: boolean;
}

const JOBS_PATH = "/app/data/jobs.json";
const JOB_LOG_PATH = "/app/data/jobs.jsonl";
const JOB_REPORT_PATH = "/app/data/jobs-report.md";
const DATA_DIR = "/app/data";
const WHATSAPP_MEDIA_DIR = process.env.WHATSAPP_MEDIA_DIR ?? "/app/data/whatsapp-media";
const WHATSAPP_MEDIA_RETENTION_DAYS = Number.parseInt(process.env.WHATSAPP_MEDIA_RETENTION_DAYS ?? "30", 10);
const WHATSAPP_MEDIA_RETENTION_MS = WHATSAPP_MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const WHATSAPP_MEDIA_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastWhatsAppMediaCleanup = 0;

const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max per job

let running = false;
let currentJobId: string | null = null;
let jobTimer: ReturnType<typeof setTimeout> | null = null;

function loadJobs(): JobEntry[] {
  if (!existsSync(JOBS_PATH)) return [];
  try {
    const raw = readFileSync(JOBS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as JobEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: JobEntry[]): void {
  try {
    const tmp = JOBS_PATH + ".tmp";
    writeFileSync(tmp, JSON.stringify(jobs, null, 2), "utf-8");
    renameSync(tmp, JOBS_PATH);
  } catch (err: any) {
    console.error("[jobs] Failed to save jobs:", err.message);
  }
}

function logJob(entry: JobEntry): void {
  try {
    writeFileSync(JOB_LOG_PATH, JSON.stringify(entry) + "\n", { flag: "a" });
  } catch (err: any) {
    console.error("[jobs] Failed to write job log:", err.message);
  }
}

function cleanupWhatsAppMedia(): void {
  if (!existsSync(WHATSAPP_MEDIA_DIR)) return;
  const now = Date.now();
  if (now - lastWhatsAppMediaCleanup < WHATSAPP_MEDIA_CLEANUP_INTERVAL_MS) return;
  lastWhatsAppMediaCleanup = now;
  let deletedFiles = 0;
  let deletedDirs = 0;

  const pruneDir = (dir: string): boolean => {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return false;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      let stats: ReturnType<typeof statSync> | null = null;
      try {
        stats = statSync(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        const emptied = pruneDir(fullPath);
        if (emptied) {
          try {
            rmdirSync(fullPath);
            deletedDirs++;
          } catch {}
        }
        continue;
      }

      if (!stats.isFile()) continue;
      const age = now - stats.mtimeMs;
      if (age < WHATSAPP_MEDIA_RETENTION_MS) continue;

      try {
        unlinkSync(fullPath);
        deletedFiles++;
      } catch {}
    }

    try {
      return readdirSync(dir).length === 0;
    } catch {
      return false;
    }
  };

  pruneDir(WHATSAPP_MEDIA_DIR);

  if (deletedFiles > 0 || deletedDirs > 0) {
    console.log(`[jobs] WhatsApp media cleanup: removed ${deletedFiles} file(s), ${deletedDirs} dir(s) older than ${WHATSAPP_MEDIA_RETENTION_DAYS}d`);
  }
}

// ============================================================
// Inner-Life Integration — inject job results into Pixel's living memory
// ============================================================

function readInnerLifeDoc(filename: string): string {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function writeInnerLifeDoc(filename: string, content: string): void {
  const path = join(DATA_DIR, filename);
  try {
    writeFileSync(path, content, "utf-8");
    console.log(`[jobs] Updated inner-life ${filename} (${content.length} chars)`);
  } catch (err: any) {
    console.error(`[jobs] Failed to write inner-life ${filename}:`, err.message);
  }
}

function determineContentType(label: string, output: string, isInternal?: boolean): "learning" | "idea" | "reflection" | "other" {
  const lowerLabel = label.toLowerCase();
  const lowerOutput = output.toLowerCase();

  // Ideas — brainstorming, features, projects
  if (lowerLabel.includes("idea") || lowerLabel.includes("ideación") ||
      lowerLabel.includes("brainstorm") || lowerLabel.includes("proyecto") ||
      lowerLabel.includes("feature") || lowerLabel.includes("nuevo")) {
    return "idea";
  }

  // Reflections — self-audit, analysis, introspection
  if (lowerLabel.includes("reflexión") || lowerLabel.includes("reflexionar") ||
      lowerLabel.includes("análisis") || lowerLabel.includes("evaluar") ||
      lowerLabel.includes("auto-auditoría") || lowerOutput.includes("mi progreso")) {
    return "reflection";
  }

  // Learnings — research, trends, any topic investigation
  if (lowerLabel.includes("research") || lowerLabel.includes("investigación") ||
      lowerLabel.includes("tendencias") || lowerLabel.includes("trends") ||
      lowerLabel.includes("competencia") || lowerLabel.includes("competition") ||
      lowerLabel.includes("state of") || lowerLabel.includes("estado de") ||
      lowerLabel.includes("current") || lowerLabel.includes("actual") ||
      lowerLabel.includes("landscape") || lowerLabel.includes("panorama") ||
      lowerLabel.includes("solutions") || lowerLabel.includes("soluciones") ||
      lowerOutput.includes("hallazgos") || lowerOutput.includes("key findings") ||
      lowerOutput.includes("summary") || lowerOutput.includes("resumen") ||
      lowerOutput.includes("source") || lowerOutput.includes("fuente")) {
    return "learning";
  }

  // Internal jobs default to "learning" — they exist for Pixel's autonomous growth
  if (isInternal) return "learning";

  return "other";
}

function injectIntoInnerLife(job: JobEntry): void {
  if (!job.output || job.status !== "completed") return;

  const contentType = determineContentType(job.callbackLabel ?? "", job.output, job.internal);

  if (contentType === "other") {
    console.log(`[jobs] Content type unclear for job ${job.id}, skipping inner-life injection`);
    return;
  }

  const filename = `${contentType}s.md`;
  const existing = readInnerLifeDoc(filename);
  const timestamp = new Date().toISOString();
  const label = job.callbackLabel ?? "Sin etiqueta";

  const newEntry = [
    `## ${label} (${timestamp})`,
    ``,
    job.output.trim(),
    ``,
    "---",
    ``,
  ].join("\n");

  const updated = newEntry + existing;

  // Limit size (generous — models have 128K context)
  const MAX_SIZE = 8000;
  if (updated.length > MAX_SIZE) {
    const trimmed = updated.slice(0, MAX_SIZE);
    console.log(`[jobs] Trimmed ${filename} to ${MAX_SIZE} chars`);
    writeInnerLifeDoc(filename, trimmed);
  } else {
    writeInnerLifeDoc(filename, updated);
  }

  audit("tool_use", `Internal job result injected into inner-life: ${filename}`, {
    id: job.id,
    contentType,
    outputLength: job.output.length
  });
}

/**
 * Wake Pixel up with internal research results — same pattern as alarm/reminder system.
 * Routes the research findings through promptWithHistory() so Pixel processes them
 * with full context, tools, personality, and skills. Pixel can then decide to act
 * on the findings (post about them, store insights, start new research, etc.)
 */
async function wakeUpPixelWithResults(job: JobEntry): Promise<void> {
  if (!job.output || job.status !== "completed") return;

  const label = job.callbackLabel ?? "autonomous research";
  // Truncate output for the wake-up prompt (generous — GLM-4.7 has 128K context)
  const maxOutputLen = 12000;
  const outputSnippet = job.output.length > maxOutputLen
    ? job.output.slice(0, maxOutputLen) + "\n\n[... truncated, full results saved to inner-life files and jobs-report.md]"
    : job.output;

  const wakeUpPrompt = [
    `[INTERNAL RESEARCH COMPLETE — this is an internal notification, not a user message]`,
    `Your autonomous research task "${label}" has finished.`,
    `Here are the findings:`,
    ``,
    outputSnippet,
    ``,
    `The results have been saved to your inner-life files (learnings/ideas/reflections).`,
    `Process these findings. You may:`,
    `- Extract key insights worth remembering`,
    `- Decide if something is worth posting about on Nostr`,
    `- Trigger follow-up research if something is interesting`,
    `- Update your skills or knowledge if relevant`,
    `- Use notify_owner to tell Ana if something is exciting or urgent`,
    `- Use syntropy_notify to flag infrastructure/technical findings for Syntropy`,
    `- Simply acknowledge and move on if the findings aren't actionable`,
    ``,
    `Respond naturally. If nothing actionable, reply with [SILENT].`,
  ].join("\n");

  try {
    const promptFn = await getPromptWithHistory();
    const response = await promptFn(
      { userId: "pixel-self", platform: "internal", chatId: "" },
      wakeUpPrompt
    );

    // Log what Pixel decided to do
    const isSilent = response?.includes("[SILENT]");
    audit("tool_use", `Internal research wake-up delivered to Pixel (label="${label}", silent=${isSilent})`, {
      id: job.id,
      responseLength: response?.length ?? 0,
    });

    if (!isSilent && response) {
      console.log(`[jobs] Pixel reacted to internal research "${label}": ${response.slice(0, 200)}...`);
    }
  } catch (err: any) {
    // Non-fatal: the results are already in inner-life files, waking Pixel is a bonus
    console.error(`[jobs] Failed to wake Pixel with research results: ${err.message}`);
    audit("tool_use", `Failed to wake Pixel with internal research results: ${err.message}`, { id: job.id });
  }
}

function appendReport(text: string): void {
  try {
    writeFileSync(JOB_REPORT_PATH, text.trim() + "\n\n", { flag: "a" });
  } catch (err: any) {
    console.error("[jobs] Failed to write job report:", err.message);
  }
}

function allowedTools(names?: string[]) {
  if (!names || names.length === 0) return [];
  const wanted = new Set(names);
  return pixelTools.filter((t) => wanted.has(t.name));
}

export function enqueueJob(prompt: string, toolsAllowed?: string[], callback?: JobCallback): JobEntry {
  const jobs = loadJobs();
  const entry: JobEntry = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    prompt: prompt.trim(),
    status: "pending",
    createdAt: Date.now(),
    toolsAllowed,
    ...(callback?.internal && { internal: true }),
    ...(callback && !callback.internal && {
      callbackPlatform: callback.platform,
      callbackChatId: callback.chatId,
      callbackUserId: callback.userId,
      callbackLabel: callback.label,
    }),
    // Internal jobs still need the label for content classification in injectIntoInnerLife
    ...(callback?.internal && callback.label && { callbackLabel: callback.label }),
  };
  jobs.push(entry);
  saveJobs(jobs);
  logJob(entry);
  audit("tool_use", `Job queued: ${entry.id}${entry.internal ? " (internal)" : ""}`, { id: entry.id, internal: !!entry.internal });
  return entry;
}

export function getRecentJobs(limit = 10): JobEntry[] {
  if (!existsSync(JOB_LOG_PATH)) return [];
  try {
    const lines = readFileSync(JOB_LOG_PATH, "utf-8").split("\n").filter(Boolean);
    const parsed = lines.map((line) => {
      try {
        return JSON.parse(line) as JobEntry;
      } catch {
        return null;
      }
    }).filter(Boolean) as JobEntry[];
    return parsed.slice(-limit);
  } catch {
    return [];
  }
}

async function deliverJobResult(job: JobEntry): Promise<void> {
  // Internal jobs: wake Pixel up with the findings (alarm-style)
  if (job.internal) {
    if (job.status === "completed") {
      await wakeUpPixelWithResults(job);
    }
    audit("tool_use", `Internal job processed: ${job.id}`, { id: job.id });
    return;
  }

  // External jobs: route through promptWithHistory so Pixel delivers results in-character
  if (!job.callbackPlatform || !job.callbackChatId) return;

  const label = job.callbackLabel ?? "investigación";
  const output = job.status === "completed"
    ? (job.output ?? "(sin resultados)")
    : `error en la investigación: ${job.error ?? "desconocido"}`;
  // Truncate for context (generous — GLM-4.7 has 128K context)
  const maxLen = 12000;
  const truncated = output.length > maxLen
    ? output.slice(0, maxLen) + "\n\n[... resultado truncado, completo guardado en jobs-report.md]"
    : output;

  // Try to deliver via promptWithHistory so Pixel responds naturally and remembers the exchange
  let delivered = false;
  try {
    const promptFn = await getPromptWithHistory();
    const researchPrompt = [
      `[RESEARCH COMPLETE — internal, do NOT show this tag to the user]`,
      `Your background research task "${label}" has finished.`,
      `Here are the raw findings:`,
      ``,
      truncated,
      ``,
      `Deliver these results to the user in your own voice. Be concise but thorough.`,
      `Highlight the most interesting or actionable findings.`,
      `If the research failed, explain what happened briefly.`,
    ].join("\n");

    const userId = job.callbackUserId ?? `${job.callbackPlatform}-${job.callbackChatId}`;
    const naturalResponse = await promptFn(
      { userId, platform: job.callbackPlatform, chatId: job.callbackChatId },
      researchPrompt
    );

    // Strip any leaked tags
    let message = naturalResponse?.replace(/\[RESEARCH COMPLETE[^\]]*\]/gi, "").trim();
    if (!message || message.includes("[SILENT]")) {
      // Fallback to raw output if LLM produced nothing
      message = `resultados de ${label}:\n\n${truncated}`;
    }

    switch (job.callbackPlatform) {
      case "telegram":
        delivered = await sendTelegramMessage(job.callbackChatId, message);
        break;
      case "whatsapp":
        delivered = await sendWhatsAppMessage(job.callbackChatId, message);
        break;
      case "nostr":
      case "nostr-dm":
        delivered = await sendNostrDm(job.callbackChatId, message);
        break;
    }
  } catch (err: any) {
    console.error(`[jobs] promptWithHistory failed for job result delivery, falling back to raw: ${err.message}`);
  }

  // Fallback: if promptWithHistory failed, send raw output directly
  if (!delivered) {
    const rawMessage = `resultados de ${label}:\n\n${truncated}`;
    try {
      switch (job.callbackPlatform) {
        case "telegram":
          await sendTelegramMessage(job.callbackChatId, rawMessage);
          break;
        case "whatsapp":
          await sendWhatsAppMessage(job.callbackChatId, rawMessage);
          break;
        case "nostr":
        case "nostr-dm":
          await sendNostrDm(job.callbackChatId, rawMessage);
          break;
      }
    } catch (err: any) {
      audit("tool_use", `Failed to deliver job result (fallback): ${err.message}`, { id: job.id });
    }
  }

  audit("tool_use", `Job result delivered to ${job.callbackPlatform}:${job.callbackChatId} (natural=${delivered})`, { id: job.id });
}

async function runNextJob(): Promise<void> {
  if (running) return;
  const jobs = loadJobs();
  const next = jobs.find((j) => j.status === "pending");
  if (!next) return;

  running = true;
  currentJobId = next.id;
  next.status = "running";
  next.startedAt = Date.now();
  saveJobs(jobs);
  logJob(next);

  const tools = allowedTools(next.toolsAllowed);
  let output = "";

  try {
    output = await backgroundLlmCall({
      systemPrompt: "You are Pixel's autonomous job runner. Complete the job precisely. If tools are available, use them as needed. Return the final output only.",
      userPrompt: next.prompt,
      tools,
      label: "jobs",
      timeoutMs: JOB_TIMEOUT_MS,
    });
    next.status = "completed";
    next.completedAt = Date.now();
    next.output = output || "(no output)";
    saveJobs(jobs);
    logJob(next);
    appendReport(`## ${new Date().toISOString()} — ${next.id}\n${next.output}`);
    audit("tool_use", `Job completed: ${next.id}`, { id: next.id });
  } catch (err: any) {
    next.status = "failed";
    next.completedAt = Date.now();
    next.error = err.message;
    saveJobs(jobs);
    logJob(next);
    audit("tool_use", `Job failed: ${next.id}`, { id: next.id, error: err.message });
  } finally {
    running = false;
    currentJobId = null;
    // For internal jobs: inject results into Pixel's inner-life (learnings.md, ideas.md, reflections.md)
    if (next.internal && next.status === "completed") {
      injectIntoInnerLife(next);
    }
    // Deliver result to originating chat if callback was set
    await deliverJobResult(next).catch((err) =>
      console.error("[jobs] deliverJobResult error:", err.message)
    );
  }
}

function scheduleDailyJob(): void {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(12, 0, 0, 0); // daily noon UTC
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);

  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    enqueueJob(
      "Write a concise daily ecosystem report based on local signals. Use read_file to read /app/data/nostr-trends.json and /app/data/clawstr-trends.txt if available. 4-6 bullets max.",
      ["read_file"]
    );
    scheduleDailyJob();
  }, delay);
}

const MAX_JOB_RETRIES = 2;
const MAX_JOB_AGE_MS = 24 * 60 * 60 * 1000; // 24h — don't retry ancient jobs

/** Reset any jobs stuck as "running" from a previous crash/reboot.
 *  If the job is young enough and hasn't exhausted retries, re-queue it. */
function recoverStaleJobs(): void {
  const jobs = loadJobs();
  let retried = 0;
  let abandoned = 0;
  const now = Date.now();

  for (const job of jobs) {
    if (job.status !== "running") continue;

    const age = now - job.createdAt;
    const attempts = job.retries ?? 0;

    if (attempts < MAX_JOB_RETRIES && age < MAX_JOB_AGE_MS) {
      // Re-queue for another attempt
      job.status = "pending";
      job.retries = attempts + 1;
      delete job.startedAt;
      delete job.completedAt;
      delete job.error;
      retried++;
      logJob(job);
      audit("tool_use", `Re-queued stale job on boot (attempt ${job.retries}/${MAX_JOB_RETRIES}): ${job.id}`, { id: job.id });
    } else {
      // Too old or too many retries — give up
      job.status = "failed";
      job.completedAt = now;
      job.error = attempts >= MAX_JOB_RETRIES
        ? `Exhausted ${MAX_JOB_RETRIES} retries after repeated crashes`
        : `Job too old (${Math.round(age / 3600000)}h) to retry after crash`;
      abandoned++;
      logJob(job);
      audit("tool_use", `Abandoned stale job on boot: ${job.id} — ${job.error}`, { id: job.id });
    }
  }

  if (retried + abandoned > 0) {
    saveJobs(jobs);
    if (retried > 0) console.log(`[jobs] Re-queued ${retried} interrupted job(s) for retry`);
    if (abandoned > 0) console.log(`[jobs] Abandoned ${abandoned} stale job(s) (max retries or too old)`);
  }
}

/** Mark any currently running job for retry or failure (used during shutdown) */
export function markRunningJobsFailed(reason: string): void {
  const jobs = loadJobs();
  const now = Date.now();
  for (const job of jobs) {
    if (job.status !== "running") continue;
    const attempts = job.retries ?? 0;
    const age = now - job.createdAt;

    if (attempts < MAX_JOB_RETRIES && age < MAX_JOB_AGE_MS) {
      job.status = "pending";
      job.retries = attempts + 1;
      delete job.startedAt;
      delete job.completedAt;
      delete job.error;
      console.log(`[jobs] Re-queued ${job.id} for retry on next boot (attempt ${job.retries}/${MAX_JOB_RETRIES})`);
    } else {
      job.status = "failed";
      job.completedAt = now;
      job.error = reason;
    }
    logJob(job);
  }
  saveJobs(jobs);
  running = false;
  currentJobId = null;
}

export function stopJobs(): void {
  if (jobTimer) {
    clearTimeout(jobTimer);
    jobTimer = null;
  }
}

export function startJobs(): void {
  if (jobTimer) return;
  recoverStaleJobs();
  cleanupWhatsAppMedia();
  scheduleDailyJob();
  const tick = async () => {
    await runNextJob();
    cleanupWhatsAppMedia();
    jobTimer = setTimeout(tick, 60_000);
  };
  jobTimer = setTimeout(tick, 20_000);
}
