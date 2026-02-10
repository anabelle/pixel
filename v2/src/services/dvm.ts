/**
 * NIP-90 DVM (Data Vending Machine) — Text Generation Service
 *
 * Listens for kind 5050 job requests on Nostr relays.
 * Generates text via Pixel's agent brain.
 * Publishes kind 6050 results.
 * Publishes kind 31990 announcement for discovery.
 *
 * Currently free (no payment required). Payment integration
 * will be added when Lightning NWC is wired up.
 */

import NDK, { NDKEvent, type NDKFilter } from "@nostr-dev-kit/ndk";
import { promptWithHistory } from "../agent.js";

// Track processed jobs to avoid duplicates
const processedJobs = new Set<string>();
const MAX_PROCESSED_CACHE = 1000;

/** Extract input text from a DVM job request event */
function extractInputs(event: NDKEvent): { data: string; type: string }[] {
  return event.tags
    .filter((t) => t[0] === "i")
    .map((t) => ({ data: t[1], type: t[2] ?? "text" }));
}

/** Extract param tags as key-value pairs */
function extractParams(event: NDKEvent): Record<string, string> {
  return Object.fromEntries(
    event.tags
      .filter((t) => t[0] === "param")
      .map((t) => [t[1], t[2]])
  );
}

/** Check if job is targeted at a specific DVM (not us) */
function isTargetedAtOther(event: NDKEvent, ourPubkey: string): boolean {
  const pTags = event.tags.filter((t) => t[0] === "p");
  if (pTags.length === 0) return false; // Open job, anyone can respond
  return !pTags.some((t) => t[1] === ourPubkey);
}

/** Publish NIP-89 DVM announcement for discovery */
export async function publishDvmAnnouncement(ndk: NDK): Promise<void> {
  const announcement = new NDKEvent(ndk);
  announcement.kind = 31990;
  announcement.content = JSON.stringify({
    name: "Pixel",
    about: "Living digital artist. AI text generation — ask me anything about art, code, existence, or whatever's on your mind.",
    picture: "https://pixel.xx.kg/avatar.png",
    lud16: "sparepicolo55@walletofsatoshi.com",
  });
  announcement.tags = [
    ["d", "pixel-text-gen"],
    ["k", "5050"],
    ["t", "ai"],
    ["t", "text-generation"],
    ["t", "art"],
    ["t", "pixel"],
  ];

  try {
    await announcement.publish();
    console.log("[dvm] Published NIP-89 announcement (kind 31990)");
  } catch (err: any) {
    console.error("[dvm] Failed to publish announcement:", err.message);
  }
}

/** Send a kind 7000 feedback event */
async function sendFeedback(
  ndk: NDK,
  jobId: string,
  customerPubkey: string,
  status: string,
  extraInfo?: string
): Promise<void> {
  const feedback = new NDKEvent(ndk);
  feedback.kind = 7000;
  feedback.content = extraInfo ?? "";
  feedback.tags = [
    ["status", status, ...(extraInfo ? [extraInfo] : [])],
    ["e", jobId],
    ["p", customerPubkey],
  ];

  try {
    await feedback.publish();
  } catch (err: any) {
    console.error(`[dvm] Failed to send feedback (${status}):`, err.message);
  }
}

/** Start the NIP-90 DVM handler */
export function startDvm(ndk: NDK, ourPubkey: string): void {
  // Subscribe to text generation job requests (kind 5050)
  const filter: NDKFilter = {
    kinds: [5050 as number],
    since: Math.floor(Date.now() / 1000) - 10, // Only new requests
  };

  const sub = ndk.subscribe(filter, { closeOnEose: false });

  sub.on("event", async (event: NDKEvent) => {
    // Skip our own events
    if (event.pubkey === ourPubkey) return;

    // Skip already processed jobs
    if (processedJobs.has(event.id)) return;
    processedJobs.add(event.id);

    // Evict old entries from cache
    if (processedJobs.size > MAX_PROCESSED_CACHE) {
      const first = processedJobs.values().next().value;
      if (first) processedJobs.delete(first);
    }

    // Skip if targeted at another DVM
    if (isTargetedAtOther(event, ourPubkey)) return;

    const inputs = extractInputs(event);
    if (inputs.length === 0) {
      console.log(`[dvm] Job ${event.id.slice(0, 8)} has no inputs, skipping`);
      return;
    }

    // Get the text input (prefer "text" type, fall back to first)
    const textInput = inputs.find((i) => i.type === "text") ?? inputs[0];
    const prompt = textInput.data;

    if (!prompt || prompt.length < 2) {
      console.log(`[dvm] Job ${event.id.slice(0, 8)} has empty prompt, skipping`);
      return;
    }

    console.log(`[dvm] Job ${event.id.slice(0, 8)} from ${event.pubkey.slice(0, 8)}: "${prompt.slice(0, 80)}"`);

    try {
      // Send "processing" feedback
      await sendFeedback(ndk, event.id, event.pubkey, "processing");

      // Generate response via Pixel's brain
      const response = await promptWithHistory(
        {
          userId: `dvm-${event.pubkey}`,
          platform: "nostr-dvm",
        },
        prompt
      );

      if (!response) {
        await sendFeedback(ndk, event.id, event.pubkey, "error", "No response generated");
        return;
      }

      // Publish job result (kind 6050 = 5050 + 1000)
      const result = new NDKEvent(ndk);
      result.kind = 6050;
      result.content = response;
      result.tags = [
        ["request", JSON.stringify(event.rawEvent())],
        ["e", event.id],
        ["p", event.pubkey],
        ["i", textInput.data, textInput.type],
        // Currently free — no amount tag
        // When Lightning is wired up:
        // ["amount", "1000", "<bolt11-invoice>"]
      ];

      await result.publish();
      console.log(`[dvm] Result published for job ${event.id.slice(0, 8)} (${response.length} chars)`);
    } catch (err: any) {
      console.error(`[dvm] Job ${event.id.slice(0, 8)} failed:`, err.message);
      await sendFeedback(ndk, event.id, event.pubkey, "error", err.message).catch(() => {});
    }
  });

  console.log("[dvm] Text generation DVM active (kind 5050 → 6050)");
}
