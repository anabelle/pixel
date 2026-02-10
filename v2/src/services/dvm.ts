/**
 * NIP-90 DVM (Data Vending Machine) — Text Generation Service
 *
 * Listens for kind 5050 job requests on Nostr relays.
 * Generates text via Pixel's agent brain.
 * Publishes kind 6050 results.
 * Publishes kind 31990 announcement for discovery.
 *
 * Payment flow (NIP-90 compliant):
 * - If Lightning is available: sends kind 7000 payment-required feedback
 *   with bolt11 invoice, waits for payment, then processes.
 * - If Lightning is unavailable: processes for free (graceful degradation).
 */

import NDK, { NDKEvent, type NDKFilter } from "@nostr-dev-kit/ndk";
import { promptWithHistory } from "../agent.js";
import { createInvoice, verifyPayment } from "./lightning.js";

// Track processed jobs to avoid duplicates
const processedJobs = new Set<string>();
const MAX_PROCESSED_CACHE = 1000;

// DVM pricing in sats
const DVM_PRICE_SATS = 100; // 100 sats per text generation job
const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes to pay
const PAYMENT_POLL_INTERVAL_MS = 5_000; // Check every 5 seconds

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
  extraInfo?: string,
  extraTags?: string[][]
): Promise<void> {
  const feedback = new NDKEvent(ndk);
  feedback.kind = 7000;
  feedback.content = extraInfo ?? "";
  feedback.tags = [
    ["status", status, ...(extraInfo ? [extraInfo] : [])],
    ["e", jobId],
    ["p", customerPubkey],
    ...(extraTags ?? []),
  ];

  try {
    await feedback.publish();
  } catch (err: any) {
    console.error(`[dvm] Failed to send feedback (${status}):`, err.message);
  }
}

/** Wait for a Lightning payment to be verified, with timeout */
async function waitForPayment(paymentHash: string): Promise<boolean> {
  const deadline = Date.now() + PAYMENT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = await verifyPayment(paymentHash);
    if (result.paid) {
      console.log(`[dvm] Payment verified: ${paymentHash.slice(0, 16)}...`);
      return true;
    }
    await new Promise((r) => setTimeout(r, PAYMENT_POLL_INTERVAL_MS));
  }

  console.log(`[dvm] Payment timeout for ${paymentHash.slice(0, 16)}...`);
  return false;
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
      // Payment flow: if Lightning is available, require payment first
      let paidInvoice: { paymentHash: string; bolt11: string } | null = null;

      const invoice = await createInvoice(DVM_PRICE_SATS, `Pixel DVM — text generation`);
      if (invoice) {
        // Lightning is available — require payment
        console.log(`[dvm] Requesting ${DVM_PRICE_SATS} sats for job ${event.id.slice(0, 8)}`);

        // Send payment-required feedback with bolt11
        await sendFeedback(
          ndk,
          event.id,
          event.pubkey,
          "payment-required",
          `Payment required: ${DVM_PRICE_SATS} sats`,
          [["amount", String(DVM_PRICE_SATS * 1000), invoice.paymentRequest]] // amount in millisats per NIP-90
        );

        // Wait for payment
        const paid = await waitForPayment(invoice.paymentHash);
        if (!paid) {
          await sendFeedback(ndk, event.id, event.pubkey, "error", "Payment timeout — invoice expired");
          return;
        }

        paidInvoice = { paymentHash: invoice.paymentHash, bolt11: invoice.paymentRequest };
      } else {
        // Lightning not available — process for free
        console.log(`[dvm] Lightning unavailable, processing job ${event.id.slice(0, 8)} for free`);
      }

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
      ];

      // Add amount tag if payment was collected
      if (paidInvoice) {
        result.tags.push(["amount", String(DVM_PRICE_SATS * 1000), paidInvoice.bolt11]);
      }

      await result.publish();
      console.log(`[dvm] Result published for job ${event.id.slice(0, 8)} (${response.length} chars, ${paidInvoice ? `${DVM_PRICE_SATS} sats paid` : "free"})`);
    } catch (err: any) {
      console.error(`[dvm] Job ${event.id.slice(0, 8)} failed:`, err.message);
      await sendFeedback(ndk, event.id, event.pubkey, "error", err.message).catch(() => {});
    }
  });

  console.log("[dvm] Text generation DVM active (kind 5050 → 6050)");
}
