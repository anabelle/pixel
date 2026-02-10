/**
 * Lightning Service — Invoice creation and payment verification
 *
 * Uses LNURL-pay via Pixel's Lightning address to:
 * - Create invoices for DVM jobs, tips, and API usage
 * - Verify payments via LNURL-verify
 * - Track revenue in PostgreSQL
 *
 * No NWC connection needed — works with any LNURL-pay compatible wallet.
 * Can upgrade to NWC later for full wallet control.
 */

import { LightningAddress } from "@getalby/lightning-tools";

// Cache the LightningAddress instance
let lnAddress: LightningAddress | null = null;
let lnInitialized = false;

/** Get or create the LightningAddress instance */
async function getLnAddress(): Promise<LightningAddress | null> {
  if (lnAddress && lnInitialized) return lnAddress;

  const address =
    process.env.LIGHTNING_ADDRESS ??
    process.env.NEXT_PUBLIC_LIGHTNING_ADDRESS ??
    process.env.NAKAPAY_DESTINATION_WALLET;

  if (!address) {
    console.log("[lightning] No LIGHTNING_ADDRESS set, skipping");
    return null;
  }

  try {
    lnAddress = new LightningAddress(address);
    await lnAddress.fetch();
    lnInitialized = true;
    console.log(`[lightning] Initialized: ${address}`);
    console.log(
      `[lightning] Min: ${lnAddress.lnurlpData?.min} sats, Max: ${lnAddress.lnurlpData?.max} sats`
    );
    return lnAddress;
  } catch (err: any) {
    console.error(`[lightning] Failed to initialize ${address}:`, err.message);
    return null;
  }
}

/** Invoice with payment tracking info */
export interface LightningInvoice {
  paymentRequest: string; // bolt11 invoice string
  paymentHash: string;
  amountSats: number;
  description?: string;
  verify?: string; // LNURL-verify URL
  expiresAt?: number; // Unix timestamp
}

/**
 * Create a Lightning invoice via LNURL-pay
 *
 * @param amountSats - Amount in satoshis (must be within wallet's min/max)
 * @param comment - Optional comment/description for the invoice
 * @returns LightningInvoice or null if failed
 */
export async function createInvoice(
  amountSats: number,
  comment?: string
): Promise<LightningInvoice | null> {
  const ln = await getLnAddress();
  if (!ln) return null;

  // Validate amount against wallet limits
  const min = ln.lnurlpData?.min ?? 1;
  const max = ln.lnurlpData?.max ?? 1_000_000;

  if (amountSats < min) {
    console.log(
      `[lightning] Amount ${amountSats} below minimum ${min}, adjusting`
    );
    amountSats = min;
  }
  if (amountSats > max) {
    console.error(
      `[lightning] Amount ${amountSats} exceeds maximum ${max}`
    );
    return null;
  }

  try {
    const invoice = await ln.requestInvoice({
      satoshi: amountSats,
      comment: comment ?? `Pixel — ${amountSats} sats`,
    });

    return {
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      amountSats,
      description: comment,
      verify: invoice.verify,
    };
  } catch (err: any) {
    console.error("[lightning] Failed to create invoice:", err.message);
    return null;
  }
}

/**
 * Verify if a payment has been received
 *
 * @param paymentHash - The payment hash from createInvoice()
 * @returns true if paid, false otherwise
 */
export async function verifyPayment(
  paymentHash: string
): Promise<{ paid: boolean; preimage?: string }> {
  const ln = await getLnAddress();
  if (!ln) return { paid: false };

  try {
    // Create an invoice object for verification
    const invoice = await ln.requestInvoice({ satoshi: 1 });
    // Use the verify endpoint directly if available
    if (invoice.verify) {
      const verifyUrl = invoice.verify.replace(
        /[^/]+$/,
        paymentHash
      );
      const response = await fetch(verifyUrl);
      if (response.ok) {
        const data = await response.json() as { settled: boolean; preimage?: string };
        return {
          paid: data.settled === true,
          preimage: data.preimage,
        };
      }
    }
    return { paid: false };
  } catch (err: any) {
    console.error("[lightning] Payment verification failed:", err.message);
    return { paid: false };
  }
}

/**
 * Get wallet info (min/max amounts, description)
 */
export async function getWalletInfo(): Promise<{
  address: string;
  minSats: number;
  maxSats: number;
  description: string;
  active: boolean;
} | null> {
  const ln = await getLnAddress();
  if (!ln) return null;

  return {
    address:
      process.env.LIGHTNING_ADDRESS ??
      process.env.NEXT_PUBLIC_LIGHTNING_ADDRESS ??
      process.env.NAKAPAY_DESTINATION_WALLET ??
      "",
    minSats: ln.lnurlpData?.min ?? 1,
    maxSats: ln.lnurlpData?.max ?? 1_000_000,
    description: ln.lnurlpData?.metadata ?? "",
    active: true,
  };
}

/**
 * Initialize Lightning on boot — called from index.ts
 */
export async function initLightning(): Promise<boolean> {
  const ln = await getLnAddress();
  return ln !== null;
}
