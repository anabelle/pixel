/**
 * Nostr Connector — NDK wired to Pi agent-core
 *
 * Handles:
 * - Mentions (kind 1 events tagging Pixel's pubkey)
 * - DMs (kind 4 NIP-04 encrypted direct messages)
 *
 * Each Nostr pubkey gets persistent conversation context via JSONL.
 */

import NDK, {
  NDKEvent,
  NDKPrivateKeySigner,
  NDKFilter,
} from "@nostr-dev-kit/ndk";
import { promptWithHistory } from "../agent.js";
import { appendToLog } from "../conversations.js";
import { extractImageUrls, fetchImages } from "../services/vision.js";
import { getUnsafeReason } from "../services/content-filter.js";
import { startDvm, publishDvmAnnouncement } from "../services/dvm.js";
import { audit } from "../services/audit.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

// Throttle: don't reply to the same pubkey more than once per interval
const replyThrottle = new Map<string, number>();
const THROTTLE_MS = 60_000; // 1 minute

// Shared NDK instance — used by heartbeat and other services
let sharedNdk: NDK | null = null;
let sharedPubkey: string | null = null;
let sharedSigner: NDKPrivateKeySigner | null = null;
const profileNameCache = new Map<string, { value: string; expiresAt: number }>();

// Shared set of event IDs we've already replied to — prevents double-replies
// between the real-time mention subscription and the heartbeat engagement loop
const repliedEventIds = new Set<string>();
const REPLIED_IDS_PATH = "/app/data/nostr-replied.json";

// Thread handling — prevents replying to multiple messages in the same thread
// within 24 hours (stops "ghost" repetitive responses)
const handledThreads = new Map<string, number>(); // threadRootId -> timestamp
const HANDLED_THREADS_PATH = "/app/data/nostr-handled-threads.json";
const THREAD_HANDLED_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getNostrDisplayName(ndk: NDK, pubkey: string): Promise<string> {
  const cached = profileNameCache.get(pubkey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const fallback = `nostr:${pubkey.slice(0, 12)}`;
  try {
    const user: any = await ndk.getUser({ pubkey });
    if (user?.fetchProfile) {
      await user.fetchProfile();
    }
    const profile = user?.profile || {};
    const name = profile.displayName || profile.name || profile.nip05 || fallback;
    profileNameCache.set(pubkey, { value: name, expiresAt: Date.now() + 6 * 60 * 60 * 1000 });
    return name;
  } catch {
    return fallback;
  }
}

/** Load replied event IDs from disk (survives container restarts) */
function loadRepliedIds(): void {
  if (!existsSync(REPLIED_IDS_PATH)) return;
  try {
    const ids: string[] = JSON.parse(readFileSync(REPLIED_IDS_PATH, "utf-8"));
    if (Array.isArray(ids)) ids.forEach((id) => repliedEventIds.add(id));
    console.log(`[nostr] Loaded ${repliedEventIds.size} replied event IDs from disk`);
  } catch { /* ignore */ }
}

/** Save replied event IDs to disk (keep last 1000) */
export function saveRepliedIds(): void {
  try {
    const ids = [...repliedEventIds].slice(-1000);
    writeFileSync(REPLIED_IDS_PATH, JSON.stringify(ids));
  } catch { /* ignore */ }
}

// Debounced save — don't write to disk on every single markReplied call
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveRepliedIds(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveRepliedIds(); }, 10_000);
}

// ============================================================
// Thread Handling (24h cooldown per thread)
// ============================================================

/** Load handled threads from disk */
function loadHandledThreads(): void {
  if (!existsSync(HANDLED_THREADS_PATH)) return;
  try {
    const data = JSON.parse(readFileSync(HANDLED_THREADS_PATH, "utf-8")) as Record<string, number>;
    const now = Date.now();
    for (const [threadId, timestamp] of Object.entries(data)) {
      // Only load threads that haven't expired
      if (now - timestamp < THREAD_HANDLED_DURATION_MS) {
        handledThreads.set(threadId, timestamp);
      }
    }
    console.log(`[nostr] Loaded ${handledThreads.size} handled threads from disk`);
  } catch { /* ignore */ }
}

