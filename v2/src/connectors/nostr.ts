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
import { extractImageUrls, fetchImages } from "../services/vision.js";
import { startDvm, publishDvmAnnouncement } from "../services/dvm.js";

// Throttle: don't reply to the same pubkey more than once per interval
const replyThrottle = new Map<string, number>();
const THROTTLE_MS = 60_000; // 1 minute

// Shared NDK instance — used by heartbeat and other services
let sharedNdk: NDK | null = null;
let sharedPubkey: string | null = null;

// Shared set of event IDs we've already replied to — prevents double-replies
// between the real-time mention subscription and the heartbeat engagement loop
const repliedEventIds = new Set<string>();

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

/** Check if we've already replied to this event */
export function hasRepliedTo(eventId: string): boolean {
  return repliedEventIds.has(eventId);
}

/** Mark an event as replied to (called by heartbeat engagement loop) */
export function markReplied(eventId: string): void {
  repliedEventIds.add(eventId);
  // Prune old entries (keep last 500)
  if (repliedEventIds.size > 500) {
    const arr = [...repliedEventIds];
    repliedEventIds.clear();
    for (const id of arr.slice(-500)) repliedEventIds.add(id);
  }
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
  if (!sharedNdk) {
    console.log("[nostr] No NDK instance available for sending DM");
    return false;
  }

  try {
    const event = new NDKEvent(sharedNdk, {
      kind: 4, // NIP-04 encrypted DM
      content,
      tags: [["p", pubkey]],
    });

    await event.publish();
    return true;
  } catch (err: any) {
    console.error(`[nostr] Failed to send DM to ${pubkey.slice(0, 8)}...:`, err.message);
    return false;
  }
}

/** Convert nsec to hex private key */
function nsecToHex(nsec: string): string {
  // If already hex, return as-is
  if (/^[0-9a-f]{64}$/i.test(nsec)) return nsec;

  // bech32 decode for nsec1...
  if (nsec.startsWith("nsec1")) {
    const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    const data = nsec.slice(5);
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

    console.log(`[nostr] Mention from ${event.pubkey.slice(0, 8)}...: ${content.slice(0, 80)}`);

    try {
      const images = await fetchImages(extractImageUrls(content));
      const response = await promptWithHistory(
        { userId: `nostr-${event.pubkey}`, platform: "nostr", chatId: event.pubkey },
        content,
        images.length > 0 ? images : undefined
      );

      if (!response) {
        markReplied(event.id); // Don't retry empty responses
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

      await reply.publish();
      markReplied(event.id); // Mark as replied in shared set
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

        const images = await fetchImages(extractImageUrls(decrypted));
        const response = await promptWithHistory(
          { userId: `nostr-dm-${event.pubkey}`, platform: "nostr-dm", chatId: event.pubkey },
          decrypted,
          images.length > 0 ? images : undefined
        );

        if (!response) return;

        // Encrypt and send DM reply
        const recipient = await ndk.getUser({ pubkey: event.pubkey });
        const encrypted = await signer.encrypt(recipient, response);

        const reply = new NDKEvent(ndk);
        reply.kind = 4;
        reply.content = encrypted;
        reply.tags = [["p", event.pubkey]];

        await reply.publish();
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
