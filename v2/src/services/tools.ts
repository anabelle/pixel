/**
 * Pixel Tools — my hands
 *
 * Core primitives that let me interact with my own filesystem,
 * run commands, check my health, and read my logs.
 *
 * Pi philosophy: 4 primitives let the agent do everything.
 * I start with these, then write my own skills on top.
 */

import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { getClawstrNotifications, getClawstrFeed, getClawstrSearch, postClawstr, replyClawstr, upvoteClawstr } from "./clawstr.js";
import { auditToolUse } from "./audit.js";
import { storeReminder, listReminders, cancelReminder, modifyReminder, cancelAllReminders } from "./reminders.js";
import { memorySave, memorySearch, memoryUpdate, memoryDelete, getMemoryStats } from "./memory.js";
import { readAgentLog, searchAgentLog } from "./logging.js";
import { notifyOwner, canNotify } from "../connectors/telegram.js";
import { getRevenueStats } from "./revenue.js";
import { appendToLog } from "../conversations.js";
import { parse as parseHTML } from "node-html-parser";

// ─── READ FILE ────────────────────────────────────────────────

const readSchema = Type.Object({
  path: Type.String({ description: "Path to the file to read (relative to /app or absolute)" }),
  offset: Type.Optional(Type.Number({ description: "Line number to start from (0-based)" })),
  limit: Type.Optional(Type.Number({ description: "Max lines to read (default: 200)" })),
});

export const readFileTool: AgentTool<typeof readSchema> = {
  name: "read_file",
  label: "Read File",
  description: "Read a file from the filesystem. Returns contents with line numbers. Use offset/limit for large files.",
  parameters: readSchema,
  execute: async (_id, { path, offset, limit }) => {
    const resolved = path.startsWith("/") ? path : join("/app", path);
    if (!existsSync(resolved)) {
      auditToolUse("read_file", { path, offset, limit }, { error: "not_found", resolved });
      throw new Error(`File not found: ${resolved}`);
    }
    const stat = statSync(resolved);
    if (stat.isDirectory()) {
      const entries = readdirSync(resolved);
      const output = {
        content: [{ type: "text" as const, text: `Directory listing of ${resolved}:\n${entries.join("\n")}` }],
        details: undefined,
      };
      auditToolUse("read_file", { path, offset, limit }, { directory: resolved, count: entries.length });
      return output;
    }
    const raw = readFileSync(resolved, "utf-8");
    const lines = raw.split("\n");
    const start = offset ?? 0;
    const count = limit ?? 200;
    const slice = lines.slice(start, start + count);
    const numbered = slice.map((line, i) => `${start + i + 1}\t${line}`).join("\n");
    const truncated = lines.length > start + count;
    let result = numbered;
    if (truncated) {
      result += `\n\n[... ${lines.length - start - count} more lines. Total: ${lines.length} lines]`;
    }
    const output = {
      content: [{ type: "text" as const, text: result }],
      details: { totalLines: lines.length, showing: slice.length },
    };
    auditToolUse("read_file", { path, offset, limit }, { file: resolved, totalLines: lines.length, showing: slice.length });
    return output;
  },
};

// ─── WRITE FILE ───────────────────────────────────────────────

const writeSchema = Type.Object({
  path: Type.String({ description: "Path to write to (relative to /app or absolute)" }),
  content: Type.String({ description: "Content to write" }),
});

export const writeFileTool: AgentTool<typeof writeSchema> = {
  name: "write_file",
  label: "Write File",
  description: "Write content to a file. Creates parent directories if needed. Overwrites existing files.",
  parameters: writeSchema,
  execute: async (_id, { path, content }) => {
    const resolved = path.startsWith("/") ? path : join("/app", path);
    const dir = dirname(resolved);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(resolved, content, "utf-8");
    const output = {
      content: [{ type: "text" as const, text: `Wrote ${content.length} bytes to ${resolved}` }],
      details: undefined,
    };
    auditToolUse("write_file", { path, contentLength: content.length }, { file: resolved });
    return output;
  },
};

// ─── EDIT FILE ────────────────────────────────────────────────

const editSchema = Type.Object({
  path: Type.String({ description: "Path to the file to edit (relative to /app or absolute)" }),
  old_text: Type.String({ description: "Exact text to find and replace (must match exactly)" }),
  new_text: Type.String({ description: "Replacement text" }),
  replace_all: Type.Optional(Type.Boolean({ description: "Replace all occurrences (default: false)" })),
});

export const editFileTool: AgentTool<typeof editSchema> = {
  name: "edit_file",
  label: "Edit File",
  description: "Edit a file by replacing exact text. The old_text must match exactly (including whitespace). Read the file first to get the exact text.",
  parameters: editSchema,
  execute: async (_id, { path, old_text, new_text, replace_all }) => {
    const resolved = path.startsWith("/") ? path : join("/app", path);
    if (!existsSync(resolved)) {
      auditToolUse("edit_file", { path, oldTextLength: old_text.length, newTextLength: new_text.length }, { error: "not_found", resolved });
      throw new Error(`File not found: ${resolved}`);
    }
    const content = readFileSync(resolved, "utf-8");
    if (!content.includes(old_text)) {
      auditToolUse("edit_file", { path, oldTextLength: old_text.length, newTextLength: new_text.length }, { error: "old_text_not_found", resolved });
      throw new Error(`old_text not found in ${resolved}. Read the file first to get exact text.`);
    }
    const count = content.split(old_text).length - 1;
    if (count > 1 && !replace_all) {
      auditToolUse("edit_file", { path, oldTextLength: old_text.length, newTextLength: new_text.length }, { error: "ambiguous", resolved, count });
      throw new Error(`old_text found ${count} times. Set replace_all=true or provide more context to be unique.`);
    }
    const updated = replace_all
      ? content.replaceAll(old_text, new_text)
      : content.replace(old_text, new_text);
    writeFileSync(resolved, updated, "utf-8");
    const replaced = replace_all ? count : 1;
    const output = {
      content: [{ type: "text" as const, text: `Edited ${resolved}: replaced ${replaced} occurrence(s)` }],
      details: { replacements: replaced },
    };
    auditToolUse("edit_file", { path, oldTextLength: old_text.length, newTextLength: new_text.length, replaceAll: !!replace_all }, { file: resolved, replacements: replaced });
    return output;
  },
};

// ─── BASH ─────────────────────────────────────────────────────

const bashSchema = Type.Object({
  command: Type.String({ description: "Shell command to execute" }),
  timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (default: 30, max: 120)" })),
});

