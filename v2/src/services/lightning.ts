/**
 * Lightning Service — Invoice creation and payment verification
 *
 * Uses Nakapay API for reliable payment verification:
 * - Create invoices via Nakapay payment requests
 * - Verify payments via Nakapay status endpoint
 * - Track revenue in PostgreSQL
 *
 * Nakapay provides LNURL-pay with proper verification support,
 * unlike Wallet of Satoshi which doesn't support LNURL-verify.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

const NAKAPAY_API_KEY = process.env.NAKAPAY_API_KEY;
const NAKAPAY_DESTINATION_WALLET = process.env.NAKAPAY_DESTINATION_WALLET;
const NAKAPAY_API_BASE = "https://api.nakapay.app/api/v1";
const NAKAPAY_MIN_SATS = 21;

// Cache payment requests for verification
// Maps paymentHash → { nakapayId, amountSats, description }
interface InvoiceCache {
  nakapayId: string;
  verifyUrl: string;
  amountSats: number;
  description?: string;
}
const invoiceCache = new Map<string, InvoiceCache>();
const MAX_VERIFY_CACHE = 500;
const INVOICE_CACHE_PATH = process.env.INVOICE_CACHE_PATH || "/app/data/invoice-cache.json";

let nakapayInitialized = false;

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
  } catch (err: any) {
    console.error(`[lightning] Failed to save invoice cache:`, err.message);
  }
}

/** Check if Nakapay is configured */
function isNakapayConfigured(): boolean {
  return !!(NAKAPAY_API_KEY && NAKAPAY_DESTINATION_WALLET);
}

/** Invoice with payment tracking info */
export interface LightningInvoice {
  paymentRequest: string; // bolt11 invoice string
  paymentHash: string;
  amountSats: number;
  description?: string;
  verify?: string; // Nakapay status URL
  expiresAt?: number; // Unix timestamp
}

/**
 * Create a Lightning invoice via Nakapay API
 *
 * @param amountSats - Amount in satoshis (minimum 21 sats)
 * @param comment - Optional comment/description for the invoice
 * @returns LightningInvoice or null if failed
 */
export async function createInvoice(
  amountSats: number,
  comment?: string
): Promise<LightningInvoice | null> {
  if (!isNakapayConfigured()) {
    console.error("[lightning] Nakapay not configured. Set NAKAPAY_API_KEY and NAKAPAY_DESTINATION_WALLET");
    return null;
  }

  // Enforce minimum
  if (amountSats < NAKAPAY_MIN_SATS) {
    console.log(`[lightning] Amount ${amountSats} sats below minimum ${NAKAPAY_MIN_SATS} sats, adjusting`);
    amountSats = NAKAPAY_MIN_SATS;
  }

  try {
    const response = await fetch(`${NAKAPAY_API_BASE}/payment-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NAKAPAY_API_KEY}`,
      },
      body: JSON.stringify({
        amount: amountSats,
        description: comment || `Pixel - ${amountSats} sats`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[lightning] Nakapay create invoice failed: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[lightning] Nakapay response: id=${data.id} hash=${data.paymentHash?.slice(0, 16)}... invoice=${data.invoice?.slice(0, 20)}...`);

    // Cache for verification
    if (data.paymentHash && data.id) {
      if (invoiceCache.size > MAX_VERIFY_CACHE) {
        const first = invoiceCache.keys().next().value;
        if (first) invoiceCache.delete(first);
      }
      invoiceCache.set(data.paymentHash, {
        nakapayId: data.id,
        verifyUrl: `${NAKAPAY_API_BASE}/payment-requests/${data.id}`,
        amountSats,
        description: comment,
      });
      saveInvoiceCache();
      console.log(`[lightning] Cached invoice ${data.paymentHash.slice(0, 16)}... for later verification`);
    }

    return {
      paymentRequest: data.invoice || data.paymentRequest || data.bolt11,
      paymentHash: data.paymentHash,
      amountSats,
      description: comment,
      verify: `${NAKAPAY_API_BASE}/payment-requests/${data.id}`,
      expiresAt: data.expiresAt ? Math.floor(new Date(data.expiresAt).getTime() / 1000) : undefined,
    };
  } catch (err: any) {
    console.error("[lightning] Failed to create invoice:", err.message);
    return null;
  }
}

/**
 * Verify if a payment has been received via Nakapay status endpoint
 *
 * @param paymentHash - The payment hash from createInvoice()
 * @returns { paid, preimage, amountSats, description } - paid is true if settled
 */
export async function verifyPayment(
  paymentHash: string
): Promise<{ paid: boolean; preimage?: string; amountSats?: number; description?: string }> {
  const cached = invoiceCache.get(paymentHash);
  if (!cached) {
    if (!(verifyPayment as any).__warned?.has(paymentHash)) {
      if (!(verifyPayment as any).__warned) (verifyPayment as any).__warned = new Set();
      (verifyPayment as any).__warned.add(paymentHash);
      console.log(`[lightning] No invoice cached for ${paymentHash.slice(0, 16)}...`);
    }
    return { paid: false };
  }

  try {
    const response = await fetch(cached.verifyUrl, {
      headers: {
        "Authorization": `Bearer ${NAKAPAY_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.log(`[lightning] Nakapay verify failed: ${response.status}`);
      return { paid: false, amountSats: cached.amountSats, description: cached.description };
    }

    const data = await response.json();
    console.log(`[lightning] Nakapay status: ${data.status} for ${paymentHash.slice(0, 16)}...`);

    // Nakapay uses "PAID", "SETTLED", or "COMPLETED" status
    const isPaid = 
      data.status === "PAID" || 
      data.status === "SETTLED" || 
      data.status === "COMPLETED" ||
      data.settled === true;

    if (isPaid) {
      invoiceCache.delete(paymentHash);
      saveInvoiceCache();
      console.log(`[lightning] Payment confirmed: ${paymentHash.slice(0, 16)}...`);
    }

    return {
      paid: isPaid,
      preimage: data.preimage || data.paymentPreimage,
      amountSats: cached.amountSats,
      description: cached.description,
    };
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
  if (!isNakapayConfigured()) {
    return null;
  }

  return {
    address: NAKAPAY_DESTINATION_WALLET || "",
    minSats: NAKAPAY_MIN_SATS,
    maxSats: 10_000_000, // 10M sats
    description: "Nakapay Lightning wallet",
    active: true,
  };
}

/**
 * Initialize Lightning on boot — called from index.ts
 */
export async function initLightning(): Promise<boolean> {
  loadInvoiceCache();

  if (!isNakapayConfigured()) {
    console.log("[lightning] Nakapay not configured. Set NAKAPAY_API_KEY and NAKAPAY_DESTINATION_WALLET");
    return false;
  }

  nakapayInitialized = true;
  console.log(`[lightning] Nakapay initialized for ${NAKAPAY_DESTINATION_WALLET}`);
  console.log(`[lightning] Min: ${NAKAPAY_MIN_SATS} sats`);
  return true;
}
