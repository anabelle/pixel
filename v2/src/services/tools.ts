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
        content: [{ type: "text", text: `Directory listing of ${resolved}:\n${entries.join("\n")}` }],
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
      content: [{ type: "text", text: result }],
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
      content: [{ type: "text", text: `Wrote ${content.length} bytes to ${resolved}` }],
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
      content: [{ type: "text", text: `Edited ${resolved}: replaced ${replaced} occurrence(s)` }],
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
        content: [{ type: "text", text: output }],
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
      content: [{ type: "text", text: results.join("\n") }],
      details: undefined,
    };
    auditToolUse("check_health", { service }, { resultsCount: results.length });
    return result;
  },
};

// ─── READ LOGS ────────────────────────────────────────────────

const logsSchema = Type.Object({
  source: Type.String({ description: "Log source: 'self' (own stdout), 'conversations' (list user conversations), 'revenue' (revenue stats), or a specific conversation id" }),
  lines: Type.Optional(Type.Number({ description: "Number of recent lines to show (default: 50)" })),
  conversationId: Type.Optional(Type.String({ description: "Conversation ID (e.g. tg-group--4839030836)" })),
  includeContext: Type.Optional(Type.Boolean({ description: "Include current context.json if available (default: false)" })),
});

export const readLogsTool: AgentTool<typeof logsSchema> = {
  name: "read_logs",
  label: "Read Logs",
  description: "Read Pixel's own logs, conversation history, or revenue data.",
  parameters: logsSchema,
  execute: async (_id, { source, lines, conversationId, includeContext }) => {
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
        return { content: [{ type: "text", text: `No log for ${safeId}` }], details: undefined };
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
      return { content: [{ type: "text", text: output }], details: { count: tail.length } };
    }

    switch (source) {
      case "conversations": {
        if (!existsSync(convDir)) return { content: [{ type: "text", text: "No conversations directory" }], details: undefined };
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
          content: [{ type: "text", text: `${users.length} conversations:\n${summaries.join("\n")}` }],
          details: { count: users.length },
        };
        auditToolUse("read_logs", { source }, { count: users.length });
        return result;
      }
      case "revenue": {
        try {
          const res = await fetch("http://127.0.0.1:4000/api/revenue", { signal: AbortSignal.timeout(5000) });
          const data = await res.json();
          auditToolUse("read_logs", { source }, { ok: true });
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            details: data,
          };
        } catch (e: any) {
          auditToolUse("read_logs", { source }, { error: e.message });
          throw new Error(`Failed to fetch revenue: ${e.message}`);
        }
      }
      case "self":
      default: {
        // Read from data directory if we're logging there, otherwise just report status
        auditToolUse("read_logs", { source }, { ok: true });
        return {
          content: [{ type: "text", text: "Self-logs are in container stdout. Use bash tool with: 'echo check health endpoint instead' or check_health tool for live status." }],
          details: undefined,
        };
      }
    }
  },
};

// ─── WEB FETCH ────────────────────────────────────────────────

const webFetchSchema = Type.Object({
  url: Type.String({ description: "URL to fetch" }),
  method: Type.Optional(Type.String({ description: "HTTP method (default: GET)" })),
});

export const webFetchTool: AgentTool<typeof webFetchSchema> = {
  name: "web_fetch",
  label: "Fetch URL",
  description: "Fetch a URL and return the response. For web research, checking APIs, reading documentation.",
  parameters: webFetchSchema,
  execute: async (_id, { url, method }) => {
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
      // Truncate large responses
      if (body.length > 30_000) {
        body = body.slice(0, 30_000) + `\n\n[... truncated, total ${body.length} chars]`;
      }
      const result = {
        content: [{ type: "text", text: `${res.status} ${res.statusText}\n\n${body}` }],
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
    return { content: [{ type: "text", text: output }], details: undefined };
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
    return { content: [{ type: "text", text: output }], details: undefined };
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
    return { content: [{ type: "text", text: output }], details: undefined };
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
    return { content: [{ type: "text", text: output }], details: undefined };
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
    return { content: [{ type: "text", text: output }], details: undefined };
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
    return { content: [{ type: "text", text: output }], details: undefined };
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
      content: [{ type: "text", text: lines.length ? stdout : "Working tree clean" }],
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
      content: [{ type: "text", text: truncated || "No changes" }],
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
      content: [{ type: "text", text: stdout || "No commits" }],
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
      content: [{ type: "text", text: truncated || "Not found" }],
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
      content: [{ type: "text", text: stdout || "No branches" }],
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
      content: [{ type: "text", text: `Cloned to ${target}\n${stdout}${stderr}` }],
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
      content: [{ type: "text", text: stdout || stderr }],
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
      content: [{ type: "text", text: stdout || "Pushed successfully" }],
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
      content: [{ type: "text", text: stdout || "Committed successfully" }],
      details: { repo },
    };
    auditToolUse("git_commit", { repo, message, files }, { success: true });
    return result;
  },
};