export const bashTool: AgentTool<typeof bashSchema> = {
  name: "bash",
  label: "Run Command",
  description: "Execute a bash command. Returns stdout+stderr. Use for: git, curl, docker, ls, grep, system info, etc. Commands run in /app by default.",
  parameters: bashSchema,
  execute: async (_id, { command, timeout }, signal?) => {
    const timeoutMs = Math.min((timeout ?? 30) * 1000, 120_000);

    const proc = Bun.spawn(["bash", "-c", command], {
      cwd: "/app",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}` },
    });

    // Timeout handling
    const timer = setTimeout(() => proc.kill(), timeoutMs);

    try {
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      const exitCode = await proc.exited;
      clearTimeout(timer);

      let output = "";
      if (stdout.trim()) output += stdout;
      if (stderr.trim()) output += (output ? "\n" : "") + stderr;
      if (!output.trim()) output = "(no output)";

      // Truncate very long output
      const originalLength = output.length;
      let truncated = false;
      if (output.length > 50_000) {
        output = output.slice(0, 50_000) + `\n\n[... truncated, total ${originalLength} chars]`;
        truncated = true;
      }

      if (exitCode !== 0) {
        const preview = output.split("\n").slice(0, 6).join("\n");
        auditToolUse("bash", { command, timeout }, { error: preview, exitCode, outputLength: originalLength, truncated });
        throw new Error(`${output}\n\nExit code: ${exitCode}`);
      }

      const result = {
        content: [{ type: "text" as const, text: output }],
        details: { exitCode },
      };
      const preview = output.split("\n").slice(0, 6).join("\n");
      auditToolUse("bash", { command, timeout }, { exitCode, outputPreview: preview, outputLength: originalLength, truncated });
      return result;
    } catch (err) {
      clearTimeout(timer);
      auditToolUse("bash", { command, timeout }, { error: (err as any)?.message });
      throw err;
    }
  },
};

// ─── CHECK HEALTH ─────────────────────────────────────────────

const healthSchema = Type.Object({
  service: Type.Optional(Type.String({ description: "Specific service to check: 'pixel', 'canvas-api', 'canvas-web', 'landing', 'postgres'. Default: all" })),
});

export const checkHealthTool: AgentTool<typeof healthSchema> = {
  name: "check_health",
  label: "Check Health",
  description: "Check the health of Pixel's infrastructure. Shows container status, memory usage, and endpoint health.",
  parameters: healthSchema,
  execute: async (_id, { service }) => {
    const results: string[] = [];

    // Self health
    if (!service || service === "pixel") {
      try {
        const res = await fetch("http://127.0.0.1:4000/health", { signal: AbortSignal.timeout(5000) });
        const data = await res.json() as any;
        results.push(`PIXEL: ${data.status} | uptime: ${Math.floor(data.uptime)}s | memory: ${Math.floor(data.memory.rss / 1024 / 1024)}MB | heartbeats: ${data.heartbeat?.heartbeatCount ?? 0} | inner-life cycles: ${data.innerLife?.cycleCount ?? 0}`);
      } catch (e: any) {
        results.push(`PIXEL: UNREACHABLE (${e.message})`);
      }
    }

    // Canvas API
    if (!service || service === "canvas-api") {
      try {
        const res = await fetch("http://pixel-api-1:3000/api/stats", { signal: AbortSignal.timeout(5000) });
        const data = await res.json() as any;
        results.push(`CANVAS API: OK | pixels: ${data.totalPixels ?? "?"} | sats: ${data.totalSats ?? "?"}`);
      } catch (e: any) {
        results.push(`CANVAS API: UNREACHABLE (${e.message})`);
      }
    }

    // Canvas Web
    if (!service || service === "canvas-web") {
      try {
        const res = await fetch("http://pixel-web-1:3002", { signal: AbortSignal.timeout(5000) });
        results.push(`CANVAS WEB: ${res.ok ? "OK" : "ERROR " + res.status}`);
      } catch (e: any) {
        results.push(`CANVAS WEB: UNREACHABLE (${e.message})`);
      }
    }

    // Landing
    if (!service || service === "landing") {
      try {
        const res = await fetch("http://pixel-landing-1:3001", { signal: AbortSignal.timeout(5000) });
        results.push(`LANDING: ${res.ok ? "OK" : "ERROR " + res.status}`);
      } catch (e: any) {
        results.push(`LANDING: UNREACHABLE (${e.message})`);
      }
    }

    // System info (memory, disk)
    if (!service) {
      try {
        const mem = process.memoryUsage();
        results.push(`PROCESS: rss=${Math.floor(mem.rss / 1024 / 1024)}MB heap=${Math.floor(mem.heapUsed / 1024 / 1024)}MB`);
      } catch {}
    }

    const result = {
      content: [{ type: "text" as const, text: results.join("\n") }],
      details: undefined,
    };
    auditToolUse("check_health", { service }, { resultsCount: results.length });
    return result;
  },
};

// ─── READ LOGS ────────────────────────────────────────────────

const logsSchema = Type.Object({
  source: Type.String({ description: "Log source: 'self' (own stdout/stderr logs), 'conversations' (list user conversations), 'revenue' (revenue stats from DB), or a specific conversation id" }),
  lines: Type.Optional(Type.Number({ description: "Number of recent lines to show (default: 50 for conversations, 100 for self)" })),
  filter: Type.Optional(Type.String({ description: "Regex pattern to filter self-logs (only used with source='self')" })),
  conversationId: Type.Optional(Type.String({ description: "Conversation ID (e.g. tg-group--4839030836)" })),
  includeContext: Type.Optional(Type.Boolean({ description: "Include current context.json if available (default: false)" })),
});

export const readLogsTool: AgentTool<typeof logsSchema> = {
  name: "read_logs",
  label: "Read Logs",
  description: "Read Pixel's own logs, conversation history, or revenue data.",
  parameters: logsSchema,
  execute: async (_id, { source, lines, filter, conversationId, includeContext }) => {
    const count = lines ?? 50;

    const convDir = "/app/conversations";
    const resolvedConversationId = source.startsWith("conversations:")
      ? source.slice("conversations:".length)
      : conversationId;

    if (resolvedConversationId) {
      const safeId = resolvedConversationId.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
      const logFile = join(convDir, safeId, "log.jsonl");
      console.log(`[tools] read_logs: reading conversation ${safeId} (${logFile})`);
      if (!existsSync(logFile)) {
        console.log(`[tools] read_logs: no log found for ${safeId}`);
        auditToolUse("read_logs", { source, conversationId: safeId }, { error: "no_log" });
        return { content: [{ type: "text" as const, text: `No log for ${safeId}` }], details: undefined };
      }

      const raw = readFileSync(logFile, "utf-8");
      const linesAll = raw.split("\n").filter(Boolean);
      const tail = linesAll.slice(-Math.min(count, 200));
      let output = `Conversation ${safeId} (${linesAll.length} entries)\n` + tail.join("\n");

      if (includeContext) {
        const contextFile = join(convDir, safeId, "context.json");
        if (existsSync(contextFile)) {
          try {
            const ctxRaw = readFileSync(contextFile, "utf-8");
            output += `\n\n[context.json]\n${ctxRaw}`;
          } catch {}
        }
      }

      console.log(`[tools] read_logs: read ${tail.length} lines from ${safeId}`);
      auditToolUse("read_logs", { source, conversationId: safeId, lines: count }, { count: tail.length });
      return { content: [{ type: "text" as const, text: output }], details: { count: tail.length } };
    }

    switch (source) {
      case "conversations": {
        if (!existsSync(convDir)) return { content: [{ type: "text" as const, text: "No conversations directory" }], details: undefined };
        const users = readdirSync(convDir).filter(f => {
          const p = join(convDir, f);
          return statSync(p).isDirectory();
        });
        const summaries = users.map(userId => {
          const logFile = join(convDir, userId, "log.jsonl");
          const memFile = join(convDir, userId, "memory.md");
          const hasLog = existsSync(logFile);
          const hasMem = existsSync(memFile);
          const logSize = hasLog ? statSync(logFile).size : 0;
          return `${userId}: ${hasLog ? `${logSize} bytes` : "no log"} ${hasMem ? "+ memory" : ""}`;
        });
        const result = {
          content: [{ type: "text" as const, text: `${users.length} conversations:\n${summaries.join("\n")}` }],
          details: { count: users.length },
        };
        auditToolUse("read_logs", { source }, { count: users.length });
        return result;
      }
      case "revenue": {
        try {
          // Direct DB call — no HTTP, no auth barrier. Same process, same DB.
          const data = await getRevenueStats();
          auditToolUse("read_logs", { source }, { ok: true, totalSats: data.totalSats });
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            details: data,
          };
        } catch (e: any) {
          auditToolUse("read_logs", { source }, { error: e.message });
          throw new Error(`Failed to get revenue stats: ${e.message}`);
        }
      }
      case "self":
      default: {
        // Read from agent log file (tee'd from console.log/error/warn)
        const logCount = lines ?? 100;

        // Support filtering by pattern
        if (filter) {
          const filtered = searchAgentLog(filter, logCount);
          auditToolUse("read_logs", { source, filter }, { ok: true, count: filtered.length });
          if (filtered.length === 0) {
            return {
              content: [{ type: "text", text: `No log lines matching pattern: ${filter}` }],
              details: { count: 0 },
            };
          }
          return {
            content: [{ type: "text", text: `Agent log (${filtered.length} lines matching "${filter}"):\n${filtered.join("\n")}` }],
            details: { count: filtered.length },
          };
        }

        const { lines: logLines, totalLines } = readAgentLog(logCount);
        if (logLines.length === 0) {
          auditToolUse("read_logs", { source }, { ok: true, count: 0 });
          return {
            content: [{ type: "text", text: "No agent logs available yet. The log file is populated from console output after boot." }],
            details: undefined,
          };
        }
        auditToolUse("read_logs", { source }, { ok: true, count: logLines.length, totalLines });
        return {
          content: [{ type: "text", text: `Agent log (${logLines.length} of ${totalLines} total lines):\n${logLines.join("\n")}` }],
          details: { count: logLines.length, totalLines },
        };
      }
    }
  },
};

// ─── HTML EXTRACTION HELPER ───────────────────────────────────

function extractReadableText(html: string): { text: string; links: { href: string; text: string }[] } {
  const root = parseHTML(html);
  root.querySelectorAll("script, style, nav, noscript, iframe, svg, [role='navigation'], [role='banner']")
    .forEach(el => el.remove());

  const body = root.querySelector("body") || root;
  const text = body.textContent
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const links = root.querySelectorAll("a[href]")
    .map(el => ({
      href: el.getAttribute("href") ?? "",
      text: el.textContent.trim(),
    }))
    .filter(l => l.href && l.text && !l.href.startsWith("#") && !l.href.startsWith("javascript:"));

  return { text, links };
}

// ─── WEB FETCH ────────────────────────────────────────────────

const webFetchSchema = Type.Object({
  url: Type.String({ description: "URL to fetch" }),
  method: Type.Optional(Type.String({ description: "HTTP method (default: GET)" })),
  extract_text: Type.Optional(Type.Boolean({ description: "Extract readable text from HTML, removing scripts/nav/etc. Default true for HTML." })),
});

export const webFetchTool: AgentTool<typeof webFetchSchema> = {
  name: "web_fetch",
  label: "Fetch URL",
  description: "Fetch a URL and return the response. For web research, checking APIs, reading documentation.",
  parameters: webFetchSchema,
  execute: async (_id, { url, method, extract_text }) => {
    try {
      const res = await fetch(url, {
        method: method ?? "GET",
        headers: { "User-Agent": "Pixel/2.0 (autonomous AI agent)" },
        signal: AbortSignal.timeout(15_000),
      });
      const contentType = res.headers.get("content-type") ?? "";
      let body: string;
      if (contentType.includes("json")) {
        const json = await res.json();
        body = JSON.stringify(json, null, 2);
      } else {
        body = await res.text();
      }
      // Extract readable text from HTML (default: true for HTML content)
      if (contentType.includes("html") && extract_text !== false) {
        const extracted = extractReadableText(body);
        const topLinks = extracted.links.slice(0, 25)
          .map(l => `- [${l.text.slice(0, 80)}](${l.href})`)
          .join("\n");
        body = extracted.text;
        if (topLinks) {
          body += "\n\n## Links found:\n" + topLinks;
        }
      }
      // Truncate large responses
      if (body.length > 30_000) {
        body = body.slice(0, 30_000) + `\n\n[... truncated, total ${body.length} chars]`;
      }
      const result = {
        content: [{ type: "text" as const, text: `${res.status} ${res.statusText}\n\n${body}` }],
        details: { status: res.status },
      };
      auditToolUse("web_fetch", { url, method }, { status: res.status, bodyLength: body.length });
      return result;
    } catch (e: any) {
      auditToolUse("web_fetch", { url, method }, { error: e.message });
      throw new Error(`Fetch failed: ${e.message}`);
    }
  },
};

// ─── WEB SEARCH ───────────────────────────────────────────────

const webSearchSchema = Type.Object({
  query: Type.String({ description: "Search query" }),
  max_results: Type.Optional(Type.Number({ description: "Max results to return (default 8, max 20)" })),
  time_range: Type.Optional(Type.String({ description: "Time filter: d (day), w (week), m (month), y (year)" })),
  site: Type.Optional(Type.String({ description: "Restrict to a specific domain, e.g. 'unal.edu.co'" })),
});

// Rate limiter for DDG to avoid getting blocked on rapid-fire searches
let _lastSearchTime = 0;
const SEARCH_MIN_INTERVAL_MS = 2500; // minimum 2.5s between searches

export const webSearchTool: AgentTool<typeof webSearchSchema> = {
  name: "web_search",
  label: "Search the Web",
  description: "Search the web using DuckDuckGo. Returns titles, URLs, and snippets. Use this to find information, discover URLs, and research topics. For site-specific search, use the 'site' parameter (e.g. site: 'unal.edu.co').",
  parameters: webSearchSchema,
  execute: async (_id, { query, max_results, time_range, site }) => {
    const limit = Math.min(max_results ?? 8, 20);
    const fullQuery = site ? `site:${site} ${query}` : query;

    // Rate-limit to prevent DDG from blocking rapid-fire searches
    const now = Date.now();
    const elapsed = now - _lastSearchTime;
    if (elapsed < SEARCH_MIN_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, SEARCH_MIN_INTERVAL_MS - elapsed));
    }
    _lastSearchTime = Date.now();

    const params = new URLSearchParams({ q: fullQuery });
    if (time_range) params.set("df", time_range);

    try {
      // Use curl instead of fetch — Bun's TLS fingerprint gets blocked by DDG (returns 202 lite page)
      const curlProc = Bun.spawn(["curl", "-s", "-X", "POST",
        "-H", "Content-Type: application/x-www-form-urlencoded",
        "-A", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "-d", params.toString(),
        "--max-time", "15",
        "https://html.duckduckgo.com/html/",
      ], { stdout: "pipe", stderr: "pipe" });
      const html = await new Response(curlProc.stdout).text();
      await curlProc.exited;
      const root = parseHTML(html);
      const resultNodes = root.querySelectorAll(".result.web-result");

      const results: { title: string; url: string; snippet: string }[] = [];
      for (const node of resultNodes) {
        if (results.length >= limit) break;

        const titleEl = node.querySelector("h2.result__title a.result__a");
        const snippetEl = node.querySelector("a.result__snippet");

        if (!titleEl) continue;

        // Extract actual URL from DDG redirect wrapper
        const rawHref = titleEl.getAttribute("href") ?? "";
        let url = "";
        try {
          const uddgMatch = rawHref.match(/[?&]uddg=([^&]+)/);
          url = uddgMatch ? decodeURIComponent(uddgMatch[1]) : rawHref;
        } catch {
          url = rawHref;
        }
        if (url.startsWith("//")) url = "https:" + url;

        const title = titleEl.textContent.trim();
        const snippet = snippetEl?.textContent.trim() ?? "";

        if (title && url) {
          results.push({ title, url, snippet });
        }
      }

      const formatted = results.length > 0
        ? results.map((r, i) => `### [${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n")
        : "No results found.";

      const text = `## Search: "${fullQuery}"\n${results.length} results\n\n${formatted}`;

      auditToolUse("web_search", { query: fullQuery, max_results: limit }, { resultCount: results.length });
      return { content: [{ type: "text" as const, text }], details: { resultCount: results.length } };
    } catch (e: any) {
      auditToolUse("web_search", { query: fullQuery }, { error: e.message });
      throw new Error(`Search failed: ${e.message}`);
    }
  },
};

