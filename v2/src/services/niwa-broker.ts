import { randomUUID } from "node:crypto";
import { isNIWABrokerAuthorized, resolveServer } from "./server-registry.js";

const MAX_REQUEST_BYTES = 256 * 1024;
const KEY_FILE = "/app/data/keys/niwa-broker_ed25519";
const KNOWN_HOSTS_FILE = "/app/data/keys/niwa-broker_known_hosts";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface NIWAContext { userId?: string; authUserId?: string }
export interface NIWAParams {
  server?: string;
  command: string;
  [key: string]: unknown;
}

export type NIWARequest = { v: 1; request_id: string } & (
  | { op: "status" }
  | { op: "wp"; argv: string[] }
  | { op: "file.read" | "file.list"; path: string }
  | { op: "file.write"; path: string; content_b64: string; expected_sha256: string | null }
);

/** Tokenize without evaluating a shell. Metacharacters are data only inside quotes. */
export function tokenizeNIWAWP(command: string): string[] {
  if (typeof command !== "string" || Buffer.byteLength(command) > MAX_REQUEST_BYTES) throw new Error("NIWA command too large or invalid.");
  const tokens: string[] = [];
  let token = "", quote = "", active = false;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (ch === "\0" || ch === "\n" || ch === "\r") throw new Error("NIWA command contains a control character.");
    if (ch === "\\" && quote !== "'") {
      if (++i >= command.length || /[\0\r\n]/.test(command[i])) throw new Error("NIWA command has invalid escaping.");
      token += command[i]; active = true;
    } else if (quote) {
      if (ch === quote) quote = "";
      else token += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch; active = true;
    } else if (/\s/.test(ch)) {
      if (active) { tokens.push(token); token = ""; active = false; }
    } else {
      if (/[;&|<>`$()]/.test(ch)) throw new Error("NIWA does not accept shell syntax.");
      token += ch; active = true;
    }
  }
  if (quote) throw new Error("NIWA command has an unclosed quote.");
  if (active) tokens.push(token);
  if (tokens[0] === "wp") tokens.shift();
  validateWPArgv(tokens);
  return tokens;
}

function validateWPArgv(argv: unknown): asserts argv is string[] {
  if (!Array.isArray(argv) || argv.length === 0 || argv.length > 128 || argv.some(a => typeof a !== "string" || a.length > 65536 || /[\0\r\n]/.test(a))) {
    throw new Error("NIWA WP argv must contain 1–128 bounded strings.");
  }
  if (!/^[a-z][a-z0-9-]*$/.test(argv[0]) || ["wp", "eval", "eval-file", "shell", "cli"].includes(argv[0])) throw new Error("NIWA WP command is restricted.");
  for (const arg of argv) {
    // Reject routing/code-loading globals in every position, including --flag=value.
    if (/^--(?:path|require|exec|ssh|http)(?:=|$)/i.test(arg)) throw new Error("NIWA WP routing and code-execution flags are forbidden.");
    if ([";", "&&", "||", "|", ">", "<"].includes(arg)) throw new Error("NIWA does not accept shell chains.");
  }
}

function validatePath(path: unknown): asserts path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > 4096 || /[\x00-\x1f\x7f\\]/.test(path) || path.startsWith("/") || path.split("/").some(p => p === ".." || p === "")) {
    throw new Error("NIWA file path must be relative and contain no traversal.");
  }
}

/** Validate and copy only protocol fields; unknown fields and operations fail closed. */
export function validateNIWARequest(input: unknown): NIWARequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("NIWA request must be a JSON object.");
  const r = input as Record<string, unknown>;
  if (r.v !== 1) throw new Error("NIWA protocol version must be 1.");
  const fields = ["v", "op", "request_id"];
  switch (r.op) {
    case "status": break;
    case "wp": fields.push("argv"); validateWPArgv(r.argv); break;
    case "file.read": case "file.list": fields.push("path"); validatePath(r.path); break;
    case "file.write":
      fields.push("path", "content_b64", "expected_sha256"); validatePath(r.path);
      if (typeof r.content_b64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(r.content_b64)) throw new Error("NIWA file content must be base64.");
      if (r.expected_sha256 !== null && (typeof r.expected_sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(r.expected_sha256))) throw new Error("NIWA write requires expected_sha256: null for creation, or the existing SHA256.");
      break;
    default: throw new Error("NIWA operation is unsupported.");
  }
  if (Object.keys(r).some(k => !fields.includes(k))) throw new Error("NIWA request contains unsupported fields.");
  if (r.request_id !== undefined && (typeof r.request_id !== "string" || !UUID.test(r.request_id))) throw new Error("NIWA request_id must be a UUID.");
  const request = { ...r, request_id: r.request_id ?? randomUUID() } as NIWARequest;
  if (Buffer.byteLength(JSON.stringify(request)) > MAX_REQUEST_BYTES) throw new Error("NIWA request exceeds 256KB.");
  return request;
}

export function parseNIWARequest(tool: "ssh" | "wp", command: string): NIWARequest {
  if (typeof command !== "string" || Buffer.byteLength(command) > MAX_REQUEST_BYTES) throw new Error("NIWA command too large or invalid.");
  if (tool === "wp") return validateNIWARequest({ v: 1, op: "wp", argv: tokenizeNIWAWP(command) });
  if (["status", "niwa status"].includes(command.trim())) return validateNIWARequest({ v: 1, op: "status" });
  let input: unknown;
  try { input = JSON.parse(command); } catch { throw new Error("NIWA ssh accepts status, niwa status, or a broker JSON request. No shell."); }
  return validateNIWARequest(input);
}

/** Mandatory NIWA branch: never resolves or reads the legacy SSH key. */
export async function executeNIWABroker(tool: "ssh" | "wp", params: NIWAParams, ctx: NIWAContext) {
  if (params.server !== "ambienteniwa" || !isNIWABrokerAuthorized(ctx.authUserId ?? ctx.userId)) throw new Error("Access denied: NIWA broker requires an explicitly authorized sender.");
  if (Object.keys(params).some(k => !["server", "command"].includes(k))) throw new Error("NIWA connection overrides are forbidden.");
  const entry = resolveServer("ambienteniwa");
  if (!entry || entry.transport !== "niwa-broker-v1" || entry.host !== "172.18.0.1" || entry.user !== "pixel" || entry.port !== 22 || entry.key_file !== KEY_FILE || entry.known_hosts_file !== KNOWN_HOSTS_FILE) {
    throw new Error("NIWA broker connection is not configured. Legacy SSH is disabled.");
  }
  const request = parseNIWARequest(tool, params.command);
  const payload = JSON.stringify(request);
  const proc = Bun.spawn([
    "ssh", "-F", "/dev/null", "-T", "-i", KEY_FILE,
    "-o", "StrictHostKeyChecking=yes", "-o", `UserKnownHostsFile=${KNOWN_HOSTS_FILE}`,
    "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15",
    "-o", "ForwardAgent=no", "-o", "ClearAllForwardings=yes",
    "-p", "22", `${entry.user}@${entry.host}`, "niwa-broker-v1",
  ], { stdin: new Blob([payload]), stdout: "pipe", stderr: "pipe" });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; proc.kill("SIGKILL"); }, 120_000);
  try {
    const [stdout, , exitCode] = await Promise.all([
      new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
    ]);
    if (timedOut) throw new Error("NIWA broker timed out after 120 seconds.");
    // Do not surface SSH diagnostics, connection configuration, or request bodies.
    if (exitCode !== 0) throw new Error(`NIWA broker failed (exit ${exitCode}).`);
    return {
      content: [{ type: "text" as const, text: stdout.length > 30_000 ? stdout.slice(0, 30_000) + "\n[... truncated]" : stdout || "NIWA broker request completed." }],
      details: { server: "ambienteniwa", transport: "niwa-broker-v1", exitCode, request_id: request.request_id },
    };
  } finally { clearTimeout(timer); }
}
