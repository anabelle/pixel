import { randomUUID } from "node:crypto";
import { isNIWABrokerAuthorized, resolveServer } from "./server-registry.js";

const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_CONTENT_BYTES = 180 * 1024;
const KEY_FILE = "/app/data/keys/niwa-broker_ed25519";
const KNOWN_HOSTS_FILE = "/app/data/keys/niwa-broker_known_hosts";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RECEIPT = /^[a-f0-9]{32}$/;
const FORBIDDEN_SUFFIX = /\.(?:phtml|phar|inc|cgi|shtml|html|svg|json|env|ini|conf|config|sql|bak|log|ya?ml)(?:\.|$)/i;

// JS $ can match before a final newline; Python re.fullmatch cannot.
function fullMatch(pattern: RegExp, value: string): boolean {
  return pattern.exec(value)?.[0] === value;
}

export interface NIWAContext { userId?: string; authUserId?: string }
export interface NIWAParams {
  server?: string;
  command: string;
  [key: string]: unknown;
}

export type NIWARequest = { v: 1; request_id: string } & (
  | { op: "status" | "backup" }
  | { op: "wp"; argv: string[] }
  | { op: "file.read" | "file.list"; path: string }
  | { op: "file.write"; path: string; content_b64: string; expected_sha256: string | null }
  | { op: "file.restore"; receipt: string }
  | { op: "media.upload"; filename: string; mime: "image/png" | "image/jpeg" | "image/webp"; content_b64: string }
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
  if (!Array.isArray(argv) || argv.length < 2 || argv.length > 128 || argv.some(a => typeof a !== "string" || Buffer.byteLength(a) > 65536 || /[\0\r\n]/.test(a))) {
    throw new Error("NIWA WP argv must contain 2–128 bounded UTF-8 strings.");
  }
  if (!/^[a-z][a-z0-9-]*$/.test(argv[0]) || ["wp", "eval", "eval-file", "shell", "cli"].includes(argv[0])) throw new Error("NIWA WP command is restricted.");
  for (const arg of argv) {
    // Reject routing/code-loading globals in every position, including --flag=value.
    if (/^--(?:path|require|exec|ssh|http)(?:=|$)/i.test(arg)) throw new Error("NIWA WP routing and code-execution flags are forbidden.");
    if ([";", "&&", "||", "|", ">", "<"].includes(arg)) throw new Error("NIWA does not accept shell chains.");
  }
}

function validatePath(path: unknown, listing = false): asserts path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > 240) throw new Error("NIWA asset path is invalid.");
  const parts = path.split("/");
  if (parts.some(p => !fullMatch(/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,79}$/, p) || p.includes("..") || p.toLowerCase().includes(".php") || FORBIDDEN_SUFFIX.test(p))) {
    throw new Error("NIWA asset path contains a forbidden component.");
  }
  const theme = parts.length >= 3 && parts[0] === "wp-content" && parts[1] === "themes";
  const upload = parts.length >= 2 && parts[0] === "wp-content" && parts[1] === "uploads";
  if ((!theme && !upload) || (theme && !fullMatch(/^[a-z0-9][a-z0-9_-]{0,79}$/, parts[2]))) throw new Error("NIWA files are restricted to theme and upload assets.");
  if (!listing) {
    const ext = parts.at(-1)!.split(".").at(-1)!.toLowerCase();
    if (parts.length < (theme ? 4 : 3) || !(theme ? ["css", "js", "txt"] : ["png", "jpg", "jpeg", "webp", "txt"]).includes(ext)) throw new Error("NIWA asset extension is forbidden.");
  }
}

function validateContent(content: unknown): Buffer {
  if (typeof content !== "string" || content.length > Math.ceil(MAX_CONTENT_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)) throw new Error("NIWA content must be base64 and at most 180KiB decoded.");
  const decoded = Buffer.from(content, "base64");
  if (decoded.length > MAX_CONTENT_BYTES || decoded.toString("base64") !== content) throw new Error("NIWA content must be canonical base64 and at most 180KiB decoded.");
  return decoded;
}