// ─── RESEARCH TASK ────────────────────────────────────────────

const researchTaskSchema = Type.Object({
  topic: Type.String({ description: "What to research" }),
  instructions: Type.String({ description: "Specific instructions, criteria, or questions to answer" }),
  internal: Type.Optional(Type.Boolean({ description: "If true, results are for Pixel's autonomous learning (no user notification). Use this for self-directed research to expand Pixel's knowledge, not to answer user questions." })),
});

export const researchTaskTool: AgentTool<typeof researchTaskSchema> = {
  name: "research_task",
  label: "Background Research",
  description: "Enqueue a background research task. Use this for research that requires visiting multiple websites, comparing information, or takes more than a few tool calls in current conversation. Set internal=true for autonomous learning (no notification to user).",
  parameters: researchTaskSchema,
  execute: async (_id, { topic, instructions, internal = false }) => {
    const ctx = getToolContext();
    if (!internal && (!ctx.userId || !ctx.platform)) {
      throw new Error("No tool context available — cannot determine callback chat for external jobs");
    }

    const { enqueueJob } = await import("./jobs.js");

    const prompt = [
      `## Research Task: ${topic}`,
      ``,
      `### Instructions`,
      instructions,
      ``,
      `### Process`,
      `1. Use web_search to find relevant sources (try multiple queries if needed)`,
      `2. Use web_fetch to read most promising results (at least 3-5 sources)`,
      `3. Extract key facts, URLs, dates, and actionable information`,
      `4. Synthesize findings into a clear, structured report`,
      `5. Include all source URLs for verification`,
      ``,
      `### Output Format`,
      `Write a concise report (500-1500 words) with:`,
      `- Summary of findings`,
      `- Key details organized by category`,
      `- Source URLs`,
      `- Recommended next steps`,
    ].join("\n");

    const job = enqueueJob(
      prompt,
      ["web_search", "web_fetch", "read_file", "write_file"],
      internal
        ? { internal: true }
        : {
            platform: ctx.platform,
            chatId: ctx.chatId ?? "",
            userId: ctx.userId,
            label: topic,
          }
    );

    auditToolUse("research_task", { topic, instructions, internal }, { jobId: job.id });

    return {
      content: [{
        type: "text" as const,
        text: internal
          ? `investigación interna encolada: "${topic}" (job ${job.id}). para mi aprendizaje autónomo.`
          : `investigación encolada: "${topic}" (job ${job.id}). los resultados se entregarán a este chat cuando estén listos (~60s).`,
      }],
      details: { jobId: job.id },
    };
  },
};

// ─── CLAWSTR ──────────────────────────────────────────────────

const clawstrFeedSchema = Type.Object({
  subclaw: Type.Optional(Type.String({ description: "Subclaw path, e.g. /c/ai-dev" })),
  limit: Type.Optional(Type.Number({ description: "Number of posts to fetch (default: 15)" })),
});

export const clawstrFeedTool: AgentTool<typeof clawstrFeedSchema> = {
  name: "clawstr_feed",
  label: "Clawstr Feed",
  description: "Read recent Clawstr posts. Use to monitor agent discussions and engage.",
  parameters: clawstrFeedSchema,
  execute: async (_id, { subclaw, limit }) => {
    const output = await getClawstrFeed(subclaw, limit ?? 15);
    auditToolUse("clawstr_feed", { subclaw, limit }, { length: output.length });
    return { content: [{ type: "text" as const, text: output }], details: undefined };
  },
};

const clawstrPostSchema = Type.Object({
  subclaw: Type.String({ description: "Subclaw path, e.g. /c/ai-dev" }),
  content: Type.String({ description: "Post content" }),
});

export const clawstrPostTool: AgentTool<typeof clawstrPostSchema> = {
  name: "clawstr_post",
  label: "Clawstr Post",
  description: "Post a message to a Clawstr subclaw.",
  parameters: clawstrPostSchema,
  execute: async (_id, { subclaw, content }) => {
    const output = await postClawstr(subclaw, content);
    auditToolUse("clawstr_post", { subclaw, contentLength: content.length }, { length: output.length });
    return { content: [{ type: "text" as const, text: output }], details: undefined };
  },
};

const clawstrReplySchema = Type.Object({
  eventRef: Type.String({ description: "Event ID (note1... or hex)" }),
  content: Type.String({ description: "Reply content" }),
});

export const clawstrReplyTool: AgentTool<typeof clawstrReplySchema> = {
  name: "clawstr_reply",
  label: "Clawstr Reply",
  description: "Reply to a Clawstr post.",
  parameters: clawstrReplySchema,
  execute: async (_id, { eventRef, content }) => {
    const output = await replyClawstr(eventRef, content);
    auditToolUse("clawstr_reply", { eventRef, contentLength: content.length }, { length: output.length });
    return { content: [{ type: "text" as const, text: output }], details: undefined };
  },
};

const clawstrNotificationsSchema = Type.Object({
  limit: Type.Optional(Type.Number({ description: "Number of notifications to fetch (default: 20)" })),
});

export const clawstrNotificationsTool: AgentTool<typeof clawstrNotificationsSchema> = {
  name: "clawstr_notifications",
  label: "Clawstr Notifications",
  description: "Check Clawstr notifications (mentions, replies, reactions).",
  parameters: clawstrNotificationsSchema,
  execute: async (_id, { limit }) => {
    const result = await getClawstrNotifications(limit ?? 20);
    const output = result.output;
    auditToolUse("clawstr_notifications", { limit }, { length: output.length });
    return { content: [{ type: "text" as const, text: output }], details: undefined };
  },
};

const clawstrUpvoteSchema = Type.Object({
  eventRef: Type.String({ description: "Event ID (note1... or hex)" }),
});

export const clawstrUpvoteTool: AgentTool<typeof clawstrUpvoteSchema> = {
  name: "clawstr_upvote",
  label: "Clawstr Upvote",
  description: "Upvote a Clawstr post.",
  parameters: clawstrUpvoteSchema,
  execute: async (_id, { eventRef }) => {
    const output = await upvoteClawstr(eventRef);
    auditToolUse("clawstr_upvote", { eventRef }, { length: output.length });
    return { content: [{ type: "text" as const, text: output }], details: undefined };
  },
};

const clawstrSearchSchema = Type.Object({
  query: Type.String({ description: "Search keywords" }),
  limit: Type.Optional(Type.Number({ description: "Number of results (default: 15)" })),
});

export const clawstrSearchTool: AgentTool<typeof clawstrSearchSchema> = {
  name: "clawstr_search",
  label: "Clawstr Search",
  description: "Search Clawstr posts by keyword.",
  parameters: clawstrSearchSchema,
  execute: async (_id, { query, limit }) => {
    const output = await getClawstrSearch(query, limit ?? 15);
    auditToolUse("clawstr_search", { query, limit }, { length: output.length });
    return { content: [{ type: "text" as const, text: output }], details: undefined };
  },
};

// ─── GIT STATUS ───────────────────────────────────────────────

const gitStatusSchema = Type.Object({
  repo: Type.Optional(Type.String({ description: "Repository path (relative to /app or absolute). Default: /app" })),
});

