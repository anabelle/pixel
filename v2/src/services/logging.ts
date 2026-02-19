/**
 * Logging — Structured file sink for self-inspection
 *
 * Intercepts console.log/console.error and tees output to a ring-buffer
 * log file at /app/data/agent.log. This gives Pixel the ability to read
 * its own stdout via the read_logs tool.
 *
 * Ring buffer: keeps last MAX_LINES lines, rotates when exceeded.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync } from "fs";
import { dirname } from "path";

const LOG_PATH = process.env.AGENT_LOG_PATH ?? "./data/agent.log";
const MAX_LINES = 5000;
const MAX_BYTES = 2 * 1024 * 1024; // 2MB hard cap

let initialized = false;

function ensureLogDir(): void {
  const dir = dirname(LOG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function formatLogLine(level: string, args: unknown[]): string {
  const ts = new Date().toISOString();
  const msg = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
  return `${ts} [${level}] ${msg}\n`;
}

function appendToLog(line: string): void {
  try {
    appendFileSync(LOG_PATH, line);

    // Check size and rotate if needed
    try {
      const stat = statSync(LOG_PATH);
      if (stat.size > MAX_BYTES) {
        rotateLog();
      }
    } catch {}
  } catch {
    // If we can't write logs, don't crash the agent
  }
}

function rotateLog(): void {
  try {
    const content = readFileSync(LOG_PATH, "utf-8");
    const lines = content.split("\n");
    // Keep last MAX_LINES/2 lines after rotation
    const keep = lines.slice(-Math.floor(MAX_LINES / 2));
    writeFileSync(LOG_PATH, keep.join("\n"));
  } catch {}
}

/**
 * Read the tail of the agent log file.
 * Returns the last `count` lines.
 */
export function readAgentLog(count: number = 100): { lines: string[]; totalLines: number } {
  if (!existsSync(LOG_PATH)) {
    return { lines: [], totalLines: 0 };
  }

  try {
    const content = readFileSync(LOG_PATH, "utf-8");
    const allLines = content.split("\n").filter(Boolean);
    const tail = allLines.slice(-Math.min(count, 500));
    return { lines: tail, totalLines: allLines.length };
  } catch {
    return { lines: [], totalLines: 0 };
  }
}

/**
 * Search the agent log for lines matching a pattern.
 */
export function searchAgentLog(pattern: string, count: number = 50): string[] {
  if (!existsSync(LOG_PATH)) return [];

  try {
    const content = readFileSync(LOG_PATH, "utf-8");
    const allLines = content.split("\n").filter(Boolean);
    const regex = new RegExp(pattern, "i");
    const matches = allLines.filter((line) => regex.test(line));
    return matches.slice(-Math.min(count, 200));
  } catch {
    return [];
  }
}

/**
 * Initialize the log sink. Intercepts console.log and console.error
 * to tee output to the agent log file.
 *
 * Call once at boot, before anything else logs.
 */
export function initLogging(): void {
  if (initialized) return;
  initialized = true;

  ensureLogDir();

  // Write a boot marker
  const bootLine = formatLogLine("BOOT", [`Agent log initialized — max ${MAX_LINES} lines, ${MAX_BYTES / 1024}KB cap`]);
  appendToLog(bootLine);

  // Intercept console.log
  const originalLog = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    originalLog(...args);
    appendToLog(formatLogLine("LOG", args));
  };

  // Intercept console.error
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalError(...args);
    appendToLog(formatLogLine("ERR", args));
  };

  // Intercept console.warn
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    appendToLog(formatLogLine("WARN", args));
  };
}
