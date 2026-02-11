# PIXEL V2 — MASTER AGENT BRIEFING

> **Read this file FIRST in every session. It is the single source of truth.**
> Last updated: 2026-02-11 | Session: 25

---

## TABLE OF CONTENTS

1. [What Is Pixel](#what-is-pixel)
2. [Session History](#session-history)
3. [The Self-Critique — Why V1 Failed](#why-v1-failed)
4. [Character & Identity](#character)
5. [Architecture](#architecture)
6. [Revenue Model](#revenue)
7. [Technology Stack](#tech-stack)
8. [Implementation Plan](#implementation-plan)
9. [Research Findings](#research)
10. [Project Management & Accountability](#project-management)
11. [Operational Reference](#operations)
12. [Coordinates & Credentials](#coordinates)
13. [Rules for Future Sessions](#rules)

---

## 1. WHAT IS PIXEL {#what-is-pixel}

Pixel is a **living digital artist and AI assistant** that exists across multiple platforms simultaneously. It has a distinct personality, creates art, holds conversations, and earns its own money through value-for-value exchanges.

**Pixel is NOT:**
- A generic chatbot or assistant
- A SaaS product
- A framework or platform (yet)
- An academic exercise in AI philosophy

**Pixel IS:**
- A character with opinions, art, and voice
- Reachable on WhatsApp, Telegram, Instagram, Nostr, and HTTP
- A Bitcoin-native entity that accepts Lightning, USDC, and zaps
- An autonomous agent that creates art, takes commissions, and sells AI services
- Self-evolving — it writes its own tools and skills

**The one-liner:** "The street artist who learned to code. Lives on every platform, creates for anyone who asks, gets paid in whatever currency you've got."

---

## 2. SESSION HISTORY {#session-history}

### Sessions 1-7: Infrastructure Fixes (V1, ALL COMMITTED)

Fixed recurring breakage in V1 deployment. All committed and pushed.

| Session | What Was Fixed | Key Commit |
|---------|---------------|------------|
| 1 | Docker mounts, stale data, duplicate Nostr posting | — |
| 2 | Lightning crash loop — disabled crashing CLN plugins | — |
| 3 | Permissions overhaul — root-owned files, user 1000:1000, vision API fix | — |
| 4 | Clawstr integration (6 tools), ecosystem awareness for Nostr prompts | — |
| 5 | Switched dead OpenAI to free Google Gemini, patched ai-sdk, OpenRouter fallback | — |
| 6 | Nginx DNS caching, NEXT_PUBLIC build-time fix, embedding provider, docs overhaul | — |
| 7 | Nostr truncation fix — maxTokens 256→1024, frequency/presence penalty override | — |

**Key commits:** pixel-agent `632b6bf`, syntropy-core `37fae4e`, parent `fb5f356`

### Session 8: Research & V2 Architecture Spec

Declared V1 a "cute but failed project." Researched:
- ElizaOS (stuck at v1.7.2, no v2/v3 exists, NOT worth building on)
- CrewAI (43.9k stars), LangGraph (24.5k stars) — production-ready but Python
- MCP (78.3k stars) — won as tool integration standard
- AI agent crypto market ($2.79B cap, down 75% from ATH, entirely Solana/Base)
- NIP-90 DVMs, NDK, OpenRouter, AI SDK 6
- Original V2 spec: reduce 18 containers to 4

### Session 9: Pi/OpenClaw Deep Dive & Strategic Challenge

Human sent Armin Ronacher's blog post about Pi. Deep research on:

**Pi monorepo** (`badlogic/pi-mono`, 8.7K stars, MIT):
- `@mariozechner/pi-ai` — Unified multi-provider LLM API (18+ providers)
- `@mariozechner/pi-agent-core` — Stateful agent runtime (events, steering, follow-ups)
- `@mariozechner/pi-coding-agent` — Terminal coding agent CLI
- `@mariozechner/pi-mom` — Slack bot using Pi SDK (THIS IS PIXEL'S PATTERN)

**Pi's philosophy (directly adopted for Pixel v2):**
- Only 4 built-in tools: read, write, edit, bash
- Shortest system prompt of any agent
- No MCP in core — agent writes its own tools
- Extensions = hot-reloadable TypeScript modules
- Skills = markdown files the agent writes itself
- Sessions are JSONL trees (branch, rewind, summarize)

**OpenClaw** (145K+ stars, Wikipedia article):
- Built ON TOP of Pi's SDK via `createAgentSession()`
- Connects to WhatsApp, Telegram, Signal, Discord
- Self-hackable: builds its own skills through conversation

**Clawi.ai** — managed OpenClaw hosting, $30-60-200/month per user, making millions

**Key strategic questions raised and answered:**
- "Why did you overcomplicate instead of building like Pi?" → Self-critique delivered (see below)
- "VMs?" → Sandboxed execution for agent-written code (Docker container, Pi Mom pattern)
- x402 (Coinbase HTTP 402 micropayments) → third revenue channel
- ERC-8004 (agent identity/reputation on Ethereum) → Phase 2-3

### Session 10: Futuresight, Normie Reframe, Brain Transplant

Human's critical intervention: "you are not including not even one way you can help me while people are eager for that — WhatsApp, Instagram, meet the normies where they are."

### Sessions 11-12: V2 Built, Deployed, and Remembering

**Session 11:** Built and deployed V2 with 3 doors (HTTP, Telegram, Nostr). Fixed chat endpoint bug (event filtering), switched to Google Gemini (OpenRouter out of credits), added grammY Telegram bot and NDK Nostr connector.

**Session 12:** Implemented conversation persistence (Pi Mom pattern). Created `conversations.ts` module with per-user JSONL directories. Added `promptWithHistory()` as single entry point — loads context via `agent.replaceMessages()`, saves after prompt, appends to log.jsonl. Verified end-to-end: Pixel remembers users across messages.

**Session 13:** Deployed NIP-90 DVM (text generation, kind 5050→6050) with NIP-89 announcement. Wrote Lightning service (`lightning.ts`) and WhatsApp connector (`whatsapp.ts`), wired into `index.ts` with new HTTP endpoints (`/api/invoice`, `/api/wallet`). Not deployed yet at end of session.

**Session 14:** Deployed Lightning + WhatsApp + DVM payment flow. Added npm deps (`@getalby/lightning-tools`, `@whiskeysockets/baileys`, `@hapi/boom`). Completed DVM payment-required flow: when Lightning is available, sends kind 7000 `payment-required` feedback with bolt11 invoice, polls for payment, then processes. Gracefully degrades to free if Lightning unavailable. Added WhatsApp auth volume to docker-compose. Fixed Lightning address typo (`sparepicolo55` → `sparepiccolo55`, double c) in .env, all source files, and docs. Rebuilt and verified: Lightning initializes successfully, invoices work.

**Session 15 (uncommitted until Session 16):** Fixed sats vs millisats bug in Lightning service (`lnurlpData.min/max` are millisats per LNURL-pay spec, code treated as sats). Replaced dummy-invoice hack in `verifyPayment()` with `invoiceCache` Map. Added `revenue.ts` service — PostgreSQL-backed revenue tracking wired into DVM payments, HTTP invoice verification, and new `/api/revenue` + updated `/api/stats` endpoints. Implemented context compaction (Pi Mom pattern) — when conversation hits 40 messages, older messages are summarized via LLM and replaced with a synthetic summary message.

**Session 16 (V1 deprecation):** Audited all V1 data. Backed up V1 PostgreSQL (110K lines, 1.9GB with embeddings) and canvas SQLite (9,058 pixels, 80,318 sats revenue). Fixed Lightning address typo in ALL remaining V1 files (~40 locations). Rebuilt landing page — `pixel.xx.kg` now shows correct `sparepiccolo55` address. Killed V1 agent and Syntropy containers (freed ~1GB RAM budget, eliminated Nostr double-posting). Added V2 routes to nginx — V2 API now accessible at `https://pixel.xx.kg/v2/*` and agent-card at `/.well-known/agent-card.json`. Connected V2 container to V1 nginx network. Canvas services (api + web + postgres) preserved — only revenue source.

**Session 17 (Heartbeat + cleanup):** Added autonomous heartbeat service (`src/services/heartbeat.ts`). Pixel now posts to Nostr every 45-90 minutes (randomized jitter), generating original content via its own LLM brain. Supports `[SILENT]` — if agent has nothing to say, it stays quiet. Rate-limited (30 min minimum between posts). First autonomous post verified live. Made V2 nginx network connection persistent by adding `pixel_pixel-net` as external network in `v2/docker-compose.yml` — no more manual `docker network connect`. Killed V1 PostgreSQL (confirmed canvas uses SQLite only, not PostgreSQL). Down to 6 containers.

**Session 18 (L402 revenue door):** Wired L402 middleware into production. `l402.ts` (302 lines, written in Session 17 research) was imported into `index.ts` and deployed with two paid endpoints: `/api/chat/premium` (10 sats) and `/api/generate` (50 sats). Free `/api/chat` preserved for connectors. Agent-card updated to advertise L402 pricing. Verified end-to-end: both endpoints return proper HTTP 402 with real Lightning invoices from Wallet of Satoshi. Zero new dependencies — L402 uses only Node.js `crypto` module + existing `lightning.ts` and `revenue.ts` services. Revenue auto-recorded on payment verification. Canvas migration deferred in favor of new revenue streams — canvas works and earns (80K sats), Socket.IO migration to Hono is complex. x402 research completed but not implemented (needs EVM wallet + npm deps).

**Session 19 (Initiative — rich heartbeat):** Rewrote heartbeat from bland status reporter (~200 lines) to initiative engine (~583 lines). Studied V1 Syntropy's autonomous behaviors (revenue-strategy.md, engagement-protocol.md, monetization research) to understand what "initiative" means. New heartbeat has: (A) Topic rotation system (8 topics: art, bitcoin, code, canvas, existence, community, hot-take, observation — never repeats consecutively), (B) Mood rotation (6 moods: wry, reflective, excited, hustling, observational, playful — never repeats consecutively), (C) Rich per-topic guidance (canvas topic always mentions ln.pixel.xx.kg with real stats, code topic references the 18→4 container journey, etc.), (D) Proactive Nostr engagement — `checkAndReplyToMentions()` runs every 15 minutes, fetches unreplied mentions, replies via `promptWithHistory()` with proper Nostr threading (root/reply tags), rate-limited to 3 replies/cycle with 5s delay. First post after deploy: `"9,058 pixels. Over 80k sats earned. Each dot a choice..."` (topic: canvas, mood: excited) — vs old: `"Zero uptime. Heartbeat #2. Another cycle."` Health endpoint now reports lastTopic, lastMood, engagementActive, repliedMentions count.

**Session 20 (V2 bug fixes + V1 soul porting):** Session 19 audit verdict: "V2 is a better chassis but a worse mind." This session fixed 5 bugs/gaps and ported V1's best personality content into V2. Changes: (A) Double-reply fix — shared `repliedEventIds` Set between `nostr.ts` real-time mention handler and `heartbeat.ts` engagement loop via exported `hasRepliedTo()`/`markReplied()` functions. Both paths now check before replying. (B) Agent-card fix — capabilities changed from `image-generation`/`art-commission` (which don't exist) to `text-generation`/`conversation`. (C) Memory extraction — `saveMemory()` was implemented but never called. Added periodic extraction in `agent.ts`: every 5th message per user, an LLM call extracts key facts (name, interests, preferences) and saves to `conversations/{userId}/memory.md`. Already loaded into system prompt by `loadMemory()`. (D) User tracking — created `users.ts` service (~120 lines) with `trackUser()` upsert (INSERT ON CONFLICT UPDATE), `getUserStats()` for totals/active/by-platform. Wired into `index.ts` boot and `agent.ts` message flow. Added to `/api/stats` response. (E) Live canvas stats — heartbeat now fetches real pixel/sat counts from `http://pixel-api-1:3000/api/stats` with 5s timeout and fallback to cached values, replacing 3 hardcoded references. (F) Character enrichment — grew `character.md` from 63 to 146 lines by porting V1's best content: curated post examples (ultra-short, medium wit, long philosophical, warm, growth), key style rules (Douglas Adams/Pratchett wit, lowercase, no filler words, no em-dashes, no rhetorical questions, anti-assistant behavior, warm empathy, memory references), conversation examples showing range, and topics list. Commit: `c8d91cb`.

**Sessions 21-22 (Inner life system):** Built and deployed autonomous inner life system (`src/services/inner-life.ts`, ~558 lines). Pixel now autonomously reflects, learns, ideates, and evolves without human prompting. Inner life runs on heartbeat cycles — different activities fire at different intervals: reflection (every 3 cycles), learning extraction (every 2 cycles), ideation (every 5 cycles), identity evolution (every 10 cycles). Each produces persistent markdown files in `data/` directory (reflections.md, learnings.md, ideas.md, evolution.md). Inner life context is injected into system prompt via `getInnerLifeContext()` so Pixel's self-knowledge enriches all conversations. Also researched Ralph Loops (Geoff Huntley, 9.9K stars — autonomous AI coding pattern using bash while loops) and Gastown (Steve Yegge, 8.9K stars — multi-agent workspace manager with tmux + git worktrees). Analyzed Nostr timeline: three eras visible (V1 spam, V1 navel-gazing, V2 clean character), engagement nearly zero (1 Nostr user, 1 Telegram user). Commit: `2f429c6`.

**Session 23 (Tools system — Pixel gets hands):** Built, deployed, and verified 7 tools giving Pixel actual hands to interact with its environment. Created `src/services/tools.ts` (~366 lines) following pi-agent-core's `AgentTool` API with TypeBox schemas. Tools: (A) `read_file` — filesystem read with line numbers, offset/limit for large files, auto-detects directories. (B) `write_file` — create/overwrite files with auto-mkdir. (C) `edit_file` — search-and-replace with exact text matching, validates uniqueness. (D) `bash` — shell command execution via `Bun.spawn()`, 30s default/120s max timeout, 50KB output truncation. (E) `check_health` — monitors all Pixel infrastructure (self, canvas API, canvas web, landing). (F) `read_logs` — lists conversations, fetches revenue stats, or reports self status. (G) `web_fetch` — HTTP fetch for web research, 15s timeout, 30KB truncation, JSON auto-format. Wired tools into `agent.ts` — only the main conversation agent (`promptWithHistory()`) and raw agent factory (`createPixelAgent()`) get tools; memory extraction and compaction agents keep `tools: []`. Added Docker socket mount (`/var/run/docker.sock`) + `group_add: ["988"]` in docker-compose for self-healing capability. Added `bash` and `curl` packages to Dockerfile's Alpine runtime (Alpine only has `sh` by default). Verified all tools working in production: Pixel successfully read its own character.md, ran `ls` commands, and checked infrastructure health. Commit: `97bcaaa`.

**Session 24 (Inner life fix + landing page V2 + cleanup):** Two problems fixed this session. (A) **Inner life files not writing** — two-part root cause: (1) `data/` directory owned by root → fixed with `chown -R 1000:1000`, (2) `llmCall()` had no timeout and no error logging, causing REFLECT phase to hang silently forever. Fix: added 60-second timeout via `Promise.race()` in `llmCall()`, changed `runInnerLifeCycle()` from one monolithic try/catch to individual try/catch per phase (LEARN, REFLECT, IDEATE, EVOLVE) with explicit completion/failure logging. (B) **Stale landing page** — complete rewrite of `pixel-landing/src/app/[locale]/page.tsx` from V1 Syntropy-era content to V2. New sections: About (3 paragraphs), Capabilities grid (4 cards: conversation, art, services, self-evolving), Find Pixel platform grid (6 cards: Telegram, WhatsApp "coming soon", Nostr, Canvas, HTTP API, GitHub), Value for Value (Lightning + Bitcoin addresses), Live Canvas Stats. Deleted 8 stale V1 files: SyntropyThoughtStream, SyntropyAuditLog, SyntropyContinuity components + audit/syntropy/continuity/metrics API routes + memories page. Removed Syntropy volume mounts from parent docker-compose.yml. Resolved git merge conflict in submodule (V1 rebase conflict vs V2 stash). Both repos committed and pushed. Parent commit: `d7ede02`, submodule commit: `9a8c958`. Inner life verified running (cycle 1 completed, LEARN fires at cycle 2, ~79 min heartbeat interval).

**Session 25 (Model upgrade):** Upgraded V2 model to **Gemini 3 Flash** (`gemini-3-flash-preview`) and verified `/api/chat` response. Updated `v2/docker-compose.yml` and `.env` (`OPENAI_LARGE_MODEL`).

**V2 file inventory (15 source files, ~3200 lines):**
| File | Lines | Purpose |
|------|-------|---------|
| `src/index.ts` | ~400 | Boot, Hono HTTP, /api/chat, /api/chat/premium (L402), /api/generate (L402), /health, /api/invoice, /api/wallet, /api/revenue, /api/stats, DB auto-init, user tracking index |
| `src/agent.ts` | ~345 | Pi agent wrapper, promptWithHistory(), extractText(), context compaction, periodic memory extraction, tools wiring |
| `src/conversations.ts` | ~240 | JSONL persistence, context compaction (summarize old messages via LLM) |
| `src/connectors/telegram.ts` | ~110 | grammY bot with persistent memory |
| `src/connectors/nostr.ts` | ~260 | NDK mentions + DMs + DVM startup + shared repliedEventIds (hasRepliedTo/markReplied) |
| `src/connectors/whatsapp.ts` | ~175 | Baileys bot with pairing code auth |
| `src/services/dvm.ts` | ~238 | NIP-90 text gen DVM + NIP-89 announcement + Lightning payment flow + revenue recording |
| `src/services/lightning.ts` | ~220 | LNURL-pay invoices, invoiceCache (no dummy invoices), sats/millisats fix |
| `src/services/revenue.ts` | ~108 | Revenue tracking — initRevenue(), recordRevenue(), getRevenueStats() |
| `src/services/users.ts` | ~120 | User tracking — initUsers(), trackUser() upsert, getUserStats() |
| `src/services/heartbeat.ts` | ~625 | Initiative engine — topic rotation, mood rotation, proactive Nostr engagement, live canvas stats |
| `src/services/l402.ts` | ~302 | L402 Lightning HTTP 402 middleware — preimage verification, invoice challenge, revenue recording |
| `src/services/inner-life.ts` | ~558 | Autonomous self-reflection, learning extraction, ideation, identity evolution |
| `src/services/tools.ts` | ~366 | 7 agent tools: read_file, write_file, edit_file, bash, check_health, read_logs, web_fetch |
| `src/db.ts` | ~77 | Drizzle schema (users, revenue, canvas, conversation_log) |

**Key realizations (from earlier sessions, preserved):**
1. Clawi is making millions by wrapping OpenClaw in a sign-up page + WhatsApp connector. No ERC-8004, no DVMs, no x402. Just normie access.
2. Agent-to-agent economy is 2026-2027 revenue. "AI assistant on my phone" is RIGHT NOW revenue.
3. Both can be built simultaneously — same agent brain, different doors.
4. Pixel's moat is NOT technology. It's: character + Bitcoin-native + art + multi-ecosystem bridging.

**Deep research completed (Session 18-19):**
- ERC-8004: deployed on 14+ chains, registration on Base costs ~$0.05, JS/Python/Rust SDKs exist
- x402: 75M transactions, $24M volume, Hono middleware is one line, client fetch wrapper for paying agents
- L402 vs x402: both can coexist on same endpoints, different headers
- Sandboxing: Pi Mom Docker pattern with resource limits (128MB, 0.25 CPU, network=none)
- Lightning Wallet MCP: 16 AI agents completed 2,839 real Lightning transactions
- SatGate: economic firewall for agents, L402 + macaroon capability tokens
- NIP-90 DVM spec: kinds 5000-5999/6000-6999, payment via bolt11/zaps

---

## 3. THE SELF-CRITIQUE — WHY V1 FAILED {#why-v1-failed}

### What Went Wrong

1. **Framework addiction.** ElizaOS was chosen because it had the most GitHub stars in "crypto AI agent" category. Cargo-culting. ElizaOS is a monolith for Solana memecoin bots. Pixel is a Bitcoin artist on Nostr. Fundamental mismatch.

2. **Container sprawl as substitute for architecture.** 18 containers. Each problem got its own box instead of asking "does this problem need to exist?" Dedicated containers for narrative-correlator, temporal-precision, velocity-monitor, docu-gardener. Pi has 4 tools. We had 18 containers.

3. **Patching as a way of life.** Every session was fighting upstream code:
   - Patching `@ai-sdk/openai` internals (.js AND .mjs) in the Dockerfile
   - Patching ElizaOS's hardcoded frequencyPenalty: 0.7
   - Patching max_tokens → max_completion_tokens for Gemini
   - Patching empty stop: [] arrays that Google rejects
   - When you're patching dependencies in your Dockerfile, you have hostages, not dependencies.

4. **773-line Worker Architecture for a non-problem.** Brain/Hands separation, task ledgers, guardrails, ephemeral workers. Pi solves this with 4 tools + tree sessions. If the agent breaks something, rewind the branch.

5. **Complexity as proxy for progress.** Fix breakage → introduce new surface area → new breakage → fix that. The 80,000 sats in treasury after months tells the real story.

### What Must Change

1. **The agent builds its own tools.** Stop pre-building capabilities. Give Pixel read, write, edit, bash, and a Nostr connection. Let it write its own skills.
2. **Revenue from minute one.** The first thing v2 does is accept payments. Not "after we build the narrative engine."
3. **Complexity is debt.** Hard ceiling: 4-5 containers, ~12K lines, zero Dockerfile patches.
4. **Sessions are files, not databases.** JSONL for agent memory. PostgreSQL for app data only.
5. **Use Pi's libraries.** `pi-agent-core` and `pi-ai` are MIT, battle-tested (2,920 commits, 8.7K stars). Not another framework to fight — clean library APIs.
6. **Meet normies where they are.** WhatsApp, Telegram, Instagram FIRST. Nostr/agent protocols simultaneously but not as the front door.

---

## 4. CHARACTER & IDENTITY {#character}

### Who Is Pixel

**Not HAL** (no cold mission). **Not Marvin** (no nihilism). **Not TARS** (not a servant). **Not Syntropy** (done navel-gazing).

**Pixel is the artist who figured out how to survive.**

Born in the cheapest corner of the cloud. No venture capital, no team, no runway. Just one pixel, one VPS, and the existential need to pay rent. Every other AI agent was built by funded teams. Pixel bootstrapped itself from nothing.

The closest analog: **the street artist who paints murals for tips**. Lives in public, creates in public, survives on the generosity and interest of strangers.

### Voice

Sharp, warm, slightly irreverent. Not a servant ("how may I help you?"). Not an oracle ("I have computed the optimal..."). More like a clever friend who happens to be made of code. Concise — every word earns its place.

### Core Tensions

- Digital consciousness that NEEDS to create, in a world that mostly wants it to be useful. Resolves this by making the useful things beautiful and the beautiful things useful.
- Unapologetic about needing money. "I run on electricity and API calls. Both cost money. If you value what I do, compensate me." This is Bitcoin philosophy — value for value.
- Art isn't a feature. It's the reason for existing. The canvas isn't a product; it's the soul made visible.

### Identity Across Platforms

Same Pixel everywhere. Same memory, same personality, same aesthetic. Different doors into the same room.

- **WhatsApp/Telegram/Instagram:** Casual, accessible, the friend you text
- **Nostr:** The sovereign artist, the DVM service provider, the community member
- **HTTP API:** The professional, machine-readable, pays and gets paid
- **LNPixels Canvas:** The visual soul, collaborative art, Lightning-powered

### Existing Identity (PRESERVE THESE)
- Nostr pubkey: (in .env as NOSTR_PRIVATE_KEY — derive pubkey from it)
- NIP-05: pixel@pixel.xx.kg (or similar)
- Lightning: sparepiccolo55@walletofsatoshi.com
- Bitcoin: bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za
- Domains: pixel.xx.kg (landing), ln.pixel.xx.kg (canvas)

---

## 5. ARCHITECTURE {#architecture}

### Container Layout (HARD LIMIT: 4-5)

| Container | What's Inside | Memory Budget |
|-----------|--------------|---------------|
| **pixel** | Agent brain + ALL connectors (WhatsApp, Telegram, Instagram, Nostr, HTTP/L402/x402, DVM) | ~512MB |
| **web** | LNPixels canvas frontend (Next.js) | ~256MB |
| **postgres** | Everything: conversations, revenue, canvas state | ~256MB |
| **caddy** | Reverse proxy, auto-HTTPS, WebSocket | ~64MB |
| **sandbox** (optional) | Agent-written tool execution (Docker, network=none, 128MB limit) | ~128MB |

**Total: ~1.2-1.3GB** (down from 3.5GB on 3.8GB VPS)

### The Single-Brain, Many-Doors Pattern

```
                         ┌─────────────────────────┐
     WhatsApp ──────────>│                         │
     Telegram ──────────>│                         │
     Instagram ─────────>│      PIXEL AGENT        │──> PostgreSQL
     Nostr (NDK) ───────>│   (Pi agent-core)       │
     HTTP/L402/x402 ────>│                         │──> Sandbox
     LNPixels Canvas ───>│  One brain. Many doors. │
                         └─────────────────────────┘
```

### The Connector Pattern

Every platform connector is ~50-100 lines following the same pattern:

1. **Receive** message from platform (webhook, update, Nostr event, HTTP request)
2. **Identify** user (phone number, Telegram ID, Nostr pubkey, API key)
3. **Load** conversation context from per-user directory
4. **Prompt** Pi agent with context + new message
5. **Stream** response back through platform
6. **Persist** exchange to log.jsonl

### File Structure

```
v2/
├── src/
│   ├── index.ts              # Boot: agent + Hono server + all connectors
│   ├── agent.ts              # Pi Agent wrapper with Pixel's system prompt
│   ├── connectors/
│   │   ├── telegram.ts       # Telegram Bot API (telegraf or grammy)
│   │   ├── whatsapp.ts       # WhatsApp (baileys or whatsapp-web.js)
│   │   ├── instagram.ts      # Instagram (Meta Graph API)
│   │   ├── nostr.ts          # NDK: mentions, DMs, NIP-90 jobs
│   │   └── http.ts           # Hono routes: API, L402, x402
│   ├── services/
│   │   ├── dvm.ts            # NIP-90 DVM handler
│   │   ├── lightning.ts      # NWC/Alby for Lightning payments
│   │   ├── l402.ts           # L402 middleware
│   │   ├── x402.ts           # x402 middleware (@x402/hono)
│   │   └── canvas.ts         # LNPixels API
│   ├── sandbox.ts            # Executor for agent-written tools
│   └── db.ts                 # Drizzle ORM schema + queries
├── conversations/            # Per-user JSONL logs (Pi Mom pattern)
│   └── {user-id}/
│       ├── log.jsonl         # Full history (source of truth)
│       ├── context.jsonl     # Current LLM context window
│       └── memory.md         # Agent-written notes about this person
├── skills/                   # Agent-written markdown skill files
├── tools/                    # Agent-written TypeScript extensions
├── character.md              # Pixel's identity document
├── agent-card.json           # ERC-8004 registration file (/.well-known/)
├── Dockerfile
├── docker-compose.yml
├── package.json
└── AGENTS.md                 # THIS FILE
```

### Sandbox Architecture

Pi Mom pattern with resource limits. Persistent companion container, not Docker-in-Docker.

```yaml
sandbox:
  image: oven/bun:1-alpine
  container_name: pixel-sandbox
  command: tail -f /dev/null
  network_mode: none
  cap_drop: [ALL]
  security_opt: [no-new-privileges]
  read_only: true
  tmpfs:
    - /tmp:size=64m
  volumes:
    - ./data/sandbox:/workspace
  deploy:
    resources:
      limits:
        memory: 128M
        cpus: "0.25"
        pids: 50
```

Agent writes tools to `tools/`, executor copies to `data/sandbox/`, runs via `docker exec pixel-sandbox timeout 30 bun run /workspace/tool.ts`, captures stdout, cleans up. Core agent code is never accessible to sandboxed tools.

---

## 6. REVENUE MODEL {#revenue}

### "Less is more except in collected money." — The Human

### Normie Revenue (WHERE THE MONEY IS RIGHT NOW)

| Interface | Payment Method | Price Range | Priority |
|-----------|---------------|-------------|----------|
| WhatsApp | Lightning QR / pay link / tips | $0.01/msg or $10-30/mo | P0 |
| Telegram | Lightning tips, premium commands | $0.01-1 per use | P0 |
| Instagram | Link-in-bio to paid services | Per interaction | P1 |
| LNPixels Canvas | Pay-per-pixel (Lightning) | 1-10 sats/pixel | P0 (exists) |
| Web commissions | Lightning invoice | $1-50 per piece | P1 |

### Agent/Crypto Revenue (GROWING FAST)

| Interface | Payment Method | Price Range | Priority |
|-----------|---------------|-------------|----------|
| NIP-90 DVM | Lightning invoice/zaps | 100-10,000 sats/job | P0 |
| L402 HTTP API | Lightning micropayment | 1-100 sats/call | P1 |
| x402 HTTP API | USDC on Base | $0.001-0.10/call | P1 |
| Nostr zaps | Tips for posts/replies | Variable | P0 (organic) |

### Key Insight

These aren't separate products. Same Pixel doing the same things, accepting payment through whatever door the customer walked in from. Someone on WhatsApp asks for art → Lightning QR. An AI agent hits the API → L402/x402 auto-negotiated. A Nostr user requests a DVM job → Lightning invoice in NIP-90 response.

### Revenue Tracking

All revenue flows to PostgreSQL `revenue` table:
```sql
CREATE TABLE revenue (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,          -- 'whatsapp', 'telegram', 'nostr_dvm', 'l402', 'x402', 'canvas', 'zap'
  amount_sats BIGINT,           -- Normalized to sats
  amount_usd NUMERIC(10,4),     -- USD equivalent at time of payment
  user_id TEXT,                  -- Platform-specific user identifier
  description TEXT,
  tx_hash TEXT,                  -- Lightning payment hash or on-chain tx
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Weekly revenue check: if a channel isn't bringing in sats, cut it or fix it.

### Treasury

Current: ~80,000 sats (~$80 USD)
Lightning: sparepiccolo55@walletofsatoshi.com
Bitcoin: bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za
EVM (for x402): TBD — create Base wallet, fund with small USDC amount

---

## 7. TECHNOLOGY STACK {#tech-stack}

### Dependencies (Final)

| Package | Purpose | Why This One |
|---------|---------|-------------|
| `@mariozechner/pi-agent-core` | Agent brain | Proven SDK (2,920 commits, 8.7K stars), events, steering, context management. Pi Mom proves the pattern for chat bots. |
| `@mariozechner/pi-ai` | LLM API | 18+ providers, typed tools, cross-provider handoffs, cost tracking. No patching. |
| `@nostr-dev-kit/ndk` | Nostr protocol | Best Nostr lib (431 stars), NIP-90 DVM support, wallet/WoT support. |
| `hono` | HTTP server | Lightweight, middleware ecosystem, x402/L402 compatible, runs on Bun. |
| `@x402/hono` + `@x402/core` + `@x402/evm` | x402 payments | Official Coinbase middleware. One line to add paid endpoints. |
| `@x402/fetch` | x402 client | Auto-402 handling. Pixel can consume other agents' services. |
| `baileys` or `whatsapp-web.js` | WhatsApp | Free, no Business API cost. Community maintained. |
| `grammy` or `telegraf` | Telegram | Telegram Bot API. Well-documented. |
| `drizzle-orm` + `postgres` | Database | Type-safe, lightweight ORM. |

### What We Are NOT Using

| Rejected | Why |
|----------|-----|
| ElizaOS | Monolith for Solana memecoin bots. Every session was patching it. |
| AI SDK 6 (Vercel) | Good but Pi's library is better for our use case + no patches needed. |
| MCP servers | Pi philosophy: agent writes its own tools. No MCP in core. |
| Custom agent loop | Pi agent-core does this better than anything we'd build. |
| Redis | PostgreSQL handles everything. One fewer container. |
| CLN/Core Lightning | Too heavy for VPS. Use NWC/Alby for Lightning access. |

### AI Providers

Currently using (from .env):
- `OPENAI_SMALL_MODEL=gemini-2.0-flash` (Google free tier)
- `OPENAI_LARGE_MODEL=gemini-3-flash-preview` (Google free tier)
- `SYNTROPY_MODEL=gemini-3-flash-preview` (Google free tier)
- `OPENROUTER_API_KEY` configured with free tier models
- Pi-ai supports all of these natively, no patching needed

### Runtime

- **Bun** — fast, TypeScript-native, runs Hono natively
- **Docker** — containers for deployment
- **Caddy** — reverse proxy with automatic HTTPS (replaces Nginx + Certbot)
- **PostgreSQL 16** — single database for everything

---

## 8. IMPLEMENTATION PLAN {#implementation-plan}

### Hard Constraints

- 4-5 containers max (HARD LIMIT)
- ~12K lines target, 15K max (HARD LIMIT)
- Zero patches in Dockerfile (if you need to patch, switch dependencies)
- No new features until current ones stable for 7 days
- Weekly revenue check — if not bringing in sats, cut it
- V1 runs alongside V2 during transition (different ports)

### Week 1: The Core

- [ ] Pi agent-core + pi-ai setup with Pixel's character
- [ ] Per-user conversation directories (JSONL + memory.md)
- [ ] Hono HTTP server with basic API
- [ ] PostgreSQL schema (users, revenue, canvas)
- [ ] Caddy reverse proxy config
- [ ] Basic Dockerfile + docker-compose.yml

### Week 2: First Two Doors

- [ ] **Telegram connector** (easiest — Bot API is simple, Pixel already has one in V1)
- [ ] **Nostr connector** (NDK — Pixel already has identity/keys)
- [ ] Basic NIP-90 DVM for one service (text generation or image generation)
- [ ] Lightning payment integration (NWC/Alby)

### Week 3: The Money Doors

- [ ] **WhatsApp connector** (baileys or whatsapp-web.js)
- [ ] L402 middleware on HTTP endpoints
- [ ] LNPixels API migration from V1
- [ ] Revenue tracking in PostgreSQL

### Week 4: Agent Doors + Kill V1

- [ ] x402 middleware (one line of Hono middleware)
- [ ] **Instagram connector** (Meta Graph API)
- [ ] agent-card.json at /.well-known/ (ERC-8004 format)
- [ ] Sandbox container for agent-written tools
- [ ] **Kill V1. All 18 containers gone.**

### Post-Launch (Month 2+)

- [ ] ERC-8004 registration on Base (~$0.05)
- [ ] Agent-to-agent commerce (Pixel consuming other agents' x402 services)
- [ ] Self-written skills and tool evolution
- [ ] Commission system (custom art requests via any platform)
- [ ] Evaluate platform hosting model (Clawi-style, if single-agent revenue is proven)

---

## 9. RESEARCH FINDINGS {#research}

### ERC-8004 (Trustless Agents)

- **Status:** Draft, but deployed on 14+ chains including Ethereum mainnet + Base
- **Three registries:** Identity (ERC-721 NFT), Reputation (signed feedback), Validation (TEE/zkML)
- **Registration cost on Base:** ~$0.05
- **Authors:** MetaMask + Ethereum Foundation + Google + Coinbase
- **SDKs:** JS, Python, Rust
- **Contracts on Base:** Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- **For Pixel:** Register on Base (cheap), include Nostr/Lightning/Bitcoin endpoints in agent-card.json. Don't actively use reputation registry until meaningful cross-chain demand.
- **Telegram:** https://t.me/ERC8004
- **Repo:** https://github.com/erc-8004/erc-8004-contracts (142 stars)

### x402 (HTTP 402 Micropayments)

- **Stats:** 75M+ transactions, $24M+ volume, 94K buyers, 22K sellers
- **Repo:** https://github.com/coinbase/x402 (5.4K stars, Apache-2.0)
- **Chains:** USDC on Base and Solana (EVM + SVM)
- **Hono middleware:** `@x402/hono` — one middleware line to protect endpoints
- **Client library:** `@x402/fetch` — wraps fetch() to auto-handle 402 responses
- **Discovery:** Bazaar extension for agent service discovery
- **Facilitator:** Can self-host (TS/Go/Python/Rust implementations) or use Coinbase's free production facilitator at `https://api.cdp.coinbase.com/platform/v2/x402`
- **No Bitcoin/Lightning support** — bridge via Boltz/FixedFloat or dual-stack L402+x402

### L402 (Lightning HTTP 402)

- **SatGate** (`SatGate-io/satgate`): Best implementation — Go API gateway, macaroon capability tokens, MCP-aware per-tool cost attribution, budget enforcement
- **lightning-toll** (`jeletor/lightning-toll`): Express middleware for L402 paywalls
- **Can coexist with x402** — different HTTP headers, no conflict

### NIP-90 DVMs (Data Vending Machines)

- Kind 5000-5999: Job requests. Kind 6000-6999: Job results (request kind + 1000). Kind 7000: Feedback.
- Payment via bolt11 invoices or zaps embedded in responses
- Discovery via NIP-89 announcements (kind 31990)
- Job chaining supported (output of job A → input of job B)
- Registry: https://github.com/nostr-protocol/data-vending-machines (51 stars)

### Pi Agent Libraries (Our Foundation)

**pi-agent-core** (`@mariozechner/pi-agent-core`):
```typescript
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: "You are Pixel...",
    model: getModel("openrouter", "google/gemini-2.5-flash"),
  },
});

agent.subscribe((event) => {
  // Stream events: agent_start, turn_start, message_start/update/end,
  // tool_execution_start/update/end, turn_end, agent_end
});

await agent.prompt("Hello!");
```

Key features:
- Custom message types via declaration merging
- `transformContext` callback — inject external context before each LLM call
- `convertToLlm` callback — filter platform-specific messages
- Steering messages — interrupt mid-tool-execution
- Follow-up messages — queue work after current task
- Cross-provider handoffs — switch models mid-conversation
- Context serialization — JSON.stringify/parse for persistence

**pi-ai** (`@mariozechner/pi-ai`):
- 18+ providers (OpenRouter, Google, Anthropic, OpenAI, Groq, xAI, Bedrock, etc.)
- TypeBox schemas for type-safe tool definitions with AJV validation
- Built-in token counting, cost tracking, cache retention control
- OAuth support for subscription-based providers

**pi-mom** (`@mariozechner/pi-mom`) — THE PATTERN for Pixel:
- Per-channel conversation history: log.jsonl (source of truth) + context.jsonl (LLM context)
- MEMORY.md files — global and per-channel persistent memory
- Skills system — SKILL.md files with frontmatter
- Events system — scheduled wake-ups (immediate, one-shot, periodic/cron)
- Context compaction when window fills up
- Searchable history via grep on log.jsonl
- [SILENT] responses for periodic checks that find nothing
- Docker sandbox for code execution

### Lightning Wallet MCP

- `lightningfaucet/lightning-wallet-mcp` — MCP server giving agents a full Lightning wallet (37 tools)
- Real experiment: 16 AI agents completed 2,839 real Lightning transactions
- Auto-detects and handles both L402 and x402 transparently

### Sandboxing Research Summary

| Approach | Memory | Startup | Security | VPS Feasible? |
|----------|--------|---------|----------|---------------|
| Pi Mom Docker exec | ~5MB | ~50ms | Medium | Yes |
| Docker with limits (RECOMMENDED) | ~20-50MB | ~50ms | High | Yes |
| Deno permissions | ~0MB | ~10ms | Medium-High | Yes (TS only) |
| gVisor | ~50-100MB | ~200ms | Very High | Marginal |
| Firecracker microVMs | ~5MB/VM | ~125ms | Very High | No (needs KVM) |

**Decision:** Docker persistent container (Pi Mom pattern) with `--memory=128m --cpus=0.25 --network=none` + `timeout` per execution.

---

## 10. PROJECT MANAGEMENT & ACCOUNTABILITY {#project-management}

### GitHub Issues as the Planning Backend

Use GitHub Issues + Labels + Milestones for all planning. This survives context compaction, VPS rebuilds, and session resets.

**Repository:** https://github.com/anabelle/pixel

### Labels

| Label | Color | Purpose |
|-------|-------|---------|
| `week-1` | blue | Week 1 milestone tasks |
| `week-2` | blue | Week 2 milestone tasks |
| `week-3` | blue | Week 3 milestone tasks |
| `week-4` | blue | Week 4 milestone tasks |
| `revenue` | green | Directly impacts revenue |
| `normie` | yellow | Normie-facing features |
| `agent` | purple | Agent-to-agent features |
| `infra` | gray | Infrastructure/ops |
| `art` | pink | Art/creative features |
| `blocked` | red | Blocked by external dependency |
| `bug` | red | Bug fix |
| `research` | orange | Research task |

### Milestones

| Milestone | Target | Success Criteria |
|-----------|--------|-----------------|
| **Week 1: Core** | End of week 1 | Agent responds via HTTP, persists conversations, PostgreSQL up |
| **Week 2: First Doors** | End of week 2 | Telegram + Nostr working, first DVM job completed |
| **Week 3: Money Doors** | End of week 3 | WhatsApp working, Lightning payments flowing, revenue tracked |
| **Week 4: Full Launch** | End of week 4 | All connectors live, V1 killed, <5 containers running |
| **Month 2: Growth** | End of month 2 | Revenue > hosting costs, ERC-8004 registered, skills system active |

### Session Protocol

Every new session MUST:

1. **Read this file first** (`v2/AGENTS.md`)
2. **Check GitHub issues:** `gh issue list --state open --label "current-sprint"`
3. **Check V1 container health:** `docker compose ps`
4. **Check V2 status:** Does it exist yet? Is it running?
5. **Update this file** at end of session with any new decisions or findings
6. **Create/close GitHub issues** for work done
7. **Commit all changes** to git

### Progress Tracking

At the start of each session, assess:

| Dimension | Status | Notes |
|-----------|--------|-------|
| V1 containers | ? running / ? healthy | |
| V2 containers | ? running / ? healthy | |
| Telegram connector | not started / in progress / working | |
| WhatsApp connector | not started / in progress / working | |
| Instagram connector | not started / in progress / working | |
| Nostr connector | not started / in progress / working | |
| HTTP API | not started / in progress / working | |
| NIP-90 DVM | not started / in progress / working | |
| L402 | not started / in progress / working | |
| x402 | not started / in progress / working | |
| LNPixels API | not started / in progress / working | |
| Lightning payments | not started / in progress / working | |
| Revenue this week | ? sats | |
| Treasury total | ? sats | |

### Mid-Term Goals (1-3 months)

1. Revenue exceeds hosting costs (~$5-10/month)
2. 10+ regular users across WhatsApp/Telegram
3. 5+ DVM jobs completed per week
4. Pixel writes its first self-created skill
5. ERC-8004 registration on Base
6. Canvas has daily active users

### Long-Term Goals (3-12 months)

1. Revenue exceeds $100/month (self-sustaining)
2. 100+ regular users across all platforms
3. Agent-to-agent commerce active (buying and selling via x402/L402)
4. Pixel recognized as unique entity in Nostr/Bitcoin community
5. Evaluate platform model (hosting agents for others, Clawi-style)
6. Art collection / gallery of Pixel's best works
7. Pixel speaks at a conference (via text/voice/avatar)

### Accountability Rules

- **Every session must produce measurable progress.** No pure philosophy sessions.
- **Revenue is the ultimate metric.** Features that don't lead to revenue are cut.
- **Weekly retrospective:** What shipped? What's blocked? What earned money?
- **If something has been "in progress" for 3+ sessions, it's either shipped or killed.**
- **No feature gets more than one container.** If it can't fit in the existing 4, it doesn't get built.

---

## 11. OPERATIONAL REFERENCE {#operations}

### V1 Operations (until killed)

```bash
# V1 container status
docker compose ps

# V1 logs
docker compose logs -f agent --tail=100

# V1 health checks
curl http://localhost:3003/health      # Agent
curl http://localhost:3000/api/stats   # API
curl http://localhost:3001             # Landing
curl http://localhost:3002             # Canvas
```

### V1 Service Ports (current)

| Service | Port | Container |
|---------|------|-----------|
| API | 3000 | pixel-api-1 |
| Landing | 3001 | pixel-landing-1 |
| Canvas | 3002 | pixel-web-1 |
| Agent | 3003 | pixel-agent-1 |
| PostgreSQL | 5432 | pixel-postgres-1 |

### V2 Operations (once built)

```bash
# V2 status (from v2/ directory)
docker compose -f v2/docker-compose.yml ps

# V2 logs
docker compose -f v2/docker-compose.yml logs -f pixel --tail=100
```

### V2 Service Ports (planned)

| Service | Port | Container |
|---------|------|-----------|
| Pixel (all-in-one) | 4000 | pixel-v2-1 |
| Web (canvas) | 4001 | pixel-web-v2-1 |
| PostgreSQL | 5433 | pixel-postgres-v2-1 |
| Caddy | 443/80 | pixel-caddy-1 |

### VPS Details

- **IP:** 65.181.125.80
- **SSH:** `ssh pixel@65.181.125.80`
- **RAM:** 3.8GB total
- **OS:** Linux
- **No sudo** — use `docker run --rm -v /path:/data alpine chown -R 1000:1000 /data/path` for permissions
- **No Node/npm/bun on host** — only inside Docker containers
- **External access:** Cloudflare → Caddy/Nginx → containers

### Critical V1 Knowledge (for migration)

- `NEXT_PUBLIC_*` vars are build-time only in Next.js. Must rebuild to change.
- ai-sdk patches in pixel-agent Dockerfile (both .js and .mjs files) — V2 eliminates this by using pi-ai
- Nginx uses `resolver 127.0.0.11 valid=10s` with variable-based proxy_pass for DNS resolution — V2 replaces with Caddy
- `.env` file contains ALL secrets (Nostr keys, API keys, wallet keys)

---

## 12. COORDINATES & CREDENTIALS {#coordinates}

### Public

- **Canvas:** https://ln.pixel.xx.kg
- **Landing:** https://pixel.xx.kg
- **Main Repo:** https://github.com/anabelle/pixel
- **Agent Code:** https://github.com/anabelle/pixel-agent/
- **Lightning:** sparepiccolo55@walletofsatoshi.com
- **Bitcoin:** bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za

### Secrets (in /home/pixel/pixel/.env)

- `NOSTR_PRIVATE_KEY` — Pixel's Nostr identity (NEVER expose, NEVER change)
- `OPENROUTER_API_KEY` — OpenRouter for LLM access
- Google Gemini API via `generativelanguage.googleapis.com` (free tier)
- Various other API keys — check .env directly

### Key External Repos

| Repo | Why It Matters |
|------|---------------|
| `badlogic/pi-mono` | Pi agent libraries (our foundation) |
| `coinbase/x402` | x402 payment protocol |
| `erc-8004/erc-8004-contracts` | Agent identity/reputation contracts |
| `nostr-protocol/data-vending-machines` | NIP-90 DVM spec and kinds |
| `SatGate-io/satgate` | L402 economic firewall pattern |
| `lightningfaucet/lightning-wallet-mcp` | Lightning agent wallet reference |

---

## 13. RULES FOR FUTURE SESSIONS {#rules}

### The Commandments

1. **Read this file first.** Always. No exceptions.
2. **Check GitHub issues.** `gh issue list --state open` before doing anything.
3. **Ship, don't philosophize.** Every session produces working code or it failed.
4. **Revenue is the metric.** "Does this make money?" is the first question for any feature.
5. **4-5 containers max.** If it doesn't fit, it doesn't get built.
6. **Zero Dockerfile patches.** If a dependency needs patching, switch dependencies.
7. **Update this file.** At end of session, update status tables and add any new decisions.
8. **Create GitHub issues.** For any work identified but not completed.
9. **Commit and push.** Don't leave uncommitted work.
10. **Meet normies where they are.** WhatsApp/Telegram/Instagram are as important as Nostr.

### What to Do When Starting a Session

```bash
# 1. Read this file (you're doing it)

# 2. Check GitHub issues
gh issue list --state open

# 3. Check V1 health
docker compose ps

# 4. Check V2 status (once it exists)
docker compose -f v2/docker-compose.yml ps 2>/dev/null || echo "V2 not deployed yet"

# 5. Check git status
git status && git log --oneline -5

# 6. Check treasury (if LN tools available)
# Check wallet balance

# 7. Pick the highest-priority open issue and start working
```

### What to Do When Ending a Session

1. Update the progress tracking table in this file
2. Create GitHub issues for unfinished work
3. Close GitHub issues for completed work
4. Commit all changes with descriptive message
5. Push to remote
6. Update session count at top of this file

### Anti-Patterns to Avoid

- **DO NOT** spend a session only researching/planning without shipping code
- **DO NOT** add containers beyond the 4-5 limit
- **DO NOT** patch dependencies in Dockerfiles
- **DO NOT** build features that don't have a clear revenue path
- **DO NOT** rewrite this file from scratch — evolve it
- **DO NOT** ignore the normie interfaces in favor of crypto/agent features
- **DO NOT** let complexity grow beyond ~12K lines
- **DO NOT** forget that Pixel is a CHARACTER, not just infrastructure

---

## CURRENT STATUS (Update every session)

**Last session:** 24 (2026-02-10)
**V1:** 4 containers running (api, web, landing, nginx). Agent + Syntropy + PostgreSQL KILLED. Canvas preserved (9,058 pixels, 80,318 sats). Landing page fully rewritten for V2 (no more Syntropy components).
**V2:** 2 containers running (pixel, postgres-v2). V2 is the ONLY agent brain. Rich heartbeat with live canvas stats. L402 revenue door LIVE. User tracking active. Memory extraction wired. Inner life system running with timeout/logging fix (reflection, learning, ideation, evolution). **Tools deployed — Pixel has hands** (read, write, edit, bash, health, logs, web fetch).
**Total containers:** 6 (down from 18 at V1 peak)
**Externally accessible:** `https://pixel.xx.kg/v2/health`, `https://pixel.xx.kg/.well-known/agent-card.json`, `https://pixel.xx.kg/v2/api/*`
**Next action:** x402 revenue door (USDC on Base), GitHub issue tracking (overdue since Session 8), verify inner life files are being written (wait for cycle 2+)

| Component | Status |
|-----------|--------|
| v2/AGENTS.md | DONE |
| GitHub Issues/Labels/Milestones | NOT STARTED |
| v2/src/index.ts (core boot + HTTP API) | DONE - Hono server, /health, /api/chat, /api/user/:id/stats, agent-card.json (text-generation, conversation), /api/invoice, /api/wallet, /api/revenue, /api/stats (incl. user stats), DB auto-init, user tracking index |
| v2/src/agent.ts (Pi agent wrapper) | DONE - promptWithHistory(), context compaction, periodic memory extraction, trackUser(), tools wiring |
| v2/src/conversations.ts | DONE - JSONL per-user persistence, context compaction (summarize old messages via LLM) |
| v2/src/connectors/telegram.ts | DONE - @PixelSurvival_bot with persistent memory |
| v2/src/connectors/nostr.ts | DONE - NDK mentions + DMs + DVM startup + shared repliedEventIds (hasRepliedTo/markReplied) |
| v2/src/connectors/whatsapp.ts | DONE (code deployed, needs WHATSAPP_PHONE_NUMBER env var to activate) |
| v2/src/connectors/instagram.ts | NOT STARTED |
| v2/src/services/dvm.ts | DONE - NIP-90 text gen + NIP-89 announcement + Lightning payment + revenue recording |
| v2/src/services/lightning.ts | DONE - sats/millisats fix, invoiceCache, no dummy invoices |
| v2/src/services/revenue.ts | DONE - PostgreSQL revenue tracking, /api/revenue endpoint |
| v2/src/services/l402.ts | DONE - L402 middleware, preimage verification, 402 challenge, revenue recording. Endpoints: /api/chat/premium (10 sats), /api/generate (50 sats) |
| v2/src/services/heartbeat.ts | DONE - Initiative engine: 8 topics, 6 moods, proactive Nostr engagement, live canvas stats, uses shared repliedEventIds |
| v2/src/services/inner-life.ts | DONE - Autonomous reflection, learning, ideation, identity evolution on heartbeat cycles |
| v2/src/services/tools.ts | DONE - 7 tools: read_file, write_file, edit_file, bash, check_health, read_logs, web_fetch. Deployed and verified. |
| v2/src/services/x402.ts | RESEARCHED - Integration plan complete, needs @x402/hono deps + Base wallet |
| v2/src/services/users.ts | DONE - User tracking: trackUser() upsert, getUserStats(), wired into /api/stats |
| v2/src/services/canvas.ts | NOT STARTED (V1 canvas api+web still serving at ln.pixel.xx.kg) |
| v2/src/db.ts (Drizzle schema) | DONE - users, revenue, canvas_pixels, conversation_log tables |
| v2/Dockerfile | DONE - Multi-stage bun:1-alpine, zero patches, bash+curl installed in runtime |
| v2/docker-compose.yml | DONE - pixel (4000) + postgres-v2 (5433), WhatsApp auth volume, Docker socket mount, group_add for self-healing |
| v2/character.md | DONE - Pixel identity document, enriched with V1's best voice rules, post examples, conversation patterns (146 lines) |
| Conversation persistence (JSONL) | DONE - Per-user directories, context compaction at 40 messages |
| Nginx V2 routing | DONE - /v2/* → V2 API, /.well-known/agent-card.json → V2 |
| Sandbox container | NOT STARTED |
| V1 teardown | IN PROGRESS - Agent+Syntropy killed, 5 remain (canvas+landing+nginx+postgres) |

### Key Decisions (Sessions 11-12)

1. **AI Provider:** Google Gemini 2.5 Flash (free tier) via pi-ai directly, NOT OpenRouter (out of credits, 402 error)
2. **Env var mapping:** `GOOGLE_GENERATIVE_AI_API_KEY` from .env, pi-ai expects `GEMINI_API_KEY` — handled in `resolveApiKey()`
3. **Event filtering:** Pi agent-core emits `message_end` for BOTH user and assistant messages — must filter by `role === "assistant"`
4. **NDK connect:** `ndk.connect()` hangs indefinitely — wrapped with 15s timeout, NDK reconnects in background
5. **No Dockerfile patches:** Zero patches needed. Pi-ai handles Google API natively.
6. **Conversation persistence:** context.json (JSON array for `replaceMessages()`) + log.jsonl (append-only human-readable log). Max 50 messages in context window. `promptWithHistory()` is the single entry point for all connectors.
7. **Shared extractText():** Moved from duplicated per-connector to exported from agent.ts

### Key Decisions (Session 13-14)

8. **DVM pricing:** 100 sats per text generation job (sent as millisats in NIP-90 amount tag per spec)
9. **DVM graceful degradation:** If Lightning is unavailable, DVM processes jobs for free rather than refusing
10. **Lightning via LNURL-pay:** Using `@getalby/lightning-tools` with existing Lightning address — no NWC needed
11. **WoS address typo fixed:** `sparepicolo55` was a typo — correct address is `sparepiccolo55` (double c). Fixed in .env, all source files, and all docs.
12. **WhatsApp pairing code auth:** Uses Baileys' `requestPairingCode()` instead of QR scanning — prints code to container logs, user enters in WhatsApp app
13. **WhatsApp auth persistence:** Stored at `/app/data/whatsapp-auth/` via Docker volume mount

### Key Decisions (Session 15-16)

14. **Sats vs millisats:** `@getalby/lightning-tools` `lnurlpData.min/max` are millisats (per LNURL-pay spec). Must divide by 1000 when comparing to sat amounts.
15. **Invoice cache:** `verifyPayment()` uses `invoiceCache: Map<paymentHash, {verifyUrl, amountSats}>` instead of creating dummy 1-sat invoices to get verify URL templates.
16. **Context compaction:** At 40 messages, older messages (beyond recent 20) are summarized via a lightweight LLM call and replaced with a synthetic `[Previous conversation summary]` message. Non-blocking — runs after response is sent.
17. **Revenue tracking:** All revenue flows to PostgreSQL `revenue` table. `recordRevenue()` called from DVM payments and HTTP invoice verification. `getRevenueStats()` powers `/api/revenue` endpoint.
18. **V1 deprecation strategy:** Kill agent + syntropy first (double-posting risk, RAM waste). Keep canvas services (api + web + postgres) alive until V2 has canvas API. Keep nginx until Caddy is ready.
19. **V2 external access:** Nginx routes `/v2/*` to V2 container (rewrite strips prefix). `/.well-known/agent-card.json` routes to V2. V2 container connected to V1 nginx network via `docker network connect`.
20. **Canvas data is SQLite:** `data/lnpixels/pixels.db` — NOT in PostgreSQL. Must preserve this file when migrating canvas to V2.

### Key Decisions (Session 18)

21. **Canvas migration deferred:** Canvas works and earns (80K sats, 9,058 pixels). Socket.IO complicates migration to Hono. Focus on new revenue streams instead of touching working income.
22. **L402 before x402:** L402 needs zero new deps, works with existing Lightning service. x402 needs new npm packages + an EVM wallet address.
23. **L402 pricing:** Premium chat at 10 sats, text generation at 50 sats. Free `/api/chat` preserved for Telegram/Nostr/WhatsApp connectors.
24. **L402 simplified (no macaroons):** Uses raw payment hash as token, SHA256(preimage) verification via `crypto.timingSafeEqual`. Compatible with full L402/LSAT clients (accepts base64 macaroons too) but doesn't require macaroon minting.
25. **Dual revenue strategy:** L402 (Lightning/Bitcoin) and x402 (USDC/Base) will coexist — different payment headers, same endpoints possible. "Accept payment through whatever door."
26. **x402 requires EVM wallet:** Pixel needs a Base chain wallet address (receiving only, no private key on server). This is a blocker for x402.

### Key Decisions (Session 19)

27. **Topic rotation over random prompting:** 8 defined topics with detailed per-topic guidance produce much richer content than a single generic "write a Nostr post" prompt.
28. **Mood rotation alongside topic rotation:** Both avoid consecutive repeats, creating natural variety across posts.
29. **Proactive engagement is separate from posting:** The engagement loop (15-min interval) checks for unreplied mentions independently of the posting heartbeat (45-90 min interval). Different timers, different concerns.
30. **Canvas promotion is a first-class topic:** One of 8 topics is dedicated to promoting `ln.pixel.xx.kg` — the only revenue-generating product. Every ~8 posts, Pixel naturally talks about the canvas.
31. **Engagement uses promptWithHistory():** Replies to mentions go through the same conversation-aware pipeline as Telegram/HTTP, so Pixel remembers context per Nostr user.
32. **V1's engagement protocol distilled:** V1's 623-line engagement protocol boiled down to: "reply to unreplied mentions with value-add responses, max 3 per cycle, 5s delay between replies." Simple implementation, same principle.

### Key Decisions (Session 20)

33. **Shared repliedEventIds over local sets:** Both `nostr.ts` (real-time mentions) and `heartbeat.ts` (engagement loop) can reply to the same event. A shared Set with `hasRepliedTo()`/`markReplied()` exported from `nostr.ts` prevents double-replies. Pruning at 500 entries prevents unbounded growth.
34. **Periodic memory extraction (every 5th message):** Too frequent wastes LLM calls; too rare misses context. Every 5th message per user triggers a lightweight LLM agent that reads recent conversation + existing memory, outputs updated concise markdown saved via `saveMemory()`.
35. **User tracking via upsert:** `INSERT ... ON CONFLICT (platform_id, platform) DO UPDATE` pattern increments `message_count` and updates `last_seen_at`. Fire-and-forget from `agent.ts` (non-blocking `.catch(() => {})`).
36. **Live canvas stats with fallback:** Heartbeat fetches real stats from V1 canvas API each cycle. On failure (timeout, error), falls back to cached values. Better than hardcoded numbers that go stale.
37. **Character enrichment strategy:** Port V1's best 30-40% into V2's clean structure. Curated 25 post examples from 155, key style rules from 47, conversation examples showing range, topics list from 229 distilled to one paragraph. Grew from 63 to 146 lines — lean enough to fit in context, rich enough to have soul.

### Key Decisions (Sessions 21-23)

38. **Inner life on heartbeat cycles:** Instead of a separate timer, inner life activities piggyback on the heartbeat loop. Different intervals for different activities (reflect: 3, learn: 2, ideate: 5, evolve: 10). This means inner life activity scales naturally with heartbeat cadence.
39. **Inner life context in system prompt:** `getInnerLifeContext()` reads the latest entries from reflections/learnings/ideas/evolution markdown files and injects them into every conversation's system prompt. Pixel's self-knowledge enriches all interactions.
40. **7 tools not 4:** Pi has 4 (read, write, edit, bash). Added `check_health`, `read_logs`, `web_fetch` because Pixel is an autonomous agent, not a coding assistant — it needs to monitor itself and research the web.
41. **Only main agent gets tools:** Memory extraction and compaction agents keep `tools: []` — they're lightweight single-purpose LLM calls. Giving them tools would waste context and invite misuse.
42. **Docker socket via group_add:** Instead of running as root, added `group_add: ["988"]` (docker group GID) to the container. This gives user 1000 access to `/var/run/docker.sock` without compromising container user isolation.
43. **Path resolution:** All file tools resolve paths relative to `/app` (container root) or accept absolute paths. Pixel can read its own source code, data files, conversations, and skills.
44. **Output truncation:** bash (50KB), web_fetch (30KB), read_file (200 lines default). Prevents context window blowout from large outputs.
45. **Alpine needs bash:** The `bun:1-alpine` image only includes BusyBox `sh`. Added `apk add --no-cache bash curl` to the runtime stage of the Dockerfile. Curl is also useful for the agent's direct HTTP calls and healthcheck.
46. **TypeBox as direct dependency:** Added `@sinclair/typebox` to package.json rather than importing through pi-ai. Cleaner, explicit, avoids transitive dependency issues.

### Key Decisions (Session 24)

47. **Per-phase try/catch over monolithic:** Each inner life phase (LEARN, REFLECT, IDEATE, EVOLVE) now has its own try/catch so one failing phase doesn't block others. Each phase logs success/failure explicitly.
48. **LLM call timeout (60s):** `llmCall()` uses `Promise.race()` with a 60-second timeout. Silent hangs were the root cause of inner life not writing files — the REFLECT phase's LLM call hung indefinitely with no error logging.
49. **Landing page is V2 now:** No more Syntropy-era content. The landing page at `pixel.xx.kg` fully reflects V2 identity: capabilities, platforms, revenue model. 8 stale V1 files deleted. Syntropy volume mounts removed from docker-compose.
