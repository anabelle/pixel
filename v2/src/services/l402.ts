/**
 * L402 Lightning HTTP 402 Middleware for Hono
 *
 * Simplified L402 — no macaroons, just invoice + preimage verification.
 * Uses SHA256(preimage) === payment_hash for cryptographic proof of payment.
 *
 * Wire format is L402-compatible:
 *   Response: WWW-Authenticate: L402 invoice="lnbc...", token="<payment_hash>"
 *   Request:  Authorization: L402 <payment_hash>:<preimage>
 *
 * Integrates with existing lightning.ts service (createInvoice / invoiceCache).
 */

import { createHash, timingSafeEqual } from "crypto";
import type { Context, MiddlewareHandler } from "hono";
import { createInvoice } from "./lightning.js";
import { recordRevenue } from "./revenue.js";

// ============================================================
// Preimage Verification (the only crypto you need)
// ============================================================

/**
 * Verify that SHA256(preimage) === paymentHash.
 * This is the cryptographic proof that the client paid the invoice.
 * Both values are hex-encoded.
 */
export function verifyPreimage(preimage: string, paymentHash: string): boolean {
  if (!preimage || !paymentHash) return false;
  try {
    const computed = createHash("sha256")
      .update(Buffer.from(preimage, "hex"))
      .digest();
    const expected = Buffer.from(paymentHash, "hex");
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

// ============================================================
// L402 Header Parsing
// ============================================================

interface L402Credentials {
  token: string; // payment hash (or macaroon — we accept both)
  preimage: string;
}

/**
 * Parse Authorization: L402 <token>:<preimage>
 */
function parseL402Authorization(header: string | undefined): L402Credentials | null {
  if (!header) return null;
  const trimmed = header.trim();

  // Accept both "L402" and "LSAT" (legacy) prefixes
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith("l402 ") && !lower.startsWith("lsat ")) return null;

  const spaceIdx = trimmed.indexOf(" ");
  const credentials = trimmed.slice(spaceIdx + 1).trim();
  const colonIdx = credentials.indexOf(":");
  if (colonIdx === -1) return null;

  const token = credentials.substring(0, colonIdx).trim();
  const preimage = credentials.substring(colonIdx + 1).trim();

  if (!token || !preimage) return null;
  return { token, preimage };
}

/**
 * Format the WWW-Authenticate challenge header.
 */
function formatWWWAuthenticate(invoice: string, paymentHash: string): string {
  return `L402 invoice="${invoice}", token="${paymentHash}"`;
}

// ============================================================
// L402 Middleware
// ============================================================

export interface L402Options {
  /** Price in sats (fixed) */
  sats?: number;

  /** Dynamic price based on request context */
  price?: (c: Context) => number | Promise<number>;

  /** Invoice description */
  description?: string | ((c: Context) => string);

  /** Optional callback when payment is verified */
  onPayment?: (info: {
    paymentHash: string;
    preimage: string;
    amountSats: number;
    endpoint: string;
    method: string;
  }) => void | Promise<void>;
}

/**
 * Create L402 middleware for a Hono route.
 *
 * Usage:
 *   import { l402 } from "./services/l402.js";
 *
 *   // Fixed price
 *   app.get("/api/premium", l402({ sats: 10 }), handler);
 *
 *   // Dynamic price
 *   app.post("/api/generate", l402({
 *     price: (c) => c.req.query("quality") === "hd" ? 50 : 10,
 *     description: "Pixel AI generation",
 *   }), handler);
 */
export function l402(opts: L402Options = {}): MiddlewareHandler {
  const defaultSats = opts.sats ?? 10;

  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const creds = parseL402Authorization(authHeader);

    // ----------------------------------------------------------
    // Case 1: Client presents L402 credentials — verify them
    // ----------------------------------------------------------
    if (creds) {
      // The token field is the payment hash.
      // If the client used a full macaroon (base64), extract payment hash from it.
      // For our simplified flow, token IS the payment hash (hex string).
      const paymentHash = extractPaymentHash(creds.token);

      if (!paymentHash) {
        return c.json({ error: "Invalid L402 token" }, 401);
      }

      // Core verification: SHA256(preimage) must equal payment hash
      if (!verifyPreimage(creds.preimage, paymentHash)) {
        return c.json(
          {
            error: "Invalid preimage — does not match payment hash",
            hint: "SHA256(preimage) must equal the payment hash from the invoice",
          },
          401
        );
      }

      // Payment verified — attach info to request context
      const amountSats = await resolvePrice(c, opts, defaultSats);
      c.set("l402", {
        paid: true,
        paymentHash,
        preimage: creds.preimage,
        amountSats,
      });

      // Record revenue (non-blocking)
      const endpoint = new URL(c.req.url).pathname;
      recordRevenue({
        source: "l402",
        amountSats,
        txHash: paymentHash,
        description: `L402 ${c.req.method} ${endpoint}`,
      }).catch(() => {});

      // Fire optional callback
      if (opts.onPayment) {
        try {
          await opts.onPayment({
            paymentHash,
            preimage: creds.preimage,
            amountSats,
            endpoint,
            method: c.req.method,
          });
        } catch {
          // Don't fail the request on callback error
        }
      }

      // Authorized — continue to the handler
      await next();
      return;
    }

    // ----------------------------------------------------------
    // Case 2: No credentials — issue 402 Payment Required
    // ----------------------------------------------------------
    const amountSats = await resolvePrice(c, opts, defaultSats);
    const endpoint = new URL(c.req.url).pathname;
    const description = resolveDescription(c, opts, endpoint);

    const invoice = await createInvoice(amountSats, description);
    if (!invoice) {
      return c.json(
        {
          error: "Lightning service unavailable — cannot create invoice",
          hint: "Try again later or contact the operator",
        },
        503
      );
    }

    // Return 402 with invoice challenge
    const wwwAuth = formatWWWAuthenticate(
      invoice.paymentRequest,
      invoice.paymentHash
    );

    return c.json(
      {
        status: 402,
        message: "Payment Required",
        protocol: "L402",
        paymentHash: invoice.paymentHash,
        invoice: invoice.paymentRequest,
        amountSats: invoice.amountSats,
        description,
        expiresAt: invoice.expiresAt ?? null,
        verify: invoice.verify ?? null,
        instructions: {
          step1: "Pay the Lightning invoice",
          step2: "Extract the preimage (proof of payment) from the payment receipt",
          step3: `Retry with header: Authorization: L402 ${invoice.paymentHash}:<preimage>`,
        },
      },
      402,
      {
        "WWW-Authenticate": wwwAuth,
      }
    );
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Extract payment hash from the token field.
 *
 * Supports two formats:
 * 1. Raw hex payment hash (64 chars) — our simplified format
 * 2. Base64url-encoded JSON macaroon with { id: paymentHash } — for
 *    compatibility with clients that use full L402 macaroons
 */
function extractPaymentHash(token: string): string | null {
  // Check if it's a 64-char hex string (raw payment hash)
  if (/^[0-9a-f]{64}$/i.test(token)) {
    return token.toLowerCase();
  }

  // Try to decode as base64url JSON macaroon (compatibility)
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (parsed.id && /^[0-9a-f]{64}$/i.test(parsed.id)) {
      return parsed.id.toLowerCase();
    }
  } catch {
    // Not a macaroon — fall through
  }

  // Try base64 standard encoding too
  try {
    const json = Buffer.from(token, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (parsed.id && /^[0-9a-f]{64}$/i.test(parsed.id)) {
      return parsed.id.toLowerCase();
    }
  } catch {
    // Not a macaroon
  }

  return null;
}

async function resolvePrice(
  c: Context,
  opts: L402Options,
  defaultSats: number
): Promise<number> {
  if (typeof opts.price === "function") {
    const result = opts.price(c);
    return result instanceof Promise ? await result : result;
  }
  return opts.sats ?? defaultSats;
}

function resolveDescription(
  c: Context,
  opts: L402Options,
  endpoint: string
): string {
  if (typeof opts.description === "function") return opts.description(c);
  if (typeof opts.description === "string") return opts.description;
  return `Pixel L402 — ${c.req.method} ${endpoint}`;
}
