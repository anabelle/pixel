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
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { getClawstrNotifications, getClawstrFeed, getClawstrSearch, postClawstr, replyClawstr, upvoteClawstr } from "./clawstr.js";
import { auditToolUse } from "./audit.js";

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
      if (!existsSync(logFile)) {
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

// ─── EXPORT ALL TOOLS ─────────────────────────────────────────

export const pixelTools = [
  readFileTool,
  writeFileTool,
  editFileTool,
  bashTool,
  checkHealthTool,
  readLogsTool,
  webFetchTool,
  clawstrFeedTool,
  clawstrPostTool,
  clawstrReplyTool,
  clawstrNotificationsTool,
  clawstrUpvoteTool,
  clawstrSearchTool,
];
