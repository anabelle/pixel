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

// Blink (Galoy) — primary when configured; webhooks (receive.lightning) + pull verify
const BLINK_API_KEY = process.env.BLINK_API_KEY;
const BLINK_ENDPOINT = process.env.BLINK_API_ENDPOINT || "https://api.blink.sv/graphql";
const BLINK_MIN_SATS = 1;

// Cache payment requests for verification
// Maps paymentHash → { provider, amountSats, description, ... }
interface InvoiceCache {
  provider: "nakapay" | "blink";
  nakapayId?: string;
  verifyUrl?: string;
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
          invoiceCache.set(hash, normalizeCacheEntry(entry));
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

/** Check which provider is active: Blink > Nakapay */
function activeProvider(): "blink" | "nakapay" | null {
  if (BLINK_API_KEY) return "blink";
  if (NAKAPAY_API_KEY && NAKAPAY_DESTINATION_WALLET) return "nakapay";
  return null;
}

/** Load invoice cache entries from disk (legacy entries default to nakapay) */
function normalizeCacheEntry(entry: any): InvoiceCache {
  return { provider: entry.provider || "nakapay", nakapayId: entry.nakapayId, verifyUrl: entry.verifyUrl, amountSats: entry.amountSats, description: entry.description };
}

/** Blink GraphQL helper */
async function blinkGraphQL(query: string, variables: Record<string, any> = {}): Promise<any> {
  const res = await fetch(BLINK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": BLINK_API_KEY! },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Blink API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const body = (await res.json()) as { data?: any; errors?: Array<{ message: string }> };
  if (body.errors?.length) {
    throw new Error(`Blink GraphQL: ${body.errors.map((e: any) => e.message).join("; ")}`);
  }
  return body.data;
}

/** Resolve the BTC wallet id for Blink invoice creation */
let blinkWalletId: string | null = null;
async function resolveBlinkWalletId(): Promise<string> {
  if (blinkWalletId) return blinkWalletId;
  if (process.env.BLINK_WALLET_ID) {
    blinkWalletId = process.env.BLINK_WALLET_ID;
    return blinkWalletId;
  }
  const data = await blinkGraphQL(
    "query Me { me { defaultAccount { wallets { id walletCurrency } } } }"
  );
  const btc = data?.me?.defaultAccount?.wallets?.find((w: any) => w.walletCurrency === "BTC");
  if (!btc?.id) throw new Error("Blink: no BTC wallet found");
  const id: string = btc.id;
  blinkWalletId = id;
  return id;
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
  const provider = activeProvider();
  if (!provider) {
    console.error("[lightning] No provider configured. Set BLINK_API_KEY or NAKAPAY_API_KEY + NAKAPAY_DESTINATION_WALLET");
    return null;
  }

  // Enforce minimum
  const minSats = provider === "blink" ? BLINK_MIN_SATS : NAKAPAY_MIN_SATS;
  if (amountSats < minSats) {
    console.log(`[lightning] Amount ${amountSats} sats below minimum ${minSats} sats, adjusting`);
    amountSats = minSats;
  }

  try {
    if (provider === "blink") {
      const walletId = await resolveBlinkWalletId();
      const data = await blinkGraphQL(
        `mutation LnInvoiceCreate($input: LnInvoiceCreateInput!) {
          lnInvoiceCreate(input: $input) {
            invoice { paymentRequest paymentHash satoshis }
            errors { message }
          }
        }`,
        { input: { amount: amountSats, walletId, memo: comment || `Pixel - ${amountSats} sats` } }
      );
      const inv = data?.lnInvoiceCreate?.invoice;
      const errs = data?.lnInvoiceCreate?.errors;
      if (!inv?.paymentRequest || !inv?.paymentHash) {
        console.error(`[lightning] Blink create invoice failed: ${errs?.[0]?.message || "no invoice"}`);
        return null;
      }
      console.log(`[lightning] Blink invoice: hash=${inv.paymentHash.slice(0, 16)}... invoice=${inv.paymentRequest.slice(0, 20)}...`);

      if (invoiceCache.size > MAX_VERIFY_CACHE) {
        const first = invoiceCache.keys().next().value;
        if (first) invoiceCache.delete(first);
      }
      invoiceCache.set(inv.paymentHash, { provider: "blink", amountSats, description: comment });
      saveInvoiceCache();

      return {
        paymentRequest: inv.paymentRequest,
        paymentHash: inv.paymentHash,
        amountSats,
        description: comment,
        expiresAt: undefined,
      };
    }

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
        provider: "nakapay",
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
    if (cached.provider === "blink") {
      // Documented pull-verify: recent transactions, match by paymentHash.
      // Preimage (settlementVia.preImage) is the cryptographic proof of payment.
      const data = await blinkGraphQL(
        `query PaymentsWithProof($first: Int) {
          me { defaultAccount { transactions(first: $first) {
            edges { node {
              direction
              status
              settlementAmount
              initiationVia { ... on InitiationViaLn { paymentHash } }
              settlementVia {
                ... on SettlementViaIntraLedger { preImage }
                ... on SettlementViaLn { preImage }
              }
            } } } } } }`,
        { first: 20 }
      );
      const nodes: any[] = data?.me?.defaultAccount?.transactions?.edges?.map((e: any) => e.node) || [];
      const tx = nodes.find((n) => n.initiationVia?.paymentHash === paymentHash);
      if (!tx) {
        return { paid: false, amountSats: cached.amountSats, description: cached.description };
      }
      const isPaid = tx.status === "SUCCESS" && tx.direction === "RECEIVE";
      if (isPaid) {
        console.log(`[lightning] Payment confirmed (blink): ${paymentHash.slice(0, 16)}...`);
      }
      return {
        paid: isPaid,
        preimage: tx.settlementVia?.preImage,
        amountSats: tx.settlementAmount ?? cached.amountSats,
        description: cached.description,
      };
    }

    const response = await fetch(cached.verifyUrl!, {
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
 * Consume a verified invoice proof so simplified L402 credentials cannot be replayed forever.
 * Returns true if a cached invoice entry was removed.
 */
export function consumeInvoice(paymentHash: string): boolean {
  const existed = invoiceCache.delete(paymentHash);
  if (existed) {
    saveInvoiceCache();
  }
  return existed;
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
  const provider = activeProvider();
  if (!provider) {
    return null;
  }

  if (provider === "blink") {
    return {
      address: "blink",
      minSats: BLINK_MIN_SATS,
      maxSats: 10_000_000,
      description: "Blink Lightning wallet",
      active: true,
    };
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

  const provider = activeProvider();
  if (!provider) {
    console.log("[lightning] No provider configured. Set BLINK_API_KEY or NAKAPAY_API_KEY + NAKAPAY_DESTINATION_WALLET");
    return false;
  }

  if (provider === "blink") {
    try {
      await resolveBlinkWalletId();
      console.log(`[lightning] Blink initialized (wallet ${blinkWalletId!.slice(0, 8)}...)`);
      console.log(`[lightning] Min: ${BLINK_MIN_SATS} sats`);
      return true;
    } catch (err: any) {
      console.error(`[lightning] Blink init failed: ${err.message}`);
      return false;
    }
  }

  nakapayInitialized = true;
  console.log(`[lightning] Nakapay initialized for ${NAKAPAY_DESTINATION_WALLET}`);
  console.log(`[lightning] Min: ${NAKAPAY_MIN_SATS} sats`);
  return true;
}