/** Save handled threads to disk */
function saveHandledThreads(): void {
  try {
    const obj = Object.fromEntries(handledThreads);
    writeFileSync(HANDLED_THREADS_PATH, JSON.stringify(obj));
  } catch { /* ignore */ }
}

let threadSaveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveHandledThreads(): void {
  if (threadSaveTimer) return;
  threadSaveTimer = setTimeout(() => { threadSaveTimer = null; saveHandledThreads(); }, 10_000);
}

/** Extract root thread ID from event tags */
export function getThreadRootId(event: { tags?: string[][] }): string | null {
  if (!event.tags) return null;
  
  // Look for the root 'e' tag (NIP-10 threading)
  for (const tag of event.tags) {
    if (tag[0] === "e" && tag[3] === "root") {
      return tag[1];
    }
  }
  
  // Fallback: first 'e' tag is often the root in simpler threads
  for (const tag of event.tags) {
    if (tag[0] === "e") {
      return tag[1];
    }
  }
  
  return null;
}

/** Check if a thread has been handled within the cooldown period */
export function isThreadHandled(threadRootId: string): boolean {
  const timestamp = handledThreads.get(threadRootId);
  if (!timestamp) return false;
  
  const now = Date.now();
  if (now - timestamp >= THREAD_HANDLED_DURATION_MS) {
    // Expired, remove it
    handledThreads.delete(threadRootId);
    debouncedSaveHandledThreads();
    return false;
  }
  
  return true;
}

/** Mark a thread as handled */
export function markThreadHandled(threadRootId: string): void {
  handledThreads.set(threadRootId, Date.now());
  
  // Prune expired entries
  const now = Date.now();
  for (const [id, ts] of handledThreads) {
    if (now - ts >= THREAD_HANDLED_DURATION_MS) {
      handledThreads.delete(id);
    }
  }
  
  debouncedSaveHandledThreads();
}

// ============================================================
// Mute List (NIP-51 kind 10000)
// ============================================================

const muteList = new Set<string>();
const MUTE_REFRESH_MS = 30 * 60 * 1000; // Refresh mute list every 30 minutes
let lastMuteRefresh = 0;

