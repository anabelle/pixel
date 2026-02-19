# Learnings & Corrections

> Last updated: 2026-02-09, Session 11
> This file is the FIRST thing to read in any new session.
> It contains corrections to our assumptions and hard-won insights.

---

## Corrections to V2 AGENTS.md

### 1. Pi repo is pi-mono, not pi
The V2 AGENTS.md correctly referenced `@mariozechner/pi-agent-core` and `@mariozechner/pi-ai` as npm packages, but the GitHub link should be `badlogic/pi-mono` (8,790 stars), not `badlogic/pi` (14 stars, unrelated GPU pod manager). The monorepo contains 7 packages under `packages/`.

### 2. "50-100 lines per connector" is optimistic
- **Telegram**: ~30 lines for basic echo (grammY is excellent). Realistic: 50-80 lines with error handling.
- **WhatsApp**: The V2 plan said 50-100 lines. Realistic: 150-250 lines with QR auth, session persistence, reconnection, error handling, message type handling.
- **Instagram**: Not a "connector" -- it's a webhook endpoint + REST API. But the blocker is bureaucratic (Meta Business verification, app review = weeks), not technical.
- **Nostr**: ~100 lines for publish/subscribe. DVM adds another ~100-150 lines.

### 3. L402 ecosystem is immature
The V2 plan implied L402 was a drop-in solution. It is not. No production-ready TypeScript middleware exists. No Hono middleware at all. Best option: build custom (~200-300 lines) using NWC for invoice management and HMAC for macaroon logic. Budget 1-2 days, not hours.

### 4. x402 is stablecoin, not Lightning
x402 uses USDC on Base/Solana chains, not Bitcoin/Lightning. The V2 plan listed it alongside L402 as if they were interchangeable. They serve completely different audiences:
- x402 = DeFi/crypto users paying with stablecoins
- L402 = Bitcoiners paying with Lightning
- NIP-90 DVM = Nostr users paying with Lightning/zaps

### 5. Instagram should be Month 2+
Meta Business verification alone can take weeks. The 24-hour messaging window and no-proactive-messaging rules make Instagram less useful for an AI agent anyway. No viable unofficial libraries exist. Deprioritize.

### 6. ERC-8004 has no deployed contracts
The plan mentioned ERC-8004 as a Week 4 deliverable. The standard is still DRAFT with no deployed contracts. But serving `agent-card.json` (A2A protocol) and `agent-registration.json` (ERC-8004 format) costs nearly nothing and positions us for when contracts deploy. Do the JSON files in Week 1.

---

## Architectural Decisions (confirmed by research)

### Confirmed Good Decisions
- **grammY over Telegraf**: grammY is newer, better typed, Bun-native, up-to-date Bot API
- **Baileys over whatsapp-web.js**: Pure WebSocket vs Puppeteer/Chromium. 5x less memory, Bun-native
- **Hono over Express**: Native Bun, TypeScript-first, built-in WebSocket, ~14KB core
- **Drizzle over Prisma**: Zero runtime overhead, SQL-first, TypeScript types from schema
- **Caddy over Nginx**: Auto-HTTPS, 15 lines vs 149, transparent WebSocket proxy, no DNS hacks
- **NWC/Alby over self-hosted CLN**: Zero containers, ~2.5GB memory freed, API-driven
- **NDK for Nostr**: Bun-native, built-in DVM support, active maintenance (by pablof7z)

### New Decision: Agent Card from Day 1
Serve `/.well-known/agent-card.json` from the start. Costs almost nothing, makes Pixel discoverable by A2A-compatible agents. Add `agent-registration.json` too for ERC-8004 readiness.

### Open Question: pi-agent-core's API surface
We know pi-agent-core exists and pi-mom uses it for Slack. But we haven't read the actual source code yet. The API for `processMessage(text, context)` is assumed -- we don't know the real function signatures. **Must read packages/agent/src/ before implementing.**

---

## Operational Learnings (from V1 scars)

### Memory
- VPS has 3.8GB total RAM
- V1 uses ~3.5GB (18 containers, swap at 96%)
- Bitcoin Core (1.5GB limit) + Lightning (1GB limit) = ~2.5GB that V2 doesn't need
- V2 budget: ~1.2GB total (pixel 512MB, web 256MB, postgres 256MB, caddy 64MB)
- **Kill Bitcoin + Lightning containers FIRST before any V2 work**

### Docker
- `NEXT_PUBLIC_*` vars are build-time only. Rebuild container when they change.
- Container rebuild can cascade (docker-compose dependency chains). Always check `docker compose ps` after.
- Use variable-based `proxy_pass` in nginx for DNS re-resolution (not needed with Caddy).
- Logging drivers affect `docker compose logs`. Use `json-file` driver.

### Security
- `.env` contains real secrets and may be committed. V2 must fix this from day 1: `.gitignore` the `.env`, use `.env.example` for template.
- Never commit `NOSTR_PRIVATE_KEY`, `NAKAPAY_API_KEY`, `TELEGRAM_BOT_TOKEN`, or `GH_TOKEN`.

### AI Provider
- Gemini free tier via OpenAI-compatible endpoint works. No patches needed if using pi-ai.
- The 130 lines of Dockerfile patches were all for ElizaOS's ai-sdk compatibility with Gemini. pi-ai handles this natively.

---

## Research Protocol (for future sessions)

### Before Starting Any Implementation Session
1. Read this file (`06-learnings.md`) first
2. Check `00-research-index.md` for relevant research
3. Verify: has any dependency released a new version since last session?
4. Verify: are V2 containers healthy? (`docker compose ps`)

### Before Adding Any New Dependency
1. Check npm/GitHub for: last update, maintenance status, star count, open issues
2. Test Bun compatibility (not all npm packages work with Bun)
3. Assess bus factor (single maintainer?)
4. Check license compatibility (MIT/Apache preferred)
5. Document findings in relevant research file

### After Any Session
1. Update this file with new learnings or corrections
2. Update `00-research-index.md` if new research was done
3. Update `v2/AGENTS.md` status table
4. Commit research files

---

## V2 Implementation Priority (revised by research)

| Week | Task | Confidence | Notes |
|------|------|-----------|-------|
| 1 | Core (Hono + Drizzle + Caddy + pi-agent-core) | High | All deps verified |
| 1 | agent-card.json + agent-registration.json | High | Trivial, high value |
| 2 | Telegram connector (grammY) | Very High | Best documented platform |
| 2 | Nostr connector (NDK) | High | Same key, proven library |
| 2 | First DVM (text generation, kind 5050) | High | NDK has built-in support |
| 2 | NWC/Alby integration | High | @getalby/sdk is mature |
| 3 | WhatsApp connector (Baileys) | Medium | More complex than planned |
| 3 | L402 middleware (custom build) | Medium | No existing solution |
| 3 | LNPixels API migration | Medium | Must not break existing revenue |
| 4 | x402 middleware | High | @x402/hono is drop-in |
| 4 | Sandbox container | Medium | Pi Mom pattern helps |
| 4+ | Instagram connector | Low | Meta verification blocker |
| 4+ | ERC-8004 on-chain registration | Watch | No contracts deployed yet |
