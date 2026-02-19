# Payment Protocols Research

> Researched: 2026-02-09

## Summary

Three payment protocols for V2, each serving a different audience:

| Protocol | Payment Type | Audience | Hono Support | Status |
|----------|-------------|----------|-------------|--------|
| x402 | USDC on Base/Solana | Crypto/DeFi users | `@x402/hono` (official) | Production-ready |
| L402 | Lightning/sats | Bitcoiners | **None** (must build) | Immature ecosystem |
| NIP-90 DVM | Lightning via Nostr | Nostr ecosystem | N/A (Nostr protocol) | NDK is mature |

---

## x402 (Coinbase)

### Stats
- Repo: `coinbase/x402` (5,400+ stars, 186 contributors)
- License: Apache-2.0
- Volume: 75.4M transactions, $24.2M volume, 94K buyers
- Packages: `@x402/core` v2.3.0, `@x402/hono`, `@x402/evm`, `@x402/svm`

### How It Works
1. Client hits protected endpoint
2. Server returns `402` with `PAYMENT-REQUIRED` header
3. Client signs crypto payment payload (EVM or Solana)
4. Client retries with `PAYMENT-SIGNATURE` header
5. Facilitator verifies + settles on-chain

### Hono Integration (15 lines)
```typescript
import { paymentMiddleware } from "@x402/hono";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator" // testnet
});
const server = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(server);

app.use(paymentMiddleware({
  "/api/premium": {
    accepts: [{ scheme: "exact", price: "$0.10", network: "eip155:84532", payTo }],
    description: "Premium API access",
    mimeType: "application/json",
  }
}, server));
```

### Requirements
- EVM wallet address (Base chain) -- **TBD, need to create**
- Small USDC amount for testing
- Facilitator URL (Coinbase provides testnet + production)

### Verdict
Production-ready, first-class Hono support, serious backing. Drop-in middleware. **Implement in Week 4.**

---

## L402 (Lightning HTTP 402)

### The Hard Truth
**No production-ready TypeScript/Hono middleware exists.** The L402 ecosystem is immature.

### What Exists

| Library | Lang | Stars | Framework | Status |
|---------|------|-------|-----------|--------|
| `lightning-toll` | JS | 1 | Express only | PoC, 3 commits, not on npm |
| SatGate | Go+TS | 0 | Reverse proxy | v0.4.0, gateway not middleware |
| `blockbuster` | Go | 2 | Go only | Video monetization |

### lightning-toll Pattern (Port to Hono)
```javascript
// Express pattern -- needs porting to Hono middleware
const toll = createToll({ wallet: NWC_URL, secret: 'hmac-secret' });
app.get('/api/joke', toll({ sats: 5 }), handler);
```

Core L402 logic is ~200-300 lines:
1. Create Lightning invoice via NWC
2. Mint macaroon (HMAC-SHA256) with payment_hash
3. Return `402` with `WWW-Authenticate: L402 invoice="lnbc...", macaroon="..."`
4. On retry: verify preimage matches payment_hash, check macaroon caveats
5. Grant access

### Plan
Build custom L402 Hono middleware using:
- `@getalby/sdk` for NWC wallet (invoice creation, payment verification)
- Custom macaroon implementation (HMAC chain, ~100 lines)
- Hono `createMiddleware` pattern

**Implement in Week 3.** Budget: 1-2 days.

---

## NIP-90 DVM (Data Vending Machine)

### Protocol
Nostr-native job marketplace. Customers publish job requests, Service Providers listen, process, and return results.

### Kind Ranges
| Kind | Purpose |
|------|---------|
| 5000-5999 | Job requests (customer) |
| 6000-6999 | Job results (SP, kind = request + 1000) |
| 7000 | Feedback (processing, payment-required, error) |

### Pre-defined Jobs We Care About
| Request | Result | Job |
|---------|--------|-----|
| 5050 | 6050 | Text Generation |
| 5100 | 6100 | Image Generation |

### Implementation with NDK

```typescript
import NDK, { NDKPrivateKeySigner, NDKDVMRequest, NDKDVMJobResult } from "@nostr-dev-kit/ndk";
import { nwc } from "@getalby/sdk";

const ndk = new NDK({
  explicitRelayUrls: ["wss://relay.damus.io", "wss://nos.lol"],
  signer: new NDKPrivateKeySigner(DVM_KEY),
});
await ndk.connect();

const nwcClient = new nwc.NWCClient({ nostrWalletConnectUrl: NWC_URL });

// Listen for text generation requests
const sub = ndk.subscribe({ kinds: [5050] }, { closeOnEose: false });

sub.on("event", async (event) => {
  const request = NDKDVMRequest.from(event);
  
  // Send payment-required
  const invoice = await nwcClient.makeInvoice({ amount: 1000, description: `DVM: ${request.id}` });
  const payReq = request.createFeedback("payment-required");
  payReq.tags.push(["amount", "1000", invoice.invoice]);
  await payReq.publish();
  
  // Poll for payment, then process
  // ... (see full pattern in NIP-90 research)
});
```

### NWC (Nostr Wallet Connect) for Lightning

```typescript
import { nwc } from "@getalby/sdk";

const client = new nwc.NWCClient({ nostrWalletConnectUrl: "nostr+walletconnect://..." });

await client.makeInvoice({ amount: 1000, description: "...", expiry: 3600 });
await client.payInvoice({ invoice: "lnbc..." });
await client.getBalance(); // { balance: msats }
await client.lookupInvoice({ payment_hash: "..." }); // { state: "settled" | "pending" }
```

### Requirements
- NWC connection string from Alby Hub (or Coinos, LNbits)
- Nostr private key (reuse existing `NOSTR_PRIVATE_KEY`)
- NDK + @getalby/sdk packages

### Verdict
NDK is mature, well-maintained, Bun-native. DVM protocol is straightforward. **Implement first DVM in Week 2.** NWC replaces self-hosted CLN entirely.

---

## Revenue Architecture Summary

```
         Normie Revenue                    Agent/Crypto Revenue
    ┌──────────────────────┐          ┌────────────────────────────┐
    │ WhatsApp Tips (QR)   │          │ NIP-90 DVM (Lightning)     │
    │ Telegram Tips (QR)   │          │ L402 (Lightning HTTP 402)  │
    │ Canvas (pay-per-pixel)│         │ x402 (USDC on Base)        │
    │ Commissions (invoices)│         │ Nostr Zaps                 │
    └──────────┬───────────┘          └──────────────┬─────────────┘
               │                                      │
               └──────────┬──────────────────────────┘
                          │
                    NWC / Alby Hub
                    (unified wallet)
```
