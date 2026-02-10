/**
 * Nostr Connector — NDK wired to Pi agent-core
 *
 * Handles:
 * - Mentions (kind 1 events tagging Pixel's pubkey)
 * - DMs (kind 4 NIP-04 encrypted direct messages)
 *
 * Each Nostr pubkey gets their own conversation context.
 */

import NDK, {
  NDKEvent,
  NDKPrivateKeySigner,
  NDKFilter,
  NDKSubscription,
  type NDKUserProfile,
} from "@nostr-dev-kit/ndk";
import { createPixelAgent } from "../agent.js";

// Throttle: don't reply to the same pubkey more than once per interval
const replyThrottle = new Map<string, number>();
const THROTTLE_MS = 60_000; // 1 minute

/** Extract text from a pi-agent-core message */
function extractText(message: any): string {
  if (!message) return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("");
  }
  return String(content ?? "");
}

/** Convert nsec to hex private key */
function nsecToHex(nsec: string): string {
  // If already hex, return as-is
  if (/^[0-9a-f]{64}$/i.test(nsec)) return nsec;

  // bech32 decode for nsec1...
  if (nsec.startsWith("nsec1")) {
    // Simple bech32 decode
    const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    const data = nsec.slice(5); // remove "nsec1" prefix
    const values: number[] = [];
    for (const c of data) {
      const v = CHARSET.indexOf(c);
      if (v === -1) throw new Error("Invalid bech32 character");
      values.push(v);
    }
    // Remove checksum (last 6 values)
    const payload = values.slice(0, -6);
    // Convert from 5-bit to 8-bit
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

/** Get response from agent for a message */
async function getAgentResponse(
  userId: string,
  message: string,
  platform: string
): Promise<string> {
  const agent = createPixelAgent({ userId, platform });

  const responseChunks: string[] = [];
  agent.subscribe((event: any) => {
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const msg = event.message as any;
      if (msg.stopReason !== "error") {
        const text = extractText(msg);
        if (text) responseChunks.push(text);
      } else {
        console.error(`[nostr] LLM error for ${userId}: ${msg.errorMessage}`);
      }
    }
  });

  await agent.prompt(message);

  let response = responseChunks.join("\n");
  if (!response) {
    const state = agent.state;
    if (state?.messages) {
      const assistantMsgs = state.messages.filter(
        (m: any) => m.role === "assistant"
      );
      if (assistantMsgs.length > 0) {
        response = extractText(assistantMsgs[assistantMsgs.length - 1]);
      }
    }
  }

  return response || "";
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

  const relayUrls = (process.env.NOSTR_RELAYS ?? "wss://relay.damus.io,wss://nos.lol,wss://relay.snort.social")
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
    // NDK.connect() can hang if relays are unreachable. Add a timeout.
    const connectPromise = ndk.connect();
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout (15s)")), 15_000)
    );
    await Promise.race([connectPromise, timeoutPromise]);
  } catch (err: any) {
    // NDK connect doesn't need to fully resolve — it works in the background
    console.log(`[nostr] Connect returned: ${err.message || "ok"} (continuing anyway)`);
  }

  // Get our public key
  const user = await signer.user();
  const pubkey = user.pubkey;
  console.log(`[nostr] Connected as ${pubkey.slice(0, 8)}...`);
  console.log(`[nostr] Relays: ${relayUrls.join(", ")}`);

  // Subscribe to mentions (kind 1 events that tag us)
  const mentionFilter: NDKFilter = {
    kinds: [1],
    "#p": [pubkey],
    since: Math.floor(Date.now() / 1000) - 10, // Only new events from now
  };

  const mentionSub = ndk.subscribe(mentionFilter, { closeOnEose: false });

  mentionSub.on("event", async (event: NDKEvent) => {
    // Skip our own events
    if (event.pubkey === pubkey) return;

    // Throttle
    if (isThrottled(event.pubkey)) return;

    const content = event.content;
    if (!content) return;

    console.log(`[nostr] Mention from ${event.pubkey.slice(0, 8)}...: ${content.slice(0, 80)}`);

    try {
      const response = await getAgentResponse(
        `nostr-${event.pubkey}`,
        content,
        "nostr"
      );

      if (!response) return;

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
        // Original event is the root
        reply.tags.push(["e", event.id, "", "root"]);
      }

      await reply.publish();
      console.log(`[nostr] Replied to ${event.pubkey.slice(0, 8)}...`);
    } catch (err: any) {
      console.error(`[nostr] Reply error:`, err.message);
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
      if (isThrottled(`dm-${event.pubkey}`)) return;

      try {
        // Decrypt the DM
        const decrypted = await signer.decrypt(
          await ndk.getUser({ pubkey: event.pubkey }),
          event.content
        );

        if (!decrypted) return;

        console.log(`[nostr] DM from ${event.pubkey.slice(0, 8)}...: ${decrypted.slice(0, 80)}`);

        const response = await getAgentResponse(
          `nostr-dm-${event.pubkey}`,
          decrypted,
          "nostr-dm"
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
}
