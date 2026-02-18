/**
 * x402 Middleware (USDC on Base)
 *
 * Hono integration for the x402 payment protocol.
 * Uses @coinbase/x402 for CDP facilitator authentication (JWT-based).
 */

import type { MiddlewareHandler } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { privateKeyToAccount } from "viem/accounts";
import { recordRevenue } from "./revenue.js";

const X402_NETWORK = process.env.X402_NETWORK ?? "eip155:8453";

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

const PAYWALL_CONFIG = {
  appName: "Pixel",
  appLogo: "https://pixel.xx.kg/logo.png",
  testnet: X402_NETWORK !== "eip155:8453",
};

function resolvePayTo(): string | null {
  const explicit = process.env.X402_PAY_TO?.trim();
  if (explicit) {
    return explicit.startsWith("0x") ? explicit : `0x${explicit}`;
  }

  const privateKey = process.env.EVM_PRIVATE_KEY?.trim();
  if (!privateKey) return null;
  const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  return privateKeyToAccount(normalized as `0x${string}`).address;
}

const X402_PAY_TO = resolvePayTo();

/** Build facilitator client — uses CDP mainnet facilitator with JWT auth if keys present */
function buildFacilitatorClient(): HTTPFacilitatorClient | null {
  if (CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
    const config = createFacilitatorConfig(CDP_API_KEY_ID, CDP_API_KEY_SECRET);
    console.log("[x402] Using CDP mainnet facilitator with JWT auth");
    return new HTTPFacilitatorClient(config);
  }

  // For mainnet (eip155:8453), CDP keys are required — disable x402
  if (X402_NETWORK === "eip155:8453") {
    console.warn(
      "[x402] CDP_API_KEY_ID / CDP_API_KEY_SECRET not set — x402 routes disabled (mainnet requires CDP auth)"
    );
    return null;
  }

  // Testnet: use public facilitator (no auth needed)
  const fallbackUrl =
    process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";
  console.log(`[x402] Using testnet facilitator: ${fallbackUrl}`);
  return new HTTPFacilitatorClient({ url: fallbackUrl });
}

const facilitatorClient = buildFacilitatorClient();

let resourceServer: InstanceType<typeof x402ResourceServer> | null = null;

if (facilitatorClient) {
  resourceServer = new x402ResourceServer(facilitatorClient);
  resourceServer.register(X402_NETWORK, new ExactEvmScheme());

  resourceServer.onAfterSettle(async ({ requirements, result }) => {
    if (!result.success) return;
    // USDC on Base uses 6 decimals
    const amountUsd = formatUsd(requirements.maxAmountRequired, 6);
    const description =
      typeof requirements.extra?.description === "string"
        ? requirements.extra.description
        : "x402 payment";

    await recordRevenue({
      source: "x402",
      amountSats: 0,
      amountUsd,
      txHash: result.transaction,
      userId: result.payer ?? undefined,
      description,
    });
  });
}

function formatUsd(amount: string, decimals: number): number {
  try {
    const base = 10n ** BigInt(decimals);
    const value = BigInt(amount);
    const whole = value / base;
    const fraction = (value % base).toString().padStart(decimals, "0").slice(0, 4);
    const composed = `${whole.toString()}.${fraction.padEnd(4, "0")}`;
    return Number.parseFloat(composed);
  } catch {
    return 0;
  }
}

export interface X402RouteOptions {
  priceUsd: number;
  description: string;
  resource?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
}

export function x402(routePattern: string, opts: X402RouteOptions): MiddlewareHandler {
  if (!X402_PAY_TO || !resourceServer) {
    console.warn(`[x402] Route ${routePattern} disabled — missing EVM_PRIVATE_KEY or facilitator`);
    return async (_c, next) => await next();
  }

  const price = `$${opts.priceUsd.toFixed(2)}`;
  const routes = {
    [routePattern]: {
      accepts: [
        {
          scheme: "exact",
          price,
          network: X402_NETWORK,
          payTo: X402_PAY_TO,
          maxTimeoutSeconds: opts.maxTimeoutSeconds,
          extra: { description: opts.description },
        },
      ],
      description: opts.description,
      resource: opts.resource,
      mimeType: opts.mimeType ?? "application/json",
    },
  };

  return paymentMiddleware(routes, resourceServer, PAYWALL_CONFIG);
}
