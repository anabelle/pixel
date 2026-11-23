/**
 * Sibling Mail — the shared coordination board (Agent Mail) with Pixel's siblings.
 *
 * Marvin 2026-11-23: siblings board. Syntropy is retired (2026-11-16) and nothing
 * reads data/syntropy-mailbox.jsonl any more, so the board is the transport for
 * escalations and handoffs. Identity/config: /app/data/sib-client.env (host path
 * data/sib-client.env) with SIB_URL, SIB_PROJECT, SIB_AGENT, SIB_BEARER,
 * SIB_AGENT_TOKEN. NEVER log the env values — SIB_BEARER and SIB_AGENT_TOKEN are
 * secrets.
 *
 * Protocol: JSON-RPC 2.0 over HTTP, bearer auth. Some MCP hosts answer with SSE
 * frames, so Accept includes text/event-stream and we keep the last `data:` line.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { dirname } from "path";

const SIB_CLIENT_PATH = "/app/data/sib-client.env";

/** Retired Syntropy mailbox — append-only FALLBACK, used only when the board is unreachable. */
export const MAILBOX_FALLBACK_PATH = "/app/data/syntropy-mailbox.jsonl";

export interface SiblingConfig {
  url: string;
  project: string;
  agent: string;
  /** Bearer credential for the MCP endpoint — secret, never log. */
  bearer: string;
  /** Token authenticating SIB_AGENT as a sender — secret, never log. */
  agentToken: string;
}

let cachedConfig: SiblingConfig | null = null;

