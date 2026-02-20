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
 *
 * UNITS NOTE:
 * - LNURL-pay spec uses millisatoshis for minSendable/maxSendable
 * - @getalby/lightning-tools lnurlpData.min/max are in millisats
 * - requestInvoice({satoshi: N}) expects sats (converts internally)
 * - All Pixel APIs use sats as the unit
 */

import { LightningAddress } from "@getalby/lightning-tools";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Cache the LightningAddress instance
let lnAddress: LightningAddress | null = null;
let lnInitialized = false;

// Cache verify URL template for payment verification
// Maps paymentHash → { verifyUrl, amountSats, description }
interface InvoiceCache {
  verifyUrl: string;
  amountSats: number;
  description?: string;
}
const invoiceCache = new Map<string, InvoiceCache>();
const MAX_VERIFY_CACHE = 500;
const INVOICE_CACHE_PATH = process.env.INVOICE_CACHE_PATH || "/app/data/invoice-cache.json";

/** Load invoice cache from disk */
function loadInvoiceCache(): void {
  try {
    if (existsSync(INVOICE_CACHE_PATH)) {
      const data = JSON.parse(readFileSync(INVOICE_CACHE_PATH, "utf-8"));
      if (data && typeof data === "object") {
        for (const [hash, entry] of Object.entries(data)) {
          invoiceCache.set(hash, entry as InvoiceCache);
        }
        console.log(`[lightning] Loaded ${invoiceCache.size} cached invoices from disk`);
      }
    }
  } catch (err: any) {
    console.error(`[lightning] Failed to load invoice cache:`, err.message);
  }
}

