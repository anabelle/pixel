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

const INBOX_ROOT = "/app/data/inbox/";

/** Raw broker call used by client-side conveniences (read-before-append). */
async function brokerCall(request: NIWARequest): Promise<any> {
  const proc = Bun.spawn([
    "ssh", "-F", "/dev/null", "-T", "-i", KEY_FILE,
    "-o", "StrictHostKeyChecking=yes", "-o", `UserKnownHostsFile=${KNOWN_HOSTS_FILE}`,
    "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15",
    "-o", "ForwardAgent=no", "-o", "ClearAllForwardings=yes",
    "-p", "22", "pixel@172.18.0.1", "niwa-broker-v1",
  ], { stdin: new Blob([JSON.stringify(request)]), stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => proc.kill("SIGKILL"), 60_000);
  try {
    const [stdout, , code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    if (code !== 0) throw new Error(`NIWA broker failed (exit ${code}).`);
    return JSON.parse(stdout);
  } finally { clearTimeout(timer); }
}

/** Shrink a local image to a JPEG within the broker's 180KiB limit (ffmpeg, no shell). */
async function imageToBrokerJPEG(path: string): Promise<Buffer> {
  const { realpathSync, readFileSync, unlinkSync, statSync } = await import("node:fs");
  const real = realpathSync(path);
  if (!real.startsWith(INBOX_ROOT) || !statSync(real).isFile()) throw new Error(`NIWA content_path must be a saved image under ${INBOX_ROOT}`);
  const out = `/tmp/niwa-upload-${randomUUID()}.jpg`;
  try {
    for (const width of [1600, 1280, 1024, 800]) {
      for (const q of [3, 5, 8, 12, 18]) {
        const p = Bun.spawn(["ffmpeg", "-y", "-v", "error", "-i", real, "-vf", `scale='min(${width},iw)':-2`, "-frames:v", "1", "-q:v", String(q), out], { stdout: "ignore", stderr: "pipe" });
        if ((await p.exited) !== 0) throw new Error("Could not convert the image (ffmpeg failed).");
        const buf = readFileSync(out);
        if (buf.length <= MAX_CONTENT_BYTES) return buf;
      }
    }
    throw new Error("Image could not be reduced under 180KiB.");
  } finally { try { unlinkSync(out); } catch {} }
}

/**
 * Client-side conveniences that turn LLM-friendly fields into protocol fields
 * BEFORE validation (the broker revalidates everything server-side):
 *  - media.upload {content_path} -> JPEG <=180KiB, content_b64, mime, filename
 *  - file.write {content_text}   -> content_b64
 *  - file.write {append_text}    -> reads current file, appends, sets expected_sha256;
 *    a theme style.css also gets its "Version:" header bumped (Cloudflare caches ?ver= for days).
 */
export async function expandNIWAConveniences(command: string): Promise<string> {
  let input: any;
  try { input = JSON.parse(command); } catch { return command; }
  if (!input || typeof input !== "object" || Array.isArray(input)) return command;
  if (input.op === "media.upload" && typeof input.content_path === "string") {
    const buf = await imageToBrokerJPEG(input.content_path);
    const base = String(input.filename ?? input.content_path.split("/").at(-1) ?? "imagen").replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 70) || "imagen";
    delete input.content_path;
    Object.assign(input, { filename: `${base}.jpg`, mime: "image/jpeg", content_b64: buf.toString("base64") });
  }
  if (input.op === "file.write" && typeof input.content_text === "string") {
    input.content_b64 = Buffer.from(input.content_text, "utf8").toString("base64");
    delete input.content_text;
  }
  if (input.op === "file.write" && typeof input.append_text === "string") {
    const read = await brokerCall(validateNIWARequest({ v: 1, op: "file.read", path: input.path }));
    if (!read?.ok || typeof read.result?.content_b64 !== "string") throw new Error(`NIWA could not read ${input.path} before appending (${read?.error ?? "unknown"}).`);
    let text = Buffer.from(read.result.content_b64, "base64").toString("utf8");
    if (/\/themes\/[^/]+\/style\.css$/.test(input.path)) {
      text = text.replace(/^(\s*Version:\s*)([0-9.]*?)(\d+)(\s*)$/m, (_m: string, a: string, b: string, n: string, c: string) => `${a}${b}${Number(n) + 1}${c}`);
    }
    text = text.replace(/\s*$/, "\n") + "\n" + input.append_text.replace(/\s*$/, "\n");
    input.content_b64 = Buffer.from(text, "utf8").toString("base64");
    input.expected_sha256 = read.result.sha256;
    delete input.append_text;
  }
  return JSON.stringify(input);
}

/** Mandatory NIWA branch: never resolves or reads the legacy SSH key. */
export async function executeNIWABroker(tool: "ssh" | "wp", params: NIWAParams, ctx: NIWAContext) {
  if (params.server !== "ambienteniwa" || !isNIWABrokerAuthorized(ctx.authUserId ?? ctx.userId)) throw new Error("Access denied: NIWA broker requires an explicitly authorized sender.");
  if (Object.entries(params).some(([k, value]) => value !== undefined && !["server", "command"].includes(k))) throw new Error("NIWA connection overrides are forbidden.");
  const entry = resolveServer("ambienteniwa");
  if (!entry || entry.transport !== "niwa-broker-v1" || entry.host !== "172.18.0.1" || entry.user !== "pixel" || entry.port !== 22 || entry.key_file !== KEY_FILE || entry.known_hosts_file !== KNOWN_HOSTS_FILE) {
    throw new Error("NIWA broker connection is not configured. Legacy SSH is disabled.");
  }
  const command = tool === "ssh" ? await expandNIWAConveniences(params.command) : params.command;
  const request = parseNIWARequest(tool, command);
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