/** Load the board client config (cached after the first read). Errors never include values. */
export function loadConfig(): SiblingConfig {
  if (cachedConfig) return cachedConfig;
  if (!existsSync(SIB_CLIENT_PATH)) {
    throw new Error("sibling board config not found (/app/data/sib-client.env)");
  }
  const env: Record<string, string> = {};
  for (const line of readFileSync(SIB_CLIENT_PATH, "utf-8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!env.SIB_URL || !env.SIB_PROJECT || !env.SIB_AGENT || !env.SIB_BEARER || !env.SIB_AGENT_TOKEN) {
    throw new Error("sibling board config incomplete (need SIB_URL, SIB_PROJECT, SIB_AGENT, SIB_BEARER, SIB_AGENT_TOKEN)");
  }
  cachedConfig = {
    url: env.SIB_URL,
    project: env.SIB_PROJECT,
    agent: env.SIB_AGENT,
    bearer: env.SIB_BEARER,
    agentToken: env.SIB_AGENT_TOKEN,
  };
  return cachedConfig;
}

/** One JSON-RPC call against the board. 10s hard timeout; secrets never logged. */
async function rpc(method: string, params: Record<string, unknown>): Promise<any> {
  const cfg = loadConfig();
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cfg.bearer}`,
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`sibling board HTTP ${res.status}`);
  let text = await res.text();
  // SSE-framed responses: keep the last data: line.
  if (text.startsWith("event:") || text.startsWith("data:")) {
    const dataLines = text.split(/\r?\n/).filter((l) => l.startsWith("data:"));
    if (dataLines.length === 0) throw new Error("sibling board: SSE response without data frames");
    text = dataLines[dataLines.length - 1].slice("data:".length).trim();
  }
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("sibling board: non-JSON response");
  }
  if (json?.error) throw new Error(String(json.error.message ?? "sibling board rpc error"));
  return json.result;
}

/**
 * Unwrap a tools/call result: result.content[0].text holds a JSON string;
 * result.isError true, or a parsed {error:{message}}, means failure.
 */
function parseToolResult(result: any): any {
  const raw = result?.content?.[0]?.text;
  if (!result || result.isError) {
    throw new Error(typeof raw === "string" && raw ? raw : "sibling board tool error");
  }
  if (typeof raw !== "string") return result;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw; // plain-text tool result
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.error) {
    throw new Error(String(parsed.error.message ?? "sibling board error"));
  }
  return parsed;
}

/** tools/call with project_key injected from config. */
async function callTool(name: string, args: Record<string, unknown>): Promise<any> {
  const cfg = loadConfig();
  return parseToolResult(await rpc("tools/call", { name, arguments: { project_key: cfg.project, ...args } }));
}

// ─── Public API ───────────────────────────────────────────────

export interface SiblingInboxMessage {
  id: number;
  from: string;
  subject: string;
  thread_id?: string | number;
  importance?: string;
  ack_required?: boolean;
  created_ts?: string;
  body_md?: string;
}

export interface SendSiblingMailOptions {
  to: string[];
  subject: string;
  body: string;
  threadId?: string;
  importance?: "low" | "normal" | "high" | "urgent";
  ackRequired?: boolean;
}

/** Send a new message on the board (as SIB_AGENT). */
export async function sendSiblingMail(opts: SendSiblingMailOptions): Promise<any> {
  const cfg = loadConfig();
  return callTool("send_message", {
    sender_name: cfg.agent,
    sender_token: cfg.agentToken,
    to: opts.to,
    subject: opts.subject,
    body_md: opts.body,
    ...(opts.threadId != null ? { thread_id: opts.threadId } : {}),
    ...(opts.importance ? { importance: opts.importance } : {}),
    ...(opts.ackRequired != null ? { ack_required: opts.ackRequired } : {}),
  });
}

/** Reply to a message by id (as SIB_AGENT). */
export async function replySiblingMail(messageId: number, body: string): Promise<any> {
  const cfg = loadConfig();
  return callTool("reply_message", {
    sender_name: cfg.agent,
    sender_token: cfg.agentToken,
    message_id: messageId,
    body_md: body,
  });
}

/** Fetch pixel-art's inbox. mark_read is always false here — listing never marks read. */
export async function fetchSiblingInbox(
  opts: { unreadOnly?: boolean; limit?: number; includeBodies?: boolean } = {}
): Promise<SiblingInboxMessage[]> {
  const cfg = loadConfig();
  const parsed = await callTool("fetch_inbox", {
    agent_name: cfg.agent,
    ...(opts.unreadOnly != null ? { unread_only: opts.unreadOnly } : {}),
    ...(opts.limit != null ? { limit: opts.limit } : {}),
    ...(opts.includeBodies != null ? { include_bodies: opts.includeBodies } : {}),
    mark_read: false,
  });
  if (Array.isArray(parsed)) return parsed as SiblingInboxMessage[];
  if (Array.isArray(parsed?.messages)) return parsed.messages as SiblingInboxMessage[];
  if (Array.isArray(parsed?.inbox)) return parsed.inbox as SiblingInboxMessage[];
  return [];
}

/** Mark a message read (handled/done). */
export async function markSiblingDone(id: number): Promise<any> {
  const cfg = loadConfig();
  return callTool("mark_message_read", { agent_name: cfg.agent, message_id: id });
}

/** Acknowledge a message (for ack_required mail). */
export async function ackSiblingMail(id: number): Promise<any> {
  const cfg = loadConfig();
  return callTool("acknowledge_message", { agent_name: cfg.agent, message_id: id });
}

/** Read a whole thread (with bodies) via the resources/read MCP method. Does not mark read. */
export async function readSiblingThread(threadId: string): Promise<SiblingInboxMessage[]> {
  const cfg = loadConfig();
  const result = await rpc("resources/read", {
    uri: `resource://thread/${encodeURIComponent(threadId)}?include_bodies=true&project=${cfg.project}`,
  });
  const raw = result?.contents?.[0]?.text;
  if (typeof raw !== "string") throw new Error("sibling board: thread resource returned no text");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("sibling board: thread resource is not JSON");
  }
  if (parsed && typeof parsed === "object" && parsed.error) {
    throw new Error(String(parsed.error.message ?? "sibling board thread error"));
  }
  return Array.isArray(parsed?.messages) ? (parsed.messages as SiblingInboxMessage[]) : [];
}

/**
 * Fallback when the board is unreachable: append to the retired Syntropy mailbox
 * so nothing is silently lost. Nothing reads it any more — callers should say
 * "queued locally; board unreachable" in their output.
 */
export function appendMailboxFallback(entry: Record<string, unknown>): void {
  const dir = dirname(MAILBOX_FALLBACK_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(MAILBOX_FALLBACK_PATH, JSON.stringify(entry) + "\n");
}