/** Load mute list from Nostr (kind 10000) */
async function refreshMuteList(): Promise<void> {
  if (!sharedNdk || !sharedPubkey) return;
  try {
    const events = await Promise.race([
      sharedNdk.fetchEvents({ kinds: [10000], authors: [sharedPubkey], limit: 1 }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
    ]);
    if (!events || (events instanceof Set && events.size === 0)) return;

    const evt = events instanceof Set ? [...events][0] : null;
    if (!evt) return;

    const oldSize = muteList.size;
    muteList.clear();
    for (const tag of evt.tags) {
      if (tag[0] === "p" && tag[1]) {
        muteList.add(tag[1]);
      }
    }
    lastMuteRefresh = Date.now();
    if (muteList.size !== oldSize || muteList.size > 0) {
      console.log(`[nostr] Mute list refreshed: ${muteList.size} pubkeys`);
    }
  } catch (err: any) {
    console.error("[nostr] Failed to refresh mute list:", err.message);
  }
}

/** Check if a pubkey is on the mute list */
export function isMuted(pubkey: string): boolean {
  // Trigger background refresh if stale
  if (Date.now() - lastMuteRefresh > MUTE_REFRESH_MS) {
    refreshMuteList().catch(() => {});
    lastMuteRefresh = Date.now(); // Prevent multiple concurrent refreshes
  }
  return muteList.has(pubkey);
}

// ============================================================
// Bot Detection — prevent endless reply loops
// ============================================================

// Track reply counts per pubkey in a rolling window
const replyCountWindow = new Map<string, { count: number; windowStart: number }>();
const BOT_WINDOW_MS = 60 * 60 * 1000; // 1-hour window
const BOT_MAX_REPLIES_PER_WINDOW = 6; // Max replies to one pubkey per window
const BOT_CONTENT_MIN_LENGTH = 5;

/** Check if we should stop replying to this pubkey (bot loop detection) */
export function isBotLoop(pubkey: string): boolean {
  const now = Date.now();
  const entry = replyCountWindow.get(pubkey);

  if (!entry || now - entry.windowStart > BOT_WINDOW_MS) {
    // New window
    replyCountWindow.set(pubkey, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > BOT_MAX_REPLIES_PER_WINDOW) {
    console.log(`[nostr] Bot loop detected: ${pubkey.slice(0, 8)}... (${entry.count} replies in window)`);
    return true;
  }

  return false;
}

/** Check if content looks like bot-generated noise */
function isBotContent(content: string): boolean {
  if (!content || content.length < BOT_CONTENT_MIN_LENGTH) return true;
  // Repetitive hashtag spam
  const hashtags = (content.match(/#\w+/g) ?? []).length;
  if (hashtags > 5 && hashtags > content.split(/\s+/).length * 0.5) return true;
  return false;
}

/** Get the active Nostr instance (NDK + pubkey) for use by other services */
export function getNostrInstance(): { ndk: NDK; pubkey: string } | null {
  if (!sharedNdk || !sharedPubkey) return null;
  return { ndk: sharedNdk, pubkey: sharedPubkey };
}

/**
 * Nostr Engagement Circuit Breaker
 *
 * Problem: When relays become unreachable, all 3 engagement loops (notification,
 * zap, discovery) hit 15s fetch timeouts simultaneously. Without a circuit
 * breaker, each loop independently triggers reconnects, all fail, and the
 * cascade of unhandled promise rejections / timeouts can crash the process.
 *
 * Solution: A shared circuit breaker with 3 states:
 *   - CLOSED: normal operation, fetches proceed
 *   - OPEN: relays confirmed unreachable, all engagement loops skip fetches
 *   - HALF_OPEN: probing — one loop attempts a fetch, others still skip
 *
 * The circuit trips after N consecutive failures across all loops, opens for
 * a cooldown period, then enters half-open to probe recovery. This prevents
 * the death spiral while still auto-recovering when relays come back.
 */

type CircuitState = "closed" | "open" | "half_open";
let circuitState: CircuitState = "closed";
let circuitOpenedAt = 0;
let totalFetchFailures = 0;
let reconnectInProgress = false;

const CIRCUIT_OPEN_THRESHOLD = 3;          // trip after 3 consecutive failures
const CIRCUIT_OPEN_COOLDOWN_MS = 2 * 60 * 1000;  // stay open 2 min before probing
const RECONNECT_BACKOFF_MS = 30_000;       // min gap between reconnect attempts

/**
 * Check if engagement loops should skip their fetch.
 * Returns true if the circuit is OPEN (skip) or HALF_OPEN and another
 * loop is already probing (skip). Returns false if CLOSED or this is
 * the first HALF_OPEN probe.
 */
export function isNostrCircuitOpen(): boolean {
  if (circuitState === "closed") return false;
  if (circuitState === "open") {
    // Check if cooldown has elapsed → transition to half_open
    if (Date.now() - circuitOpenedAt >= CIRCUIT_OPEN_COOLDOWN_MS) {
      circuitState = "half_open";
      console.log("[nostr] Circuit breaker → HALF_OPEN (probing relay connectivity)");
      return false; // allow this one fetch as a probe
    }
    return true;
  }
  // half_open: only allow one probe at a time
  return reconnectInProgress;
}

/**
 * Called by engagement loops when a fetch times out.
 * Centralized circuit breaker logic prevents death spirals.
 */
export async function onNostrFetchTimeout(): Promise<void> {
  totalFetchFailures++;
  console.warn(`[nostr] Fetch timeout (total: ${totalFetchFailures}, circuit: ${circuitState})`);

  if (circuitState === "open") return; // already tripped, nothing more to do

  if (circuitState === "half_open") {
    // Probe failed — go back to open
    tripCircuit("half-open probe failed");
    return;
  }

  // closed: count failures and trip if threshold reached
  if (totalFetchFailures >= CIRCUIT_OPEN_THRESHOLD) {
    tripCircuit(`${totalFetchFailures} consecutive fetch failures`);
    // Attempt ONE reconnect with backoff (not 3 simultaneous reconnects)
    await attemptReconnectWithBackoff();
  }
}

/**
 * Called by engagement loops on successful fetch.
 * Resets the failure counter and closes the circuit.
 */
export function onNostrFetchSuccess(): void {
  if (circuitState !== "closed" || totalFetchFailures > 0) {
    console.log(`[nostr] Circuit breaker → CLOSED (recovered from ${circuitState}, was ${totalFetchFailures} failures)`);
  }
  circuitState = "closed";
  totalFetchFailures = 0;
  reconnectInProgress = false;
}

function tripCircuit(reason: string): void {
  circuitState = "open";
  circuitOpenedAt = Date.now();
  console.error(`[nostr] Circuit breaker → OPEN: ${reason}. Engagement loops will skip fetches for ${CIRCUIT_OPEN_COOLDOWN_MS / 1000}s.`);
  audit("nostr_circuit_open", `Nostr engagement circuit tripped: ${reason}`, { totalFailures: totalFetchFailures });
}

/**
 * Attempt a single relay reconnect with backoff guard.
 * Multiple engagement loops calling this simultaneously will be serialized
 * — only one reconnect runs at a time, others return immediately.
 */
async function attemptReconnectWithBackoff(): Promise<void> {
  if (reconnectInProgress) {
    console.log("[nostr] Reconnect already in progress — skipping");
    return;
  }
  if (!sharedNdk) return;

  reconnectInProgress = true;
  try {
    console.log("[nostr] Attempting relay reconnect...");
    await reconnectNostrRelays(10_000);
    console.log("[nostr] Reconnect succeeded — circuit will close on next successful fetch");
  } catch (err: any) {
    console.error(`[nostr] Reconnect failed: ${err.message} — circuit stays OPEN, will probe in ${CIRCUIT_OPEN_COOLDOWN_MS / 1000}s`);
    // Don't retry immediately — the half_open probe will test recovery after cooldown
  } finally {
    reconnectInProgress = false;
  }
}

/** Get circuit breaker status for /health endpoint */
export function getNostrCircuitStatus() {
  return {
    state: circuitState,
    totalFetchFailures,
    openedAt: circuitOpenedAt > 0 ? new Date(circuitOpenedAt).toISOString() : null,
    cooldownMs: CIRCUIT_OPEN_COOLDOWN_MS,
    reconnectInProgress,
  };
}

/** Check if we've already replied to this event */
export function hasRepliedTo(eventId: string): boolean {
  return repliedEventIds.has(eventId);
}

/** Mark an event as replied to (called by heartbeat engagement loop) */
export function markReplied(eventId: string): void {
  repliedEventIds.add(eventId);
  // Prune old entries (keep last 1000)
  if (repliedEventIds.size > 1000) {
    const arr = [...repliedEventIds];
    repliedEventIds.clear();
    for (const id of arr.slice(-1000)) repliedEventIds.add(id);
  }
  debouncedSaveRepliedIds();
}

/**
 * Send a proactive DM to a Nostr user.
 * Used by reminder service and other proactive notifications.
 *
 * @param pubkey - The recipient's Nostr pubkey (hex)
 * @param content - Message content to send
 */
export async function sendNostrDm(
  pubkey: string,
  content: string
): Promise<boolean> {
  if (!sharedNdk || !sharedSigner) {
    console.log("[nostr] No NDK instance available for sending DM");
    return false;
  }

  try {
    const recipientPubkey = normalizeNostrPubkey(pubkey);
    const recipient = await sharedNdk.getUser({ pubkey: recipientPubkey });
    const encrypted = await sharedSigner.encrypt(recipient, content);

    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await reconnectNostrRelays();
        }

        const event = new NDKEvent(sharedNdk, {
          kind: 4,
          content: encrypted,
          tags: [["p", recipientPubkey]],
        });

        await publishNostrEvent(event);
        return true;
      } catch (err: any) {
        lastError = err;
        console.warn(`[nostr] DM publish attempt ${attempt + 1} failed: ${err.message}`);
      }
    }

    throw lastError;
  } catch (err: any) {
    console.error(`[nostr] Failed to send DM to ${pubkey.slice(0, 8)}...:`, err.message);
    return false;
  }
}

/** Publish a Nostr event with one reconnect retry for transient relay failures. */
export async function publishNostrEvent(event: NDKEvent, options?: { reconnectTimeoutMs?: number }): Promise<void> {
  let lastError: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await reconnectNostrRelays(options?.reconnectTimeoutMs ?? 10_000);
      }
      await event.publish();
      return;
    } catch (err: any) {
      lastError = err;
      console.warn(`[nostr] Event publish attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  throw lastError;
}

async function reconnectNostrRelays(timeoutMs: number = 10_000): Promise<void> {
  if (!sharedNdk) return;
  const connectPromise = sharedNdk.connect();
  const timeoutPromise = new Promise<void>((_, reject) => setTimeout(() => reject(new Error(`Reconnect timeout (${timeoutMs}ms)`)), timeoutMs));
  await Promise.race([connectPromise, timeoutPromise]);
}

function decodeNostrBech32(value: string, prefix: string): string {
  if (!value.startsWith(`${prefix}1`)) {
    throw new Error(`Invalid ${prefix} key`);
  }

  const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const data = value.slice(prefix.length + 1);
  const values: number[] = [];
  for (const c of data) {
    const v = CHARSET.indexOf(c);
    if (v === -1) throw new Error("Invalid bech32 character");
    values.push(v);
  }
  const payload = values.slice(0, -6);
  let acc = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const v of payload) {
    acc = (acc << 5) | v;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeNostrPubkey(value: string): string {
  const trimmed = value.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (trimmed.startsWith("npub1")) return decodeNostrBech32(trimmed, "npub");
  throw new Error("Recipient pubkey must be hex or npub");
}

/** Convert nsec to hex private key */
function nsecToHex(nsec: string): string {
  // If already hex, return as-is
  if (/^[0-9a-f]{64}$/i.test(nsec)) return nsec;

  // bech32 decode for nsec1...
  if (nsec.startsWith("nsec1")) {
    return decodeNostrBech32(nsec, "nsec");
  }

  throw new Error("Invalid private key format");
}

/** Check if we should throttle replies to this pubkey */
function isThrottled(pubkey: string): boolean {
  const last = replyThrottle.get(pubkey);
  if (last && Date.now() - last < THROTTLE_MS) return true;
  replyThrottle.set(pubkey, Date.now());
  return false;
}

/** Start the Nostr connector */
export async function startNostr(): Promise<void> {
  // Load previously replied event IDs from disk (survives container restarts)
  loadRepliedIds();
  loadHandledThreads();

  const nsec = process.env.NOSTR_PRIVATE_KEY;
  if (!nsec) {
    console.log("[nostr] No NOSTR_PRIVATE_KEY set, skipping");
    return;
  }

  const relayUrls = (process.env.NOSTR_RELAYS ?? "wss://relay.damus.io,wss://nos.lol,wss://relay.snort.social,wss://relay.primal.net")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  // Convert nsec to hex and create signer
  let hexKey: string;
  try {
    hexKey = nsecToHex(nsec);
  } catch (err: any) {
    console.error("[nostr] Invalid private key:", err.message);
    return;
  }

  const signer = new NDKPrivateKeySigner(hexKey);
  const ndk = new NDK({
    explicitRelayUrls: relayUrls,
    signer,
  });

  console.log("[nostr] Connecting to relays...");

  try {
    const connectPromise = ndk.connect();
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout (15s)")), 15_000)
    );
    await Promise.race([connectPromise, timeoutPromise]);
  } catch (err: any) {
    console.log(`[nostr] Connect returned: ${err.message || "ok"} (continuing anyway)`);
  }

  // Get our public key
  const user = await signer.user();
  const pubkey = user.pubkey;

  // Store for use by heartbeat and other services
  sharedNdk = ndk;
  sharedPubkey = pubkey;
  sharedSigner = signer;

  console.log(`[nostr] Connected as ${pubkey.slice(0, 8)}...`);
  console.log(`[nostr] Relays: ${relayUrls.join(", ")}`);

  // Subscribe to mentions (kind 1 events that tag us)
  const mentionFilter: NDKFilter = {
    kinds: [1],
    "#p": [pubkey],
    since: Math.floor(Date.now() / 1000) - 10,
  };

  const mentionSub = ndk.subscribe(mentionFilter, { closeOnEose: false });

  // Load mute list on startup
  await refreshMuteList();

  mentionSub.on("event", async (event: NDKEvent) => {
    if (event.pubkey === pubkey) return;
    if (hasRepliedTo(event.id)) return; // Already replied (shared with heartbeat)
    if (isMuted(event.pubkey)) return; // On mute list
    if (isThrottled(event.pubkey)) return;
    if (isBotLoop(event.pubkey)) { markReplied(event.id); return; } // Bot loop protection

    const content = event.content;
    if (!content || isBotContent(content)) return;

    const unsafeReason = getUnsafeReason(content, event.tags, { blockVideo: true });
    if (unsafeReason) {
      markReplied(event.id);
      return;
    }

    console.log(`[nostr] Mention from ${event.pubkey.slice(0, 8)}...: ${content.slice(0, 80)}`);

    try {
      const displayName = await getNostrDisplayName(ndk, event.pubkey);
      const images = await fetchImages(extractImageUrls(content));
      const response = await promptWithHistory(
        { userId: `nostr-${event.pubkey}`, platform: "nostr", chatId: event.pubkey, displayName },
        content,
        images.length > 0 ? images : undefined
      );

      if (!response || response.includes("[SILENT]")) {
        markReplied(event.id); // Don't retry empty or silent responses
        return;
      }

      // Reply as kind 1 with proper threading tags
      const reply = new NDKEvent(ndk);
      reply.kind = 1;
      reply.content = response;
      reply.tags = [
        ["e", event.id, "", "reply"],
        ["p", event.pubkey],
      ];

      // Add root tag if the original was already a reply
      const rootTag = event.tags.find(
        (t) => t[0] === "e" && t[3] === "root"
      );
      if (rootTag) {
        reply.tags.push(["e", rootTag[1], rootTag[2] || "", "root"]);
      } else {
        reply.tags.push(["e", event.id, "", "root"]);
      }

      await publishNostrEvent(reply);
      markReplied(event.id); // Mark as replied in shared set
      appendToLog(`nostr-${event.pubkey}`, content, response, "nostr");
      console.log(`[nostr] Replied to ${event.pubkey.slice(0, 8)}...`);
    } catch (err: any) {
      console.error(`[nostr] Reply error:`, err.message);
      markReplied(event.id); // Don't retry failed replies
    }
  });

  // Subscribe to DMs (kind 4 NIP-04)
  const dmEnabled = process.env.NOSTR_DM_ENABLE !== "false";
  if (dmEnabled) {
    const dmFilter: NDKFilter = {
      kinds: [4],
      "#p": [pubkey],
      since: Math.floor(Date.now() / 1000) - 10,
    };

    const dmSub = ndk.subscribe(dmFilter, { closeOnEose: false });

    dmSub.on("event", async (event: NDKEvent) => {
      if (event.pubkey === pubkey) return;
      if (isMuted(event.pubkey)) return; // On mute list
      if (isThrottled(`dm-${event.pubkey}`)) return;
      if (isBotLoop(`dm-${event.pubkey}`)) return; // Bot loop protection

      try {
        const decrypted = await signer.decrypt(
          await ndk.getUser({ pubkey: event.pubkey }),
          event.content
        );

        if (!decrypted) return;

        console.log(`[nostr] DM from ${event.pubkey.slice(0, 8)}...: ${decrypted.slice(0, 80)}`);

        const displayName = await getNostrDisplayName(ndk, event.pubkey);
        const images = await fetchImages(extractImageUrls(decrypted));
        const response = await promptWithHistory(
          { userId: `nostr-dm-${event.pubkey}`, platform: "nostr-dm", chatId: event.pubkey, displayName },
          decrypted,
          images.length > 0 ? images : undefined
        );

        if (!response || response.includes("[SILENT]")) return;

        // Encrypt and send DM reply
        const recipient = await ndk.getUser({ pubkey: event.pubkey });
        const encrypted = await signer.encrypt(recipient, response);

        const reply = new NDKEvent(ndk);
        reply.kind = 4;
        reply.content = encrypted;
        reply.tags = [["p", event.pubkey]];

        await publishNostrEvent(reply);
        appendToLog(`nostr-dm-${event.pubkey}`, decrypted, response, "nostr-dm");
        console.log(`[nostr] DM replied to ${event.pubkey.slice(0, 8)}...`);
      } catch (err: any) {
        console.error(`[nostr] DM error:`, err.message);
      }
    });

    console.log("[nostr] DM listener active");
  }

  console.log("[nostr] Mention listener active");

  // Start NIP-90 DVM (text generation service)
  startDvm(ndk, pubkey);

  // Publish NIP-89 announcement for DVM discovery (runs in background)
  publishDvmAnnouncement(ndk).catch((err) => {
    console.error("[nostr] DVM announcement failed:", err.message);
  });
}
