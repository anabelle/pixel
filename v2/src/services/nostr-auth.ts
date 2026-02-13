/**
 * Nostr HTTP Auth (NIP-98)
 *
 * Validates Authorization: Nostr <base64(json event)>
 * Event kind: 27235
 * Tags: ["u", <absolute-url>], ["method", <METHOD>]
 * Optional: ["payload", <sha256(body)>] for requests with body
 */

import { createHash } from "crypto";
import { nip19, validateEvent, verifyEvent, type Event as NostrEvent } from "nostr-tools";

export class NostrAuthError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sha256Hex(data: Uint8Array | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  return createHash("sha256").update(buf).digest("hex");
}

function normalizePubkey(input: string): string {
  const value = (input || "").trim();
  if (!value) return "";
  if (value.startsWith("npub1")) {
    const decoded = nip19.decode(value);
    if (decoded.type !== "npub") return "";
    return String(decoded.data).toLowerCase();
  }
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return value.toLowerCase();
  }
  return "";
}

function getTagValue(tags: string[][], name: string): string | null {
  for (const t of tags) {
    if (t[0] === name && typeof t[1] === "string") return t[1];
  }
  return null;
}

function normalizeMethod(method: string): string {
  return (method || "").toUpperCase();
}

function toAbsoluteUrl(reqUrl: string, origin: string): string {
  // reqUrl might be absolute already, or a path like "/v2/api/inner-life".
  try {
    const u = new URL(reqUrl);
    return u.toString();
  } catch {
    const u = new URL(reqUrl, origin);
    return u.toString();
  }
}

export function decodeOwnerPubkeyHex(ownerNpub: string): string {
  try {
    const decoded = nip19.decode(ownerNpub);
    if (decoded.type !== "npub") throw new Error("not npub");
    return String(decoded.data).toLowerCase();
  } catch {
    throw new Error("Invalid OWNER_NPUB");
  }
}

export interface VerifyNip98Options {
  ownerPubkeyHex: string;
  requestUrl: string;
  requestMethod: string;
  requestBody?: string; // raw string (exact bytes that were sent)
  origin: string;
  maxSkewSeconds?: number;
}

/**
 * Verify NIP-98 event + owner match. Returns the parsed signed event.
 */
export function verifyNip98AuthorizationHeader(
  authHeader: string | null | undefined,
  opts: VerifyNip98Options
): NostrEvent {
  if (!authHeader) {
    throw new NostrAuthError(401, "missing_auth", "Missing Authorization header");
  }

  const prefix = "Nostr ";
  if (!authHeader.startsWith(prefix)) {
    throw new NostrAuthError(401, "bad_scheme", "Authorization must be 'Nostr <base64>'");
  }

  const b64 = authHeader.slice(prefix.length).trim();
  if (!b64) {
    throw new NostrAuthError(401, "bad_auth", "Missing Nostr event payload");
  }

  let eventJson: any;
  try {
    const raw = Buffer.from(b64, "base64").toString("utf-8");
    eventJson = JSON.parse(raw);
  } catch {
    throw new NostrAuthError(401, "bad_auth", "Invalid base64/json in Authorization header");
  }

  const event = eventJson as NostrEvent;
  if (!event || typeof event !== "object") {
    throw new NostrAuthError(401, "bad_event", "Invalid Nostr event");
  }

  if (event.kind !== 27235) {
    throw new NostrAuthError(401, "wrong_kind", "NIP-98 event kind must be 27235");
  }

  if (!validateEvent(event) || !verifyEvent(event)) {
    throw new NostrAuthError(401, "bad_sig", "Invalid Nostr signature");
  }

  const eventPubkey = normalizePubkey(event.pubkey as string);
  if (!eventPubkey || eventPubkey !== opts.ownerPubkeyHex) {
    throw new NostrAuthError(403, "not_owner", "Not authorized" );
  }

  const now = Math.floor(Date.now() / 1000);
  const maxSkew = opts.maxSkewSeconds ?? 60;
  if (typeof event.created_at !== "number" || Math.abs(now - event.created_at) > maxSkew) {
    throw new NostrAuthError(401, "stale", "Auth event is too old" );
  }

  const tags = Array.isArray(event.tags) ? (event.tags as string[][]) : [];
  const uTag = getTagValue(tags, "u");
  const methodTag = getTagValue(tags, "method");
  const payloadTag = getTagValue(tags, "payload");

  if (!uTag || !methodTag) {
    throw new NostrAuthError(401, "missing_tags", "NIP-98 event missing required tags" );
  }

  const expectedMethod = normalizeMethod(opts.requestMethod);
  if (normalizeMethod(methodTag) !== expectedMethod) {
    throw new NostrAuthError(401, "method_mismatch", "NIP-98 method tag mismatch");
  }

  const absoluteRequestUrl = toAbsoluteUrl(opts.requestUrl, opts.origin);
  if (uTag !== absoluteRequestUrl) {
    throw new NostrAuthError(401, "url_mismatch", "NIP-98 url tag mismatch");
  }

  // If request has a body, require payload tag match.
  // If request has no body, ignore payload tag.
  if (opts.requestBody != null && opts.requestBody.length > 0) {
    if (!payloadTag) {
      throw new NostrAuthError(401, "missing_payload", "NIP-98 payload tag required for requests with body");
    }
    const expected = sha256Hex(opts.requestBody);
    if (payloadTag !== expected) {
      throw new NostrAuthError(401, "payload_mismatch", "NIP-98 payload tag mismatch");
    }
  }

  return event;
}