// ─── SSH EXECUTE ───────────────────────────────────────────────

const sshSchema = Type.Object({
  host: Type.String({ description: "SSH host (IP or hostname). Falls back to TALLERUBENS_SSH_HOST env var if not provided." }),
  user: Type.Optional(Type.String({ description: "SSH user (default: root)" })),
  port: Type.Optional(Type.Number({ description: "SSH port (default: 22)" })),
  command: Type.String({ description: "Command to execute on remote server" }),
  key: Type.Optional(Type.String({ description: "Private SSH key content (falls back to TALLERUBENS_SSH_KEY env var)" })),
});

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
      const keyContent = Buffer.from(effectiveKey, "base64").toString("utf-8");
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
      content: [{ type: "text", text: truncated || "Command executed successfully" }],
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
});

export const wpCliTool: AgentTool<typeof wpCliSchema> = {
  name: "wp",
  label: "WP-CLI",
  description: "Run WordPress commands via WP-CLI. Use for managing WordPress sites like tallerubens.com. Uses TALLERUBENS_SSH_* env vars as fallback.",
  parameters: wpCliSchema,
  execute: async (_id, { command, host, user, path }) => {
    const effectiveHost = host ?? process.env.TALLERUBENS_SSH_HOST;
    const effectivePath = path ?? process.env.TALLERUBENS_WP_PATH;
    const effectiveUser = user ?? process.env.TALLERUBENS_SSH_USER ?? "root";
    
    let fullCommand = "wp " + command;
    
    if (effectivePath) {
      fullCommand = `cd ${effectivePath} && wp ${command}`;
    }

    if (effectiveHost) {
      const sshArgs = ["-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "PreferredAuthentications=publickey", "-o", "IdentitiesOnly=yes"];
      const target = `${effectiveUser}@${effectiveHost}`;
      
      const keyContent = process.env.TALLERUBENS_SSH_KEY ? Buffer.from(process.env.TALLERUBENS_SSH_KEY, "base64").toString("utf-8") : null;
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
      return { content: [{ type: "text", text: truncated }], details: { exitCode } };
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
      return { content: [{ type: "text", text: truncated }], details: { exitCode } };
    }
  },
};

// ─── ALARM CLOCK TOOLS ───────────────────────────────────────

const scheduleAlarmSchema = Type.Object({
  user_id: Type.String({ description: "Platform-specific user ID" }),
  platform: Type.String({ description: "Platform (telegram/whatsapp/nostr/etc)" }),
  platform_chat_id: Type.Optional(Type.String({ description: "Target chat ID for delivering the alarm. IMPORTANT: use the Chat ID from the system prompt context." })),
  raw_message: Type.String({ description: "Raw intent message to store" }),
  due_at: Type.String({ description: "ISO datetime to fire" }),
  repeat_pattern: Type.Optional(Type.String({ description: "Optional repeat pattern (freeform)" })),
  repeat_count: Type.Optional(Type.Number({ description: "Optional repeat count (null = infinite)" })),
});

export const scheduleAlarmTool: AgentTool<typeof scheduleAlarmSchema> = {
  name: "schedule_alarm",
  label: "Schedule Alarm",
  description: "Schedule a dumb alarm clock entry. Stores raw message + due time.",
  parameters: scheduleAlarmSchema,
  execute: async (_id, { user_id, platform, platform_chat_id, raw_message, due_at, repeat_pattern, repeat_count }) => {
    const dueAt = new Date(due_at);
    if (isNaN(dueAt.getTime())) {
      throw new Error(`Invalid due_at: ${due_at}`);
    }

    const reminder = await storeReminder({
      userId: user_id,
      platform,
      platformChatId: platform_chat_id,
      rawMessage: raw_message,
      dueAt,
      repeatPattern: repeat_pattern ?? null,
      repeatCount: repeat_count ?? null,
      firesRemaining: repeat_count ?? null,
    });

    return {
      content: [{ type: "text", text: `Scheduled alarm #${reminder.id} for ${dueAt.toISOString()}` }],
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
    return { content: [{ type: "text", text }] };
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
    return { content: [{ type: "text", text: ok ? `Cancelled alarm #${alarm_id}` : `Alarm #${alarm_id} not found` }] };
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
    return { content: [{ type: "text", text: `Cancelled ${count} alarms.` }] };
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
      return { content: [{ type: "text", text: `Alarm #${alarm_id} not found or not modified.` }] };
    }
    return { content: [{ type: "text", text: `Updated alarm #${alarm_id}` }] };
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
  scheduleAlarmTool,
  listAlarmsTool,
  cancelAlarmTool,
  cancelAllAlarmsTool,
  modifyAlarmTool,
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
    const result = await tool.handler(args);
    if (typeof result === "string") {
      return result;
    }
    return JSON.stringify(result, null, 2);
  } catch (err: any) {
    return `[Error executing ${toolName}: ${err.message}]`;
  }
}