/** Save invoice cache to disk */
function saveInvoiceCache(): void {
  try {
    const dir = INVOICE_CACHE_PATH.substring(0, INVOICE_CACHE_PATH.lastIndexOf("/"));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const data: Record<string, InvoiceCache> = {};
    for (const [hash, entry] of invoiceCache) {
      data[hash] = entry;
    }
    writeFileSync(INVOICE_CACHE_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[lightning] Saved ${invoiceCache.size} invoices to cache`);
  } catch (err: any) {
    console.error(`[lightning] Failed to save invoice cache:`, err.message);
  }
}

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

    // min/max from LNURL-pay are in millisats — convert for display
    const minMsat = lnAddress.lnurlpData?.min ?? 1000;
    const maxMsat = lnAddress.lnurlpData?.max ?? 1_000_000_000;
    console.log(`[lightning] Initialized: ${address}`);
    console.log(
      `[lightning] Min: ${Math.ceil(minMsat / 1000)} sats, Max: ${Math.floor(maxMsat / 1000)} sats`
    );
    // Log available LNURL-pay capabilities
    console.log(`[lightning] LNURL-pay callback: ${lnAddress.lnurlpData?.callback ?? "none"}`);
    console.log(`[lightning] LNURL-pay allowsVerify: ${(lnAddress as any).lnurlpData?.allowsVerify ?? "unknown"}`);
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

  // min/max are in millisats — convert to sats for comparison
  const minSats = Math.ceil((ln.lnurlpData?.min ?? 1000) / 1000);
  const maxSats = Math.floor((ln.lnurlpData?.max ?? 1_000_000_000) / 1000);

  if (amountSats < minSats) {
    console.log(
      `[lightning] Amount ${amountSats} sats below minimum ${minSats} sats, adjusting`
    );
    amountSats = minSats;
  }
  if (amountSats > maxSats) {
    console.error(
      `[lightning] Amount ${amountSats} sats exceeds maximum ${maxSats} sats`
    );
    return null;
  }

  try {
    // requestInvoice expects satoshi in sats (converts to millisats internally)
    const invoice = await ln.requestInvoice({
      satoshi: amountSats,
      comment: comment ?? `Pixel — ${amountSats} sats`,
    });

    // Debug: log full invoice response
    console.log(`[lightning] Invoice response keys: ${Object.keys(invoice).join(", ")}`);
    console.log(`[lightning] Invoice verify: ${invoice.verify ?? "undefined"}`);
    console.log(`[lightning] Invoice paymentHash: ${invoice.paymentHash.slice(0, 16)}...`);

    // Cache the verify URL and amount for later payment verification
    let verifyUrl = invoice.verify;
    
    // Fallback: construct verify URL from callback if provider doesn't return one
    // Many LNURL-pay providers support checking status via callback + payment_hash
    if (!verifyUrl && ln.lnurlpData?.callback) {
      const callbackBase = ln.lnurlpData.callback;
      // Try common verify URL patterns
      verifyUrl = `${callbackBase}&payment_hash=${invoice.paymentHash}`;
      console.log(`[lightning] Constructed fallback verify URL from callback`);
    }

    if (verifyUrl) {
      // Evict old entries
      if (invoiceCache.size > MAX_VERIFY_CACHE) {
        const first = invoiceCache.keys().next().value;
        if (first) invoiceCache.delete(first);
      }
      invoiceCache.set(invoice.paymentHash, {
        verifyUrl,
        amountSats,
        description: comment,
      });
      saveInvoiceCache();
      console.log(`[lightning] Cached invoice ${invoice.paymentHash.slice(0, 16)}... for later verification`);
    } else {
      console.log(`[lightning] WARNING: No verify URL available - payment verification will not work for this invoice`);
    }

    return {
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      amountSats,
      description: comment,
      verify: invoice.verify ?? undefined,
      expiresAt: invoice.expiryDate ? Math.floor(invoice.expiryDate.getTime() / 1000) : undefined,
    };
  } catch (err: any) {
    console.error("[lightning] Failed to create invoice:", err.message);
    return null;
  }
}

/**
 * Verify if a payment has been received
 *
 * Uses the cached verify URL from the original invoice creation.
 * For providers without native verify support, uses callback URL with payment_hash.
 *
 * LIMITATION: Wallet of Satoshi does not support LNURL-verify. Payments cannot
 * be automatically verified. Consider switching to a provider that supports
 * LNURL-verify (like Alby, Blink, or a self-hosted LND node).
 *
 * @param paymentHash - The payment hash from createInvoice()
 * @returns { paid, preimage, amountSats, description } — paid is true if settled
 */
export async function verifyPayment(
  paymentHash: string
): Promise<{ paid: boolean; preimage?: string; amountSats?: number; description?: string }> {
  const cached = invoiceCache.get(paymentHash);
  if (!cached) {
    // Only log once per hash to avoid spam during polling loops
    if (!(verifyPayment as any).__warned?.has(paymentHash)) {
      if (!(verifyPayment as any).__warned) (verifyPayment as any).__warned = new Set();
      (verifyPayment as any).__warned.add(paymentHash);
      console.log(`[lightning] No invoice cached for ${paymentHash.slice(0, 16)}... (suppressing further logs)`);
    }
    return { paid: false };
  }

  try {
    console.log(`[lightning] Verifying payment ${paymentHash.slice(0, 16)}... via ${cached.verifyUrl.slice(0, 60)}...`);
    const response = await fetch(cached.verifyUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[lightning] Verify response: ${JSON.stringify(data).slice(0, 200)}`);
      
      // Check for provider-specific error responses (WoS doesn't support verification)
      if (data.status === "ERROR" || data.error) {
        console.log(`[lightning] Provider error: ${data.reason || data.error}`);
        return {
          paid: false,
          amountSats: cached.amountSats,
          description: `Provider error: ${data.reason || data.error}. Wallet of Satoshi does not support payment verification via LNURL. Check wallet app directly.`,
        };
      }
      
      // Handle different response formats
      const isSettled = 
        data.settled === true ||
        data.status === "settled" ||
        data.status === "complete" ||
        data.paid === true ||
        data.preimage !== undefined;

      if (isSettled) {
        // Clean up cache after confirmed payment
        invoiceCache.delete(paymentHash);
        saveInvoiceCache();
        console.log(`[lightning] Payment confirmed: ${paymentHash.slice(0, 16)}...`);
      }
      
      return {
        paid: isSettled,
        preimage: data.preimage,
        amountSats: cached.amountSats,
        description: cached.description,
      };
    } else {
      console.log(`[lightning] Verify response status: ${response.status}`);
    }
    return { paid: false, amountSats: cached.amountSats, description: cached.description };
  } catch (err: any) {
    console.error("[lightning] Payment verification failed:", err.message);
    return { paid: false, amountSats: cached.amountSats, description: cached.description };
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

  // Convert millisats to sats for the API response
  return {
    address:
      process.env.LIGHTNING_ADDRESS ??
      process.env.NEXT_PUBLIC_LIGHTNING_ADDRESS ??
      process.env.NAKAPAY_DESTINATION_WALLET ??
      "",
    minSats: Math.ceil((ln.lnurlpData?.min ?? 1000) / 1000),
    maxSats: Math.floor((ln.lnurlpData?.max ?? 1_000_000_000) / 1000),
    description: typeof ln.lnurlpData?.metadata === "string" ? ln.lnurlpData.metadata : JSON.stringify(ln.lnurlpData?.metadata ?? ""),
    active: true,
  };
}

/**
 * Initialize Lightning on boot — called from index.ts
 */
export async function initLightning(): Promise<boolean> {
  loadInvoiceCache();
  const ln = await getLnAddress();
  return ln !== null;
}