/** Validate and copy only protocol fields; unknown fields and operations fail closed. */
export function validateNIWARequest(input: unknown): NIWARequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("NIWA request must be a JSON object.");
  const source = input as Record<string, unknown>;
  const r: Record<string, unknown> = { ...source, request_id: source.request_id === undefined ? randomUUID() : source.request_id };
  if (r.v !== 1) throw new Error("NIWA protocol version must be 1.");
  const fields = ["v", "op", "request_id"];
  switch (r.op) {
    case "status": case "backup": break;
    case "wp": fields.push("argv"); validateWPArgv(r.argv); break;
    case "file.read": case "file.list": fields.push("path"); validatePath(r.path, r.op === "file.list"); break;
    case "file.write":
      fields.push("path", "content_b64", "expected_sha256"); validatePath(r.path);
      const content = validateContent(r.content_b64);
      if (/\.(css|js|txt)$/i.test(r.path)) {
        let text: string;
        try { text = new TextDecoder("utf-8", { fatal: true }).decode(content); } catch { throw new Error("NIWA text assets must be UTF-8."); }
        if (/<\?|<\s*(?:script|html|svg)|\0/i.test(text)) throw new Error("NIWA text assets contain forbidden markup or binary data.");
      }
      if (r.expected_sha256 !== null && (typeof r.expected_sha256 !== "string" || !fullMatch(/^[0-9a-f]{64}$/, r.expected_sha256))) throw new Error("NIWA write requires expected_sha256: null for creation, or the existing lowercase SHA256.");
      break;
    case "file.restore":
      fields.push("receipt");
      if (typeof r.receipt !== "string" || !fullMatch(RECEIPT, r.receipt)) throw new Error("NIWA restore requires a 32-character lowercase hex receipt.");
      break;
    case "media.upload":
      fields.push("filename", "mime", "content_b64");
      if (typeof r.filename !== "string" || !fullMatch(/^[A-Za-z0-9_-]{1,80}\.(?:png|jpg|jpeg|webp)$/, r.filename)) throw new Error("NIWA media filename must be a bounded PNG, JPEG or WebP basename.");
      const mimes: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
      if (r.mime !== mimes[r.filename.split(".").at(-1)!]) throw new Error("NIWA media MIME must match the filename extension.");
      validateContent(r.content_b64);
      break;
    default: throw new Error("NIWA operation is unsupported.");
  }
  if (Object.keys(r).some(k => !fields.includes(k))) throw new Error("NIWA request contains unsupported fields.");
  if (fields.some(k => !Object.hasOwn(r, k))) throw new Error("NIWA request is missing required fields.");
  if (typeof r.request_id !== "string" || !fullMatch(UUID, r.request_id)) throw new Error("NIWA request_id must be a canonical lowercase UUID.");
  const request = r as NIWARequest;
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
  if (Object.entries(params).some(([k, value]) => value !== undefined && !["server", "command"].includes(k))) throw new Error("NIWA connection overrides are forbidden.");
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
    let output = stdout;
    if (request.op === "backup") {
      let response: unknown;
      try { response = JSON.parse(stdout); } catch { throw new Error("NIWA backup returned an invalid receipt."); }
      const backup = response as { ok?: unknown; receipt?: unknown } | null;
      if (!backup || backup.ok !== true || typeof backup.receipt !== "string" || !fullMatch(RECEIPT, backup.receipt)) throw new Error("NIWA backup returned an invalid receipt.");
      // Backups expose only an opaque receipt, never SQL or private locations.
      output = JSON.stringify({ ok: true, result: null, receipt: backup.receipt });
    }
    return {
      content: [{ type: "text" as const, text: output.length > 30_000 ? output.slice(0, 30_000) + "\n[... truncated]" : output || "NIWA broker request completed." }],
      details: { server: "ambienteniwa", transport: "niwa-broker-v1", exitCode, request_id: request.request_id },
    };
  } finally { clearTimeout(timer); }
}
