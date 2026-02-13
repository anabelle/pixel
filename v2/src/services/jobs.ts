import { existsSync, readFileSync, writeFileSync } from "fs";
import { Agent } from "@mariozechner/pi-agent-core";
import { getSimpleModel, extractText } from "../agent.js";
import { pixelTools } from "./tools.js";
import { audit } from "./audit.js";

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
};

const JOBS_PATH = "/app/data/jobs.json";
const JOB_LOG_PATH = "/app/data/jobs.jsonl";
const JOB_REPORT_PATH = "/app/data/jobs-report.md";

let running = false;
let jobTimer: ReturnType<typeof setTimeout> | null = null;

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
    writeFileSync(JOBS_PATH, JSON.stringify(jobs, null, 2), "utf-8");
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

export function enqueueJob(prompt: string, toolsAllowed?: string[]): JobEntry {
  const jobs = loadJobs();
  const entry: JobEntry = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    prompt: prompt.trim(),
    status: "pending",
    createdAt: Date.now(),
    toolsAllowed,
  };
  jobs.push(entry);
  saveJobs(jobs);
  logJob(entry);
  audit("tool_use", `Job queued: ${entry.id}`, { id: entry.id });
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

async function runNextJob(): Promise<void> {
  if (running) return;
  const jobs = loadJobs();
  const next = jobs.find((j) => j.status === "pending");
  if (!next) return;

  running = true;
  next.status = "running";
  next.startedAt = Date.now();
  saveJobs(jobs);
  logJob(next);

  const tools = allowedTools(next.toolsAllowed);
  let output = "";
  let usedTools: string[] = [];

  const agent = new Agent({
    initialState: {
      systemPrompt: "You are Pixel's autonomous job runner. Complete the job precisely. If tools are available, use them as needed. Return the final output only.",
      model: getSimpleModel(),
      thinkingLevel: "off",
      tools,
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  agent.subscribe((event: any) => {
    if (event.type === "tool_execution_start" && event.tool?.name) {
      usedTools.push(event.tool.name);
    }
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const text = extractText(event.message);
      if (text) output = text.trim();
    }
  });

  try {
    await agent.prompt(next.prompt);
    next.status = "completed";
    next.completedAt = Date.now();
    next.output = output || "(no output)";
    saveJobs(jobs);
    logJob(next);
    appendReport(`## ${new Date().toISOString()} — ${next.id}\n${next.output}`);
    audit("tool_use", `Job completed: ${next.id}`, { id: next.id, tools: usedTools });
  } catch (err: any) {
    next.status = "failed";
    next.completedAt = Date.now();
    next.error = err.message;
    saveJobs(jobs);
    logJob(next);
    audit("tool_use", `Job failed: ${next.id}`, { id: next.id, error: err.message });
  } finally {
    running = false;
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

export function startJobs(): void {
  if (jobTimer) return;
  scheduleDailyJob();
  const tick = async () => {
    await runNextJob();
    jobTimer = setTimeout(tick, 60_000);
  };
  jobTimer = setTimeout(tick, 20_000);
}