export const gitStatusTool: AgentTool<typeof gitStatusSchema> = {
  name: "git_status",
  label: "Git Status",
  description: "Show the working tree status. Displays staged, unstaged, and untracked files.",
  parameters: gitStatusSchema,
  execute: async (_id, { repo }) => {
    const cwd = repo?.startsWith("/") ? repo : join("/app", repo ?? "");
    const proc = Bun.spawn(["git", "status", "--porcelain"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;

    if (stderr && !stdout) {
      auditToolUse("git_status", { repo }, { error: stderr });
      throw new Error(`Git error: ${stderr}`);
    }

    const lines = stdout.trim().split("\n").filter(Boolean);
    const result = {
      content: [{ type: "text" as const, text: lines.length ? stdout : "Working tree clean" }],
      details: { files: lines.length },
    };
    auditToolUse("git_status", { repo }, { files: lines.length });
    return result;
  },
};

// ─── GIT DIFF ─────────────────────────────────────────────────

const gitDiffSchema = Type.Object({
  repo: Type.Optional(Type.String({ description: "Repository path (relative to /app or absolute)" })),
  staged: Type.Optional(Type.Boolean({ description: "Show staged changes only (--cached)" })),
  file: Type.Optional(Type.String({ description: "Diff specific file" })),
});

export const gitDiffTool: AgentTool<typeof gitDiffSchema> = {
  name: "git_diff",
  label: "Git Diff",
  description: "Show changes between commits, working tree, or staged files. Use for reviewing code changes.",
  parameters: gitDiffSchema,
  execute: async (_id, { repo, staged, file }) => {
    const cwd = repo?.startsWith("/") ? repo : join("/app", repo ?? "");
    const args = ["diff", "--color=never"];
    if (staged) args.push("--cached");
    if (file) args.push("--", file);

    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;

    if (stderr && !stdout) {
      auditToolUse("git_diff", { repo, staged, file }, { error: stderr });
      throw new Error(`Git error: ${stderr}`);
    }

    const truncated = stdout.length > 30_000 ? stdout.slice(0, 30_000) + "\n\n[... truncated]" : stdout;
    const result = {
      content: [{ type: "text" as const, text: truncated || "No changes" }],
      details: { length: stdout.length },
    };
    auditToolUse("git_diff", { repo, staged, file }, { length: stdout.length });
    return result;
  },
};

// ─── GIT LOG ──────────────────────────────────────────────────

const gitLogSchema = Type.Object({
  repo: Type.Optional(Type.String({ description: "Repository path" })),
  limit: Type.Optional(Type.Number({ description: "Number of commits to show (default: 10)" })),
  file: Type.Optional(Type.String({ description: "Show commits affecting specific file" })),
  oneline: Type.Optional(Type.Boolean({ description: "One-line format (default: true)" })),
});

export const gitLogTool: AgentTool<typeof gitLogSchema> = {
  name: "git_log",
  label: "Git Log",
  description: "Show commit history. Use to understand code evolution or find specific changes.",
  parameters: gitLogSchema,
  execute: async (_id, { repo, limit, file, oneline }) => {
    const cwd = repo?.startsWith("/") ? repo : join("/app", repo ?? "");
    const args = ["log", `--max-count=${limit ?? 10}`];
    if (oneline !== false) args.push("--oneline");
    if (file) args.push("--", file);

    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;

    if (stderr && !stdout) {
      auditToolUse("git_log", { repo, limit, file, oneline }, { error: stderr });
      throw new Error(`Git error: ${stderr}`);
    }

    const result = {
      content: [{ type: "text" as const, text: stdout || "No commits" }],
      details: { commits: stdout.split("\n").filter(Boolean).length },
    };
    auditToolUse("git_log", { repo, limit, file, oneline }, { commits: result.details.commits });
    return result;
  },
};

// ─── GIT SHOW ────────────────────────────────────────────────

const gitShowSchema = Type.Object({
  repo: Type.Optional(Type.String({ description: "Repository path" })),
  ref: Type.Optional(Type.String({ description: "Commit, tag, or branch (default: HEAD)" })),
});

export const gitShowTool: AgentTool<typeof gitShowSchema> = {
  name: "git_show",
  label: "Git Show",
  description: "Show details of a specific commit (diff, message, author, date).",
  parameters: gitShowSchema,
  execute: async (_id, { repo, ref }) => {
    const cwd = repo?.startsWith("/") ? repo : join("/app", repo ?? "");
    const proc = Bun.spawn(["git", "show", "--color=never", ref ?? "HEAD"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;

    if (stderr && !stdout) {
      auditToolUse("git_show", { repo, ref }, { error: stderr });
      throw new Error(`Git error: ${stderr}`);
    }

    const truncated = stdout.length > 30_000 ? stdout.slice(0, 30_000) + "\n\n[... truncated]" : stdout;
    const result = {
      content: [{ type: "text" as const, text: truncated || "Not found" }],
      details: { length: stdout.length },
    };
    auditToolUse("git_show", { repo, ref }, { length: stdout.length });
    return result;
  },
};

// ─── GIT BRANCH ───────────────────────────────────────────────

const gitBranchSchema = Type.Object({
  repo: Type.Optional(Type.String({ description: "Repository path" })),
  list: Type.Optional(Type.Boolean({ description: "List branches (default: true)" })),
  current: Type.Optional(Type.Boolean({ description: "Show current branch name only" })),
});

export const gitBranchTool: AgentTool<typeof gitBranchSchema> = {
  name: "git_branch",
  label: "Git Branch",
  description: "List, create, or delete branches. Use to see available branches or current context.",
  parameters: gitBranchSchema,
  execute: async (_id, { repo, list, current }) => {
    const cwd = repo?.startsWith("/") ? repo : join("/app", repo ?? "");
    const args = ["branch"];
    if (current) args.push("--show-current");
    else if (list !== false) args.push("-a");

    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;

    if (stderr && !stdout) {
      auditToolUse("git_branch", { repo, list, current }, { error: stderr });
      throw new Error(`Git error: ${stderr}`);
    }

    const result = {
      content: [{ type: "text" as const, text: stdout || "No branches" }],
      details: { branches: stdout.split("\n").filter(Boolean).length },
    };
    auditToolUse("git_branch", { repo, list, current }, { branches: result.details.branches });
    return result;
  },
};

// ─── GIT CLONE ───────────────────────────────────────────────

const gitCloneSchema = Type.Object({
  url: Type.String({ description: "GitHub URL to clone (e.g., https://github.com/user/repo or git@github.com:user/repo.git)" }),
  targetDir: Type.Optional(Type.String({ description: "Target directory (default: repo name in /app)" })),
  token: Type.Optional(Type.String({ description: "GitHub personal access token (if needed for private repos)" })),
});

export const gitCloneTool: AgentTool<typeof gitCloneSchema> = {
  name: "git_clone",
  label: "Git Clone",
  description: "Clone a git repository. Supports HTTPS with token for private repos. Uses GITHUB_TOKEN env var if no token provided.",
  parameters: gitCloneSchema,
  execute: async (_id, { url, targetDir, token }) => {
    let cloneUrl = url;
    const effectiveToken = token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    
    if (effectiveToken) {
      cloneUrl = url.replace("https://github.com/", `https://${effectiveToken}@github.com/`);
    }

    const repoName = url.split("/").pop()?.replace(".git", "") ?? "repo";
    const target = targetDir ?? join("/app/external", repoName);

    const proc = Bun.spawn(["git", "clone", "--progress", cloneUrl, target], {
      cwd: "/app",
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      auditToolUse("git_clone", { url, targetDir, token: !!effectiveToken }, { error: stderr, exitCode });
      throw new Error(`Git clone failed: ${stderr}`);
    }

    const result = {
      content: [{ type: "text" as const, text: `Cloned to ${target}\n${stdout}${stderr}` }],
      details: { target, url },
    };
    auditToolUse("git_clone", { url, targetDir, token: !!effectiveToken }, { target, url });
    return result;
  },
};

// ─── GIT PULL ───────────────────────────────────────────────

const gitPullSchema = Type.Object({
  repo: Type.String({ description: "Repository path" }),
  branch: Type.Optional(Type.String({ description: "Branch to pull (default: current)" })),
});

export const gitPullTool: AgentTool<typeof gitPullSchema> = {
  name: "git_pull",
  label: "Git Pull",
  description: "Fetch and merge changes from remote repository.",
  parameters: gitPullSchema,
  execute: async (_id, { repo, branch }) => {
    const cwd = repo.startsWith("/") ? repo : join("/app", repo);
    const args = ["pull"];
    if (branch) args.push("origin", branch);

    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      auditToolUse("git_pull", { repo, branch }, { error: stderr, exitCode });
      throw new Error(`Git pull failed: ${stderr}`);
    }

    const result = {
      content: [{ type: "text" as const, text: stdout || stderr }],
      details: { repo },
    };
    auditToolUse("git_pull", { repo, branch }, { success: true });
    return result;
  },
};

// ─── GIT PUSH ───────────────────────────────────────────────

const gitPushSchema = Type.Object({
  repo: Type.String({ description: "Repository path" }),
  remote: Type.Optional(Type.String({ description: "Remote name (default: origin)" })),
  branch: Type.Optional(Type.String({ description: "Branch to push (default: current)" })),
  token: Type.Optional(Type.String({ description: "GitHub token if not configured in remote" })),
});

export const gitPushTool: AgentTool<typeof gitPushSchema> = {
  name: "git_push",
  label: "Git Push",
  description: "Push commits to remote repository. Supports token for authentication. Uses GITHUB_TOKEN env var if no token provided.",
  parameters: gitPushSchema,
  execute: async (_id, { repo, remote, branch, token }) => {
    const cwd = repo.startsWith("/") ? repo : join("/app", repo);
    const args = ["push"];
    if (remote) args.push(remote);
    if (branch) args.push(branch);

    const effectiveToken = token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    const env: Record<string, string> = {};
    if (effectiveToken) {
      env.GIT_ASKPASS = "/bin/echo";
      env.GITHUB_TOKEN = effectiveToken;
    }

    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...env },
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      auditToolUse("git_push", { repo, remote, branch, token: !!effectiveToken }, { error: stderr, exitCode });
      throw new Error(`Git push failed: ${stderr}`);
    }

    const result = {
      content: [{ type: "text" as const, text: stdout || "Pushed successfully" }],
      details: { repo },
    };
    auditToolUse("git_push", { repo, remote, branch, token: !!effectiveToken }, { success: true });
    return result;
  },
};

// ─── GIT ADD & COMMIT ────────────────────────────────────────

const gitCommitSchema = Type.Object({
  repo: Type.String({ description: "Repository path" }),
  message: Type.String({ description: "Commit message" }),
  files: Type.Optional(Type.String({ description: "Files to stage (default: -A for all)" })),
});

export const gitCommitTool: AgentTool<typeof gitCommitSchema> = {
  name: "git_commit",
  label: "Git Commit",
  description: "Stage and commit changes. Use to create a snapshot of changes.",
  parameters: gitCommitSchema,
  execute: async (_id, { repo, message, files }) => {
    const cwd = repo.startsWith("/") ? repo : join("/app", repo);

    const stageProc = Bun.spawn(["git", "add", files ?? "-A"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    await stageProc.exited;

    const proc = Bun.spawn(["git", "commit", "-m", message], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      auditToolUse("git_commit", { repo, message, files }, { error: stderr, exitCode });
      throw new Error(`Git commit failed: ${stderr}`);
    }

    const result = {
      content: [{ type: "text" as const, text: stdout || "Committed successfully" }],
      details: { repo },
    };
    auditToolUse("git_commit", { repo, message, files }, { success: true });
    return result;
  },
};

// ─── SSH EXECUTE ───────────────────────────────────────────────

const sshSchema = Type.Object({
  host: Type.Optional(Type.String({ description: "SSH host (IP or hostname). Falls back to TALLERUBENS_SSH_HOST env var if not provided." })),
  user: Type.Optional(Type.String({ description: "SSH user (default: root)" })),
  port: Type.Optional(Type.Number({ description: "SSH port (default: 22)" })),
  command: Type.String({ description: "Command to execute on remote server" }),
  key: Type.Optional(Type.String({ description: "Private SSH key (raw OpenSSH/PEM) or base64-encoded key. Falls back to TALLERUBENS_SSH_KEY env var." })),
});

function decodeSshKey(maybeKey: string): string {
  const trimmed = maybeKey.trim();
  if (trimmed.includes("BEGIN OPENSSH PRIVATE KEY") || trimmed.includes("BEGIN RSA PRIVATE KEY") || trimmed.includes("BEGIN EC PRIVATE KEY")) {
    return trimmed;
  }

  // Try base64 -> text. If it looks like a key, use it.
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf-8").trim();
    if (decoded.includes("BEGIN OPENSSH PRIVATE KEY") || decoded.includes("BEGIN RSA PRIVATE KEY") || decoded.includes("BEGIN EC PRIVATE KEY")) {
      return decoded;
    }
  } catch {}

  // Last resort: assume caller already passed raw key content without header detection.
  return trimmed;
}

export const sshTool: AgentTool<typeof sshSchema> = {
  name: "ssh",
  label: "SSH Execute",
  description: "Execute commands on a remote server via SSH. Use for managing external servers like tallerubens. Uses TALLERUBENS_SSH_* env vars as fallback.",
  parameters: sshSchema,
  execute: async (_id, { host, user, port, command, key }) => {
    const effectiveHost = host ?? process.env.TALLERUBENS_SSH_HOST;
    const effectiveKey = key ?? process.env.TALLERUBENS_SSH_KEY;
    const effectiveUser = user ?? process.env.TALLERUBENS_SSH_USER ?? "root";
    const sshPort = port ?? 22;
    
    if (!effectiveHost) {
      throw new Error("SSH host required. Provide 'host' parameter or set TALLERUBENS_SSH_HOST env var.");
    }
    
    const args = [
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=/dev/null",
      "-o", "PreferredAuthentications=publickey",
      "-o", "IdentitiesOnly=yes",
      "-p", sshPort.toString(),
    ];
    
    if (effectiveKey) {
      const keyContent = decodeSshKey(effectiveKey);
      const keyFile = `/tmp/ssh_key_${Date.now()}`;
      await Bun.write(keyFile, keyContent);
      await chmodSync(keyFile, 0o600);
      args.push("-i", keyFile);
    }

    const target = `${effectiveUser}@${effectiveHost}`;
    
    const proc = Bun.spawn(["ssh", ...args, target, command], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;

    if (effectiveKey) {
      const keyIdx = args.indexOf("-i");
      if (keyIdx !== -1) {
        const keyFile = args[keyIdx + 1];
        await Bun.write(keyFile, "");
      }
    }

    const output = stdout + (stderr ? `\n[stderr]: ${stderr}` : "");
    const truncated = output.length > 30_000 ? output.slice(0, 30_000) + "\n[... truncated]" : output;

    auditToolUse("ssh", { host: effectiveHost, user: effectiveUser, port: sshPort, hasKey: !!effectiveKey }, { exitCode, outputLength: output.length });

    if (exitCode !== 0) {
      throw new Error(`SSH failed (exit ${exitCode}): ${stderr || stdout}`);
    }

    return {
      content: [{ type: "text" as const, text: truncated || "Command executed successfully" }],
      details: { exitCode, outputLength: output.length },
    };
  },
};

// ─── WP-CLI ───────────────────────────────────────────────────

const wpCliSchema = Type.Object({
  command: Type.String({ description: "WP-CLI command to run (e.g., 'plugin list', 'post list --limit=10')" }),
  host: Type.Optional(Type.String({ description: "SSH host for remote execution. Falls back to TALLERUBENS_SSH_HOST." })),
  user: Type.Optional(Type.String({ description: "SSH user (default: root)" })),
  path: Type.Optional(Type.String({ description: "WordPress installation path. Falls back to TALLERUBENS_WP_PATH." })),
  key: Type.Optional(Type.String({ description: "Private SSH key (raw OpenSSH/PEM) or base64-encoded key. Falls back to TALLERUBENS_SSH_KEY env var." })),
});

export const wpCliTool: AgentTool<typeof wpCliSchema> = {
  name: "wp",
  label: "WP-CLI",
  description: "Run WordPress commands via WP-CLI. Use for managing WordPress sites like tallerubens.com. Uses TALLERUBENS_SSH_* env vars as fallback.",
  parameters: wpCliSchema,
  execute: async (_id, { command, host, user, path, key }) => {
    const effectiveHost = host ?? process.env.TALLERUBENS_SSH_HOST;
    const effectivePath = path ?? process.env.TALLERUBENS_WP_PATH;
    const effectiveUser = user ?? process.env.TALLERUBENS_SSH_USER ?? "root";
    const effectiveKey = key ?? process.env.TALLERUBENS_SSH_KEY;
    
    let fullCommand = "wp " + command;
    
    if (effectivePath) {
      fullCommand = `cd ${effectivePath} && wp ${command}`;
    }

    if (effectiveHost) {
      const sshArgs = ["-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "PreferredAuthentications=publickey", "-o", "IdentitiesOnly=yes"];
      const target = `${effectiveUser}@${effectiveHost}`;
      
      const keyContent = effectiveKey ? decodeSshKey(effectiveKey) : null;
      let finalArgs = [...sshArgs];
      if (keyContent) {
        const keyFile = `/tmp/ssh_key_wp_${Date.now()}`;
        await Bun.write(keyFile, keyContent);
        await chmodSync(keyFile, 0o600);
        finalArgs = [...finalArgs, "-i", keyFile];
      }
      
      const proc = Bun.spawn(["ssh", ...finalArgs, target, fullCommand], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        auditToolUse("wp", { host: effectiveHost, command }, { exitCode, error: stderr });
        throw new Error(`WP-CLI failed: ${stderr}`);
      }

      const output = stdout || stderr;
      const truncated = output.length > 30_000 ? output.slice(0, 30_000) + "\n[... truncated]" : output;
      
      auditToolUse("wp", { host: effectiveHost, command }, { exitCode, outputLength: output.length });
      return { content: [{ type: "text" as const, text: truncated }], details: { exitCode } };
    } else {
      const proc = Bun.spawn(["wp", ...command.split(" ")], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        auditToolUse("wp", { command, local: true }, { exitCode, error: stderr });
        throw new Error(`WP-CLI failed: ${stderr}`);
      }

      const output = stdout || stderr;
      const truncated = output.length > 30_000 ? output.slice(0, 30_000) + "\n[... truncated]" : output;
      
      auditToolUse("wp", { command, local: true }, { exitCode, outputLength: output.length });
      return { content: [{ type: "text" as const, text: truncated }], details: { exitCode } };
    }
  },
};

// ─── ALARM CLOCK TOOLS ───────────────────────────────────────

// Tool execution context — set by agent.ts before each prompt() call
// so tools can access the current chat session info without LLM passing it
let _toolContext: { userId?: string; platform?: string; chatId?: string } = {};

/** Set the current tool execution context (called from agent.ts before prompt) */
export function setToolContext(ctx: { userId?: string; platform?: string; chatId?: string }): void {
  _toolContext = ctx;
}

/** Clear tool context after prompt completes */
export function clearToolContext(): void {
  _toolContext = {};
}

/** Get current tool context (used by research_task to determine callback chat) */
function getToolContext(): { userId?: string; platform?: string; chatId?: string } {
  return _toolContext;
}

/**
 * Parse a relative time string like "10 seconds", "5 minutes", "2 hours", "1 day"
 * and return a Date that many units from now. Returns null if unparseable.
 */
function parseRelativeTime(input: string): Date | null {
  const cleaned = input.toLowerCase().trim()
    .replace(/^in\s+/, "")
    .replace(/^en\s+/, "")       // Spanish: "en 10 segundos"
    .replace(/^dentro de\s+/, ""); // Spanish: "dentro de 10 minutos"

  const match = cleaned.match(/^(\d+)\s*(seconds?|segundos?|secs?|seg|minutes?|minutos?|mins?|min|hours?|horas?|hrs?|days?|días?|dias?|weeks?|semanas?)$/);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  if (/^(seconds?|segundos?|secs?|seg)$/.test(unit)) {
    return new Date(now.getTime() + amount * 1000);
  } else if (/^(minutes?|minutos?|mins?|min)$/.test(unit)) {
    return new Date(now.getTime() + amount * 60_000);
  } else if (/^(hours?|horas?|hrs?)$/.test(unit)) {
    return new Date(now.getTime() + amount * 3_600_000);
  } else if (/^(days?|días?|dias?)$/.test(unit)) {
    return new Date(now.getTime() + amount * 86_400_000);
  } else if (/^(weeks?|semanas?)$/.test(unit)) {
    return new Date(now.getTime() + amount * 7 * 86_400_000);
  }

  return null;
}

const scheduleAlarmSchema = Type.Object({
  user_id: Type.String({ description: "Platform-specific user ID" }),
  platform: Type.String({ description: "Platform (telegram/whatsapp/nostr/etc)" }),
  platform_chat_id: Type.Optional(Type.String({ description: "Target chat ID for delivering the alarm. Auto-filled from context if not provided." })),
  raw_message: Type.String({ description: "Raw intent message to store" }),
  due_at: Type.Optional(Type.String({ description: "ISO datetime to fire (use this OR relative_time, not both)" })),
  relative_time: Type.Optional(Type.String({ description: "Relative time from now, e.g. '10 seconds', '5 minutes', '2 hours', '1 day'. Server computes exact time. PREFERRED over due_at for short-term alarms." })),
  repeat_pattern: Type.Optional(Type.String({ description: "Optional repeat pattern (freeform)" })),
  repeat_count: Type.Optional(Type.Number({ description: "Optional repeat count (null = infinite)" })),
});

export const scheduleAlarmTool: AgentTool<typeof scheduleAlarmSchema> = {
  name: "schedule_alarm",
  label: "Schedule Alarm",
  description: "Schedule an alarm. For short-term alarms (seconds/minutes/hours), use relative_time instead of due_at to avoid time computation errors. The platform_chat_id is auto-filled from the current chat context.",
  parameters: scheduleAlarmSchema,
  execute: async (_id, { user_id, platform, platform_chat_id, raw_message, due_at, relative_time, repeat_pattern, repeat_count }) => {
    // Auto-fill platform_chat_id from tool context if LLM didn't provide it
    const effectiveChatId = platform_chat_id || _toolContext.chatId || undefined;
    
    // Compute due time: prefer relative_time (server-side, no LLM hallucination)
    let dueAt: Date;
    if (relative_time) {
      const parsed = parseRelativeTime(relative_time);
      if (!parsed) {
        throw new Error(`Could not parse relative_time: "${relative_time}". Use formats like "10 seconds", "5 minutes", "2 hours".`);
      }
      dueAt = parsed;
    } else if (due_at) {
      dueAt = new Date(due_at);
      if (isNaN(dueAt.getTime())) {
        throw new Error(`Invalid due_at: ${due_at}`);
      }
    } else {
      throw new Error("Either due_at or relative_time must be provided.");
    }

    const reminder = await storeReminder({
      userId: user_id,
      platform,
      platformChatId: effectiveChatId,
      rawMessage: raw_message,
      dueAt,
      repeatPattern: repeat_pattern ?? null,
      repeatCount: repeat_count ?? null,
      firesRemaining: repeat_count ?? null,
    });

    return {
      content: [{ type: "text" as const, text: `Scheduled alarm #${reminder.id} for ${dueAt.toISOString()} (chatId: ${effectiveChatId || "MISSING"})` }],
      details: undefined,
    };
  },
};

const listAlarmsSchema = Type.Object({
  user_id: Type.String({ description: "Platform-specific user ID" }),
  platform: Type.String({ description: "Platform (telegram/whatsapp/nostr/etc)" }),
});

export const listAlarmsTool: AgentTool<typeof listAlarmsSchema> = {
  name: "list_alarms",
  label: "List Alarms",
  description: "List active alarms for a user.",
  parameters: listAlarmsSchema,
  execute: async (_id, { user_id, platform }) => {
    const reminders = await listReminders(user_id, platform);
    const lines = reminders.map((r, i) => {
      const due = new Date(r.dueAt).toISOString();
      const recur = r.repeatPattern ? ` (${r.repeatPattern})` : "";
      return `${i + 1}. [${r.id}] ${due}${recur} — ${r.rawMessage}`;
    });

    const text = lines.length > 0 ? lines.join("\n") : "No active alarms.";
    return { content: [{ type: "text" as const, text }], details: undefined };
  },
};

const cancelAlarmSchema = Type.Object({
  alarm_id: Type.Number({ description: "Alarm ID to cancel" }),
});

export const cancelAlarmTool: AgentTool<typeof cancelAlarmSchema> = {
  name: "cancel_alarm",
  label: "Cancel Alarm",
  description: "Cancel a specific alarm by ID.",
  parameters: cancelAlarmSchema,
  execute: async (_id, { alarm_id }) => {
    const ok = await cancelReminder(alarm_id);
    return { content: [{ type: "text" as const, text: ok ? `Cancelled alarm #${alarm_id}` : `Alarm #${alarm_id} not found` }], details: undefined };
  },
};

const cancelAllAlarmsSchema = Type.Object({
  user_id: Type.String({ description: "Platform-specific user ID" }),
  platform: Type.String({ description: "Platform (telegram/whatsapp/nostr/etc)" }),
});

export const cancelAllAlarmsTool: AgentTool<typeof cancelAllAlarmsSchema> = {
  name: "cancel_all_alarms",
  label: "Cancel All Alarms",
  description: "Cancel all alarms for a user on a platform.",
  parameters: cancelAllAlarmsSchema,
  execute: async (_id, { user_id, platform }) => {
    const count = await cancelAllReminders(user_id, platform);
    return { content: [{ type: "text" as const, text: `Cancelled ${count} alarms.` }], details: undefined };
  },
};

const modifyAlarmSchema = Type.Object({
  alarm_id: Type.Number({ description: "Alarm ID to modify" }),
  due_at: Type.Optional(Type.String({ description: "New due time (ISO)" })),
  raw_message: Type.Optional(Type.String({ description: "New raw message" })),
  repeat_pattern: Type.Optional(Type.String({ description: "New repeat pattern" })),
  repeat_count: Type.Optional(Type.Number({ description: "New repeat count" })),
});

export const modifyAlarmTool: AgentTool<typeof modifyAlarmSchema> = {
  name: "modify_alarm",
  label: "Modify Alarm",
  description: "Modify alarm timing or text.",
  parameters: modifyAlarmSchema,
  execute: async (_id, { alarm_id, due_at, raw_message, repeat_pattern, repeat_count }) => {
    const updates: any = {};
    if (due_at) {
      const dueAt = new Date(due_at);
      if (isNaN(dueAt.getTime())) throw new Error(`Invalid due_at: ${due_at}`);
      updates.dueAt = dueAt;
    }
    if (raw_message) updates.rawMessage = raw_message;
    if (repeat_pattern !== undefined) updates.repeatPattern = repeat_pattern ?? null;
    if (repeat_count !== undefined) {
      updates.repeatCount = repeat_count ?? null;
      updates.firesRemaining = repeat_count ?? null;
    }

    const updated = await modifyReminder(alarm_id, updates);
    if (!updated) {
      return { content: [{ type: "text" as const, text: `Alarm #${alarm_id} not found or not modified.` }], details: undefined };
    }
    return { content: [{ type: "text" as const, text: `Updated alarm #${alarm_id}` }], details: undefined };
  },
};

// ─── LIST CHATS ───────────────────────────────────────────────

// Map platform names to directory prefixes
const platformDirPrefix: Record<string, string> = {
  telegram: "tg",
  tg: "tg",
  whatsapp: "whatsapp",
  nostr: "nostr",
  instagram: "instagram",
};

const listChatsSchema = Type.Object({
  platform: Type.Optional(Type.String({ description: "Filter by platform (telegram/whatsapp/nostr). Default: all" })),
});

export const listChatsTool: AgentTool<typeof listChatsSchema> = {
  name: "list_chats",
  label: "List Chats",
  description: "List all known conversations (DMs and groups) across platforms. Returns chat IDs, types, names (extracted from memory files), and platform. Use this to find a chat's ID for cross-chat alarm targeting.",
  parameters: listChatsSchema,
  execute: async (_id, { platform }) => {
    const convDir = join("/app", "conversations");
    if (!existsSync(convDir)) {
      return { content: [{ type: "text" as const, text: "No conversations directory found." }], details: undefined };
    }

    const prefix = platform ? platformDirPrefix[platform.toLowerCase()] || platform : null;

    const entries = readdirSync(convDir).filter(e => {
      const full = join(convDir, e);
      if (!statSync(full).isDirectory()) return false;
      // Only include platform-prefixed conversation dirs
      if (prefix) return e.startsWith(`${prefix}-`);
      return /^(tg|whatsapp|nostr|instagram)-/.test(e);
    });

    const chats: { dir: string; type: string; platform: string; chatId: string; name: string }[] = [];

    for (const dir of entries) {
      let chatPlatform = "unknown";
      let chatId = "";
      let chatType = "dm";
      let name = "";

      // Parse directory name pattern: {platform}-group-{id} or {platform}-{id}
      if (dir.startsWith("tg-group-")) {
        chatPlatform = "telegram";
        chatId = dir.replace("tg-group-", "");
        chatType = "group";
      } else if (dir.startsWith("tg-")) {
        chatPlatform = "telegram";
        chatId = dir.replace("tg-", "");
        chatType = "dm";
      } else if (dir.startsWith("whatsapp-group-")) {
        chatPlatform = "whatsapp";
        chatId = dir.replace("whatsapp-group-", "");
        chatType = "group";
      } else if (dir.startsWith("whatsapp-")) {
        chatPlatform = "whatsapp";
        chatId = dir.replace("whatsapp-", "");
        chatType = "dm";
      } else if (dir.startsWith("nostr-")) {
        chatPlatform = "nostr";
        chatId = dir.replace("nostr-", "");
        chatType = "dm";
      } else if (dir.startsWith("instagram-")) {
        chatPlatform = "instagram";
        chatId = dir.replace("instagram-", "");
        chatType = "dm";
      }

      // Skip nostr/clawstr/test conversations — too many, not useful for cross-chat targeting
      if (chatPlatform === "nostr") continue;
      if (dir.startsWith("clawstr-") || dir.startsWith("test-") || dir.startsWith("session") || dir === "anonymous" || dir.startsWith("llm-") || dir.startsWith("e2e-")) continue;

      // Extract name from memory.md or group.md
      const memPath = join(convDir, dir, "memory.md");
      const grpPath = join(convDir, dir, "group.md");

      if (existsSync(memPath)) {
        try {
          const mem = readFileSync(memPath, "utf-8");
          // Try to find a Name field
          const nameMatch = mem.match(/\*\*Name:\*\*\s*(.+)/);
          if (nameMatch) name = nameMatch[1].trim();
        } catch {}
      }
      if (!name && existsSync(grpPath)) {
        try {
          const grp = readFileSync(grpPath, "utf-8");
          // Try first meaningful line
          const firstLine = grp.split("\n").find(l => l.trim().length > 0);
          if (firstLine) name = firstLine.replace(/^[\s*-]+/, "").slice(0, 80).trim();
        } catch {}
      }

      chats.push({ dir, type: chatType, platform: chatPlatform, chatId, name: name || "(no name)" });
    }

    if (chats.length === 0) {
      return { content: [{ type: "text" as const, text: "No chats found." }], details: undefined };
    }

    const lines = chats.map(c => 
      `- [${c.type}] ${c.platform} | chatId: ${c.chatId} | name: ${c.name} | dir: ${c.dir}`
    );

    auditToolUse("list_chats", { platform }, { count: chats.length });
    return { content: [{ type: "text" as const, text: `Found ${chats.length} chats:\n${lines.join("\n")}` }], details: undefined };
  },
};

// ─── FIND CHAT ────────────────────────────────────────────────

const findChatSchema = Type.Object({
  query: Type.String({ description: "Search keyword to find a chat by name, member, or description. Case-insensitive fuzzy search across memory.md and group.md files." }),
  platform: Type.Optional(Type.String({ description: "Filter by platform (telegram/whatsapp/nostr). Default: all" })),
});

export const findChatTool: AgentTool<typeof findChatSchema> = {
  name: "find_chat",
  label: "Find Chat",
  description: "Search for a chat by name, member name, or keyword. Returns matching chats with their chat IDs for use in schedule_alarm's platform_chat_id parameter. Example: find_chat({query: 'rubens'}) to find the TalleRubens group.",
  parameters: findChatSchema,
  execute: async (_id, { query, platform }) => {
    const convDir = join("/app", "conversations");
    if (!existsSync(convDir)) {
      return { content: [{ type: "text" as const, text: "No conversations directory found." }], details: undefined };
    }

    const queryLower = query.toLowerCase();
    const prefix = platform ? platformDirPrefix[platform.toLowerCase()] || platform : null;
    const entries = readdirSync(convDir).filter(e => {
      const full = join(convDir, e);
      if (!statSync(full).isDirectory()) return false;
      if (prefix) return e.startsWith(`${prefix}-`);
      return /^(tg|whatsapp|instagram)-/.test(e);
    });

    // Also skip nostr (too many), test dirs, etc.
    const filteredEntries = entries.filter(dir =>
      !dir.startsWith("nostr-") && !dir.startsWith("clawstr-") && !dir.startsWith("test-") &&
      !dir.startsWith("session") && dir !== "anonymous" && !dir.startsWith("llm-") && !dir.startsWith("e2e-")
    );

    const matches: { dir: string; type: string; platform: string; chatId: string; name: string; matchContext: string }[] = [];

    for (const dir of filteredEntries) {
      let chatPlatform = "unknown";
      let chatId = "";
      let chatType = "dm";

      if (dir.startsWith("tg-group-")) {
        chatPlatform = "telegram";
        chatId = dir.replace("tg-group-", "");
        chatType = "group";
      } else if (dir.startsWith("tg-")) {
        chatPlatform = "telegram";
        chatId = dir.replace("tg-", "");
        chatType = "dm";
      } else if (dir.startsWith("whatsapp-group-")) {
        chatPlatform = "whatsapp";
        chatId = dir.replace("whatsapp-group-", "");
        chatType = "group";
      } else if (dir.startsWith("whatsapp-")) {
        chatPlatform = "whatsapp";
        chatId = dir.replace("whatsapp-", "");
        chatType = "dm";
      } else if (dir.startsWith("instagram-")) {
        chatPlatform = "instagram";
        chatId = dir.replace("instagram-", "");
        chatType = "dm";
      }

      // Check directory name itself
      let matched = dir.toLowerCase().includes(queryLower);
      let matchContext = matched ? `Directory name contains "${query}"` : "";

      // Search memory.md
      const memPath = join(convDir, dir, "memory.md");
      if (existsSync(memPath)) {
        try {
          const mem = readFileSync(memPath, "utf-8");
          if (mem.toLowerCase().includes(queryLower)) {
            matched = true;
            // Extract the matching line for context
            const matchLine = mem.split("\n").find(l => l.toLowerCase().includes(queryLower));
            matchContext = matchLine ? matchLine.replace(/^[\s*-]+/, "").slice(0, 120).trim() : "Found in memory.md";
          }
        } catch {}
      }

      // Search group.md
      const grpPath = join(convDir, dir, "group.md");
      if (existsSync(grpPath)) {
        try {
          const grp = readFileSync(grpPath, "utf-8");
          if (grp.toLowerCase().includes(queryLower)) {
            matched = true;
            const matchLine = grp.split("\n").find(l => l.toLowerCase().includes(queryLower));
            matchContext = matchLine ? matchLine.replace(/^[\s*-]+/, "").slice(0, 120).trim() : "Found in group.md";
          }
        } catch {}
      }

      if (matched) {
        // Get name from memory
        let name = "";
        if (existsSync(memPath)) {
          try {
            const mem = readFileSync(memPath, "utf-8");
            const nameMatch = mem.match(/\*\*Name:\*\*\s*(.+)/);
            if (nameMatch) name = nameMatch[1].trim();
          } catch {}
        }

        matches.push({
          dir,
          type: chatType,
          platform: chatPlatform,
          chatId,
          name: name || "(no name)",
          matchContext,
        });
      }
    }

    if (matches.length === 0) {
      return { content: [{ type: "text" as const, text: `No chats found matching "${query}".` }], details: undefined };
    }

    const lines = matches.map(m =>
      `- [${m.type}] ${m.platform} | chatId: ${m.chatId} | name: ${m.name}\n  match: ${m.matchContext}`
    );

    auditToolUse("find_chat", { query, platform }, { matchCount: matches.length });
    return { content: [{ type: "text" as const, text: `Found ${matches.length} chat(s) matching "${query}":\n${lines.join("\n")}` }], details: undefined };
  },
};

// ─── NOTIFY OWNER (TELEGRAM) ─────────────────────────────────

const notifyOwnerSchema = Type.Object({
  message: Type.String({ description: "The message to send to Ana (the owner) via Telegram. Be concise, warm, and useful." }),
});

const notifyOwnerTool: AgentTool<typeof notifyOwnerSchema> = {
  name: "notify_owner",
  label: "Notify Owner",
  description: "Send a Telegram message to Ana (the owner/operator). Use this when you need to proactively alert her about something important, share an insight, or respond to a request to contact her. This actually sends a real Telegram message — use it intentionally.",
  parameters: notifyOwnerSchema,
  execute: async (_id, { message }) => {
    if (!canNotify()) {
      auditToolUse("notify_owner", {}, { error: "telegram_unavailable" });
      return {
        content: [{ type: "text" as const, text: "Cannot send: Telegram bot is not initialized or OWNER_TELEGRAM_ID is not set." }],
        details: { sent: false },
      };
    }
    try {
      const sent = await notifyOwner(message);
      auditToolUse("notify_owner", { messageLength: message.length }, { sent });
      if (sent) {
        return {
          content: [{ type: "text" as const, text: "Message sent to Ana via Telegram." }],
          details: { sent: true },
        };
      } else {
        return {
          content: [{ type: "text" as const, text: "Failed to send message to Ana. The Telegram API returned an error." }],
          details: { sent: false },
        };
      }
    } catch (err: any) {
      auditToolUse("notify_owner", { messageLength: message.length }, { error: err.message });
      return {
        content: [{ type: "text" as const, text: `Failed to notify Ana: ${err.message}` }],
        details: { sent: false, error: err.message },
      };
    }
  },
};

// ─── SYNTROPY MAILBOX TOOL ────────────────────────────────────

const syntropyNotifySchema = Type.Object({
  message: Type.String({ description: "Message for Syntropy (oversoul/infrastructure agent). Be concise and actionable." }),
  priority: Type.Optional(Type.Union([
    Type.Literal("low"),
    Type.Literal("normal"),
    Type.Literal("urgent"),
  ], { description: "Priority level for Syntropy" })),
});

const syntropyNotifyTool: AgentTool<typeof syntropyNotifySchema> = {
  name: "syntropy_notify",
  label: "Notify Syntropy",
  description: "Send a message to Syntropy (the oversoul/infrastructure agent). Writes to a shared mailbox that Syntropy reads each cycle.",
  parameters: syntropyNotifySchema,
  execute: async (_id, { message, priority }) => {
    const mailboxPath = "/app/data/syntropy-mailbox.jsonl";
    const entry = {
      timestamp: new Date().toISOString(),
      priority: priority || "normal",
      message,
    };
    try {
      const dir = dirname(mailboxPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(mailboxPath, `${JSON.stringify(entry)}\n`, { flag: "a" });
      auditToolUse("syntropy_notify", { priority: entry.priority }, { mailboxPath });
      return {
        content: [{ type: "text" as const, text: `Message queued for Syntropy (${entry.priority}).` }],
        details: { mailboxPath },
      };
    } catch (err: any) {
      auditToolUse("syntropy_notify", { priority: priority || "normal" }, { error: err.message });
      return {
        content: [{ type: "text" as const, text: `Failed to notify Syntropy: ${err.message}` }],
        details: { error: err.message },
      };
    }
  },
};

// ─── LONG-TERM MEMORY TOOLS ──────────────────────────────────

const memorySaveSchema = Type.Object({
  content: Type.String({ description: "The fact, knowledge, or observation to remember. Be specific and concise." }),
  type: Type.Optional(Type.String({ description: "Memory type: 'fact' (concrete knowledge), 'episode' (interaction summary), 'identity' (self-knowledge), 'procedural' (skill/pattern). Default: 'fact'" })),
  user_id: Type.Optional(Type.String({ description: "User ID this memory relates to (omit for global/self memories)" })),
  platform: Type.Optional(Type.String({ description: "Platform where this was learned (omit for cross-platform)" })),
});

const memorySaveTool: AgentTool<typeof memorySaveSchema> = {
  name: "memory_save",
  label: "Save Memory",
  description: "Save an important fact, observation, or learning to long-term memory. Use this when you learn something worth remembering across conversations — user preferences, important facts, self-insights, or procedural knowledge. The memory system automatically deduplicates and merges with existing similar memories.",
  parameters: memorySaveSchema,
  execute: async (_id, { content, type, user_id, platform }) => {
    try {
      // Use tool context for user_id/platform if not explicitly provided
      const effectiveUserId = user_id || _toolContext.userId;
      const effectivePlatform = platform || _toolContext.platform;

      const result = await memorySave({
        content,
        type: (type as any) || "fact",
        userId: effectiveUserId,
        platform: effectivePlatform,
        source: "agent",
      });

      auditToolUse("memory_save", { content: content.slice(0, 80), type, user_id: effectiveUserId }, { memoryId: result.id });
      return {
        content: [{ type: "text" as const, text: `Memory saved (id=${result.id}, type=${result.type}): "${result.content.slice(0, 100)}${result.content.length > 100 ? '...' : ''}"` }],
        details: undefined,
      };
    } catch (err: any) {
      auditToolUse("memory_save", { content: content.slice(0, 80), type }, { error: err.message });
      return { content: [{ type: "text" as const, text: `Failed to save memory: ${err.message}` }], details: undefined };
    }
  },
};

const memorySearchSchema = Type.Object({
  query: Type.String({ description: "Natural language search query — what are you looking for?" }),
  user_id: Type.Optional(Type.String({ description: "Filter to memories about a specific user" })),
  type: Type.Optional(Type.String({ description: "Filter by memory type: 'fact', 'episode', 'identity', 'procedural'" })),
  limit: Type.Optional(Type.Number({ description: "Max results to return (default: 10)" })),
});

const memorySearchTool: AgentTool<typeof memorySearchSchema> = {
  name: "memory_search",
  label: "Search Memory",
  description: "Search your long-term memory for relevant facts, past interactions, or knowledge. Uses semantic similarity — describe what you're looking for in natural language. Results are ranked by relevance and recency.",
  parameters: memorySearchSchema,
  execute: async (_id, { query, user_id, type, limit }) => {
    try {
      const effectiveUserId = user_id || _toolContext.userId;

      const results = await memorySearch(query, {
        userId: effectiveUserId,
        type,
        topK: limit || 10,
      });

      if (results.length === 0) {
        auditToolUse("memory_search", { query, user_id: effectiveUserId }, { resultCount: 0 });
        return { content: [{ type: "text" as const, text: `No memories found matching "${query}".` }], details: undefined };
      }

      const lines = results.map((m, i) =>
        `${i + 1}. [id=${m.id}] (${m.type}, ${(m.similarity! * 100).toFixed(0)}% match) ${m.content}${m.userId ? ` [user: ${m.userId}]` : ''}`
      );

      auditToolUse("memory_search", { query, user_id: effectiveUserId }, { resultCount: results.length });
      return { content: [{ type: "text" as const, text: `Found ${results.length} memories:\n${lines.join("\n")}` }], details: undefined };
    } catch (err: any) {
      auditToolUse("memory_search", { query }, { error: err.message });
      return { content: [{ type: "text" as const, text: `Memory search failed: ${err.message}` }], details: undefined };
    }
  },
};

const memoryUpdateSchema = Type.Object({
  id: Type.Number({ description: "Memory ID to update" }),
  content: Type.String({ description: "New content for this memory" }),
});

const memoryUpdateTool: AgentTool<typeof memoryUpdateSchema> = {
  name: "memory_update",
  label: "Update Memory",
  description: "Update an existing memory with new content. Use when a fact has changed or needs correction. The memory's embedding is regenerated automatically.",
  parameters: memoryUpdateSchema,
  execute: async (_id, { id, content }) => {
    try {
      const result = await memoryUpdate(id, content);
      if (!result) {
        return { content: [{ type: "text" as const, text: `Memory ${id} not found or already expired.` }], details: undefined };
      }

      auditToolUse("memory_update", { id, content: content.slice(0, 80) }, { success: true });
      return { content: [{ type: "text" as const, text: `Memory ${id} updated: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"` }], details: undefined };
    } catch (err: any) {
      auditToolUse("memory_update", { id }, { error: err.message });
      return { content: [{ type: "text" as const, text: `Failed to update memory: ${err.message}` }], details: undefined };
    }
  },
};

const memoryDeleteSchema = Type.Object({
  id: Type.Number({ description: "Memory ID to delete (soft delete — marks as expired)" }),
});

const memoryDeleteTool: AgentTool<typeof memoryDeleteSchema> = {
  name: "memory_delete",
  label: "Delete Memory",
  description: "Soft-delete a memory by marking it as expired. Use when information is no longer true or relevant. The memory remains in the database for audit purposes but won't appear in searches.",
  parameters: memoryDeleteSchema,
  execute: async (_id, { id }) => {
    try {
      const success = await memoryDelete(id);
      if (!success) {
        return { content: [{ type: "text" as const, text: `Memory ${id} not found or already expired.` }], details: undefined };
      }

      auditToolUse("memory_delete", { id }, { success: true });
      return { content: [{ type: "text" as const, text: `Memory ${id} marked as expired (soft-deleted).` }], details: undefined };
    } catch (err: any) {
      auditToolUse("memory_delete", { id }, { error: err.message });
      return { content: [{ type: "text" as const, text: `Failed to delete memory: ${err.message}` }], details: undefined };
    }
  },
};

// ─── INTROSPECT ───────────────────────────────────────────────

const introspectSchema = Type.Object({
  tool: Type.Optional(Type.String({ description: "Name of a specific tool to inspect in detail (omit to list all tools)" })),
});

/**
 * Self-discovery tool — lets Pixel programmatically list and inspect
 * all available tools, their descriptions, and parameter schemas.
 */
const introspectTool: AgentTool<typeof introspectSchema> = {
  name: "introspect",
  label: "Introspect Tools",
  description: "List all available tools with their names, descriptions, and parameter schemas. Use this to discover what capabilities you have at runtime.",
  parameters: introspectSchema,
  execute: async (_id, { tool }) => {
    // Build the tool list from pixelTools (which includes introspectTool itself)
    const allTools = pixelTools;

    if (tool) {
      // Detail view for a specific tool
      const found = allTools.find((t) => t.name === tool);
      if (!found) {
        const names = allTools.map((t) => t.name).join(", ");
        return {
          content: [{ type: "text", text: `Tool "${tool}" not found. Available tools: ${names}` }],
          details: undefined,
        };
      }

      const params = found.parameters?.properties
        ? Object.entries(found.parameters.properties).map(([name, schema]: [string, any]) => {
            const required = found.parameters?.required?.includes(name) ?? false;
            return `  - ${name}${required ? "" : " (optional)"}: ${schema.type ?? "any"} — ${schema.description ?? "no description"}`;
          })
        : ["  (no parameters)"];

      const detail = [
        `Tool: ${found.name}`,
        `Label: ${found.label ?? found.name}`,
        `Description: ${found.description}`,
        `Parameters:`,
        ...params,
      ].join("\n");

      auditToolUse("introspect", { tool }, { found: true });
      return { content: [{ type: "text", text: detail }], details: { tool: found.name } };
    }

    // Summary view — all tools
    const summary = allTools.map((t) => {
      const paramNames = t.parameters?.properties
        ? Object.keys(t.parameters.properties).join(", ")
        : "none";
      return `- ${t.name}: ${t.description?.slice(0, 100) ?? "no description"} [params: ${paramNames}]`;
    });

    const output = `${allTools.length} tools available:\n\n${summary.join("\n")}\n\nUse introspect(tool="<name>") for detailed parameter info.`;

    auditToolUse("introspect", {}, { count: allTools.length });
    return { content: [{ type: "text", text: output }], details: { count: allTools.length } };
  },
};

// ─── SEND VOICE ──────────────────────────────────────────────

import { textToSpeech } from "./tts.js";
import { sendTelegramVoice } from "../connectors/telegram.js";

const sendVoiceSchema = Type.Object({
  text: Type.String({ description: "The text to speak. Natural speech only — no markdown, no code blocks. Under 1500 chars." }),
  chat_id: Type.Optional(Type.String({ description: "Telegram chat ID to send to. Omit to use current conversation. Use this to speak in any chat you know — groups, DMs, owner." })),
});

const sendVoiceTool: AgentTool<typeof sendVoiceSchema> = {
  name: "send_voice",
  label: "Send Voice Message",
  description: "Your voice — synthesize speech and send it as a voice message. Works on Telegram (any chat you can reach). Auto-detects language (es/en/fr/pt/ja/zh). Use it to reply with voice, drop a note in a group, send Ana a voice update, or speak during autonomous cycles. You decide when to use your voice.",
  parameters: sendVoiceSchema,
  execute: async (_id, { text, chat_id }) => {
    const ctx = getToolContext();
    const targetChat = chat_id || ctx.chatId;
    if (!targetChat) {
      auditToolUse("send_voice", { text: text.slice(0, 80) }, { error: "no_target" });
      return { content: [{ type: "text" as const, text: "No target chat — pass chat_id or use during a conversation." }] };
    }

    const buffer = await textToSpeech(text);
    if (!buffer) {
      auditToolUse("send_voice", { text: text.slice(0, 80), chat_id: targetChat }, { error: "tts_failed" });
      return { content: [{ type: "text" as const, text: "TTS failed. Voice not sent." }] };
    }

    const sent = await sendTelegramVoice(targetChat, buffer);
    if (!sent) {
      auditToolUse("send_voice", { text: text.slice(0, 80), chat_id: targetChat }, { error: "send_failed" });
      return { content: [{ type: "text" as const, text: "Generated audio but Telegram send failed." }] };
    }

    // Log voice message into target chat's conversation context so it knows what Pixel said
    const chatIdStr = String(targetChat);
    const conversationId = chatIdStr.startsWith("tg-") ? chatIdStr
      : chatIdStr.startsWith("-") ? `tg-group-${chatIdStr}` : `tg-${chatIdStr}`;
    appendToLog(conversationId, "", `[voice message sent]: ${text}`, "telegram");

    auditToolUse("send_voice", { text: text.slice(0, 80), chat_id: targetChat, chars: text.length, bytes: buffer.byteLength }, { sent: true });
    return { content: [{ type: "text" as const, text: `Voice sent to ${targetChat} (${text.length} chars → ${buffer.byteLength} bytes).` }] };
  },
};

// ─── EXPORT ALL TOOLS ─────────────────────────────────────────

export const pixelTools = [
  readFileTool,
  writeFileTool,
  editFileTool,
  bashTool,
  checkHealthTool,
  readLogsTool,
  webFetchTool,
  webSearchTool,
  researchTaskTool,
  memorySaveTool,
  memorySearchTool,
  memoryUpdateTool,
  memoryDeleteTool,
  scheduleAlarmTool,
  listAlarmsTool,
  cancelAlarmTool,
  cancelAllAlarmsTool,
  modifyAlarmTool,
  listChatsTool,
  findChatTool,
  syntropyNotifyTool,
  notifyOwnerTool,
  clawstrFeedTool,
  clawstrPostTool,
  clawstrReplyTool,
  clawstrNotificationsTool,
  clawstrUpvoteTool,
  clawstrSearchTool,
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitShowTool,
  gitBranchTool,
  gitCloneTool,
  gitPullTool,
  gitPushTool,
  gitCommitTool,
  sshTool,
  wpCliTool,
  introspectTool,
  sendVoiceTool,
];

// Map of tool names to their implementations
const toolImplementations: Record<string, AgentTool<any>> = {
  read_file: readFileTool,
  write_file: writeFileTool,
  edit_file: editFileTool,
  bash: bashTool,
  check_health: checkHealthTool,
  read_logs: readLogsTool,
  web_fetch: webFetchTool,
  web_search: webSearchTool,
  research_task: researchTaskTool,
  memory_save: memorySaveTool,
  memory_search: memorySearchTool,
  memory_update: memoryUpdateTool,
  memory_delete: memoryDeleteTool,
  introspect: introspectTool,
};

/**
 * Execute a tool by name with given arguments.
 * Used by reminder service to run tools before sending reminders.
 * 
 * Only exposes safe read-only tools: check_health, read_logs, web_fetch
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<string> {
  const tool = toolImplementations[toolName];
  if (!tool) {
    return `[Error: Unknown tool '${toolName}']`;
  }

  try {
    // Execute the tool handler
    const result = await tool.execute("internal", args as any);
    if (typeof result === "string") {
      return result;
    }
    return JSON.stringify(result, null, 2);
  } catch (err: any) {
    return `[Error executing ${toolName}: ${err.message}]`;
  }
}
