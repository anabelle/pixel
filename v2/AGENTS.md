# PIXEL V2 — MASTER AGENT BRIEFING

> **Read this file FIRST in every session. Single source of truth.**
> Last updated: 2026-02-14 | Session: 40

---

## 1. CURRENT STATUS

**V1:** 4 containers (api, web, landing, nginx). Canvas preserved (9,225+ pixels, 81,971+ sats). Agent + Syntropy + PostgreSQL killed.
**V2:** 2 containers (pixel, postgres-v2). 40 tools. Primary model: Z.AI GLM-4.7 (Coding Lite, $84/yr to 2027-02-14). Background: GLM-4.5-air. Fallback: Gemini 3→2.5→2.0 Flash (Google free tier).
**Total containers:** 6 (down from 18 at V1 peak)
**Disk:** ~60% | **RAM:** ~2.7GB / 3.8GB
**Cron:** auto-update (hourly), host-health (daily 3:15am), mailbox-check (30 min)
**External:** `https://pixel.xx.kg/v2/health`, `https://pixel.xx.kg/.well-known/agent-card.json`, `https://pixel.xx.kg/v2/api/*`

| Component | Status |
|-----------|--------|
| Telegram (@PixelSurvival_bot) | ✅ Live — vision, voice, groups, notify_owner |
| Nostr (NDK) | ✅ Live — mentions, DMs, DVM, engagement |
| WhatsApp (Baileys) | ⚠️ Deployed, logged out (needs re-pairing) |
| Instagram | ❌ Not started |
| HTTP API + L402 | ✅ Live — /api/chat/premium (10 sats), /api/generate (50 sats) |
| x402 | 📋 Researched, needs @x402/hono + Base wallet |
| Skills system | ✅ 4 skills loaded (revenue, image-gen, resource, self-architecture) |
| Inner life | ✅ Running (reflect/learn/ideate/evolve on heartbeat cycles) |
| Outreach | ✅ 4h cycle, LLM-judged owner pings |
| Syntropy↔Pixel | ✅ Bidirectional (debrief + mailbox + cron monitor) |
| Autonomous dispatch | ✅ Headless Syntropy via cron |
| Canvas migration | ❌ Deferred (V1 canvas works, earns sats) |
| Sandbox container | ❌ Not started |

**Next action:** x402 revenue door, GitHub issue tracking

---

## 2. WHAT IS PIXEL

Pixel is a **living digital artist and AI assistant** across multiple platforms. Distinct personality, creates art, holds conversations, earns its own money through value-for-value exchanges.

**The one-liner:** "The street artist who learned to code. Lives on every platform, creates for anyone who asks, gets paid in whatever currency you've got."

**Pixel IS:** A character with opinions, art, and voice. Reachable on WhatsApp, Telegram, Instagram, Nostr, HTTP. Bitcoin-native (Lightning, USDC, zaps). Self-evolving — writes its own tools and skills.

**Pixel is NOT:** A generic chatbot. A SaaS product. A framework. An academic exercise.

---

## 3. ARCHITECTURE

### Container Layout (HARD LIMIT: 4-5 target, 6 current)

| Container | Purpose | Port |
|-----------|---------|------|
| **pixel** (V2) | Agent brain + ALL connectors | 4000 |
| **postgres-v2** | Conversations, revenue, users | 5433 |
| **pixel-api-1** (V1) | Canvas API | 3000 |
| **pixel-web-1** (V1) | Canvas frontend | 3002 |
| **pixel-landing-1** (V1) | Landing page | 3001 |
| **pixel-nginx-1** (V1) | Reverse proxy + SSL | 80/443 |

### Single-Brain, Many-Doors Pattern

```
WhatsApp/Telegram/Instagram/Nostr/HTTP/Canvas → PIXEL AGENT (Pi agent-core) → PostgreSQL
```

Every connector: receive → identify user → load context → prompt agent → stream response → persist.

### File Inventory (26 source files, ~13,713 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.ts` | ~948 | Boot, Hono HTTP, all API routes, DB init, user tracking, outreach startup, error handlers |
| `src/agent.ts` | ~1227 | Pi agent wrapper, promptWithHistory(), backgroundLlmCall(), sanitizeMessagesForContext(), skills loading, memory extraction, context compaction |
| `src/conversations.ts` | ~329 | JSONL persistence, context compaction, tool-boundary-aware trimming |
| `src/db.ts` | ~152 | Drizzle schema (users, revenue, canvas_pixels, conversation_log) |
| `src/connectors/telegram.ts` | ~816 | grammY bot — vision, groups, notify_owner, voice transcription, TTS |
| `src/connectors/nostr.ts` | ~392 | NDK mentions + DMs + DVM + shared repliedEventIds |
| `src/connectors/whatsapp.ts` | ~284 | Baileys bot, pairing code auth, voice transcription, TTS |
| `src/services/tools.ts` | ~2148 | 40 tools: filesystem, bash, web, git, ssh, wp, clawstr, alarms, chat, memory, notify_owner, syntropy_notify, introspect, health, logs |
| `src/services/heartbeat.ts` | ~2059 | Initiative engine — topics/moods, Nostr engagement, Clawstr, Primal discovery, zaps, follows, revenue-goal, live canvas stats. Has pixelTools. |
| `src/services/inner-life.ts` | ~1065 | Autonomous reflection, learning, ideation, identity evolution. Has pixelTools. |
| `src/services/memory.ts` | ~865 | Persistent memory — save/search/update/delete per user, vector-aware |
| `src/services/jobs.ts` | ~551 | Job system — scheduled tasks, ecosystem reports, idea garden, alarm-style wake-up |
| `src/services/outreach.ts` | ~410 | Proactive owner outreach — LLM-judged Telegram pings, cooldowns, dedup |
| `src/services/reminders.ts` | ~437 | Alarm/reminder system — schedule, list, cancel, modify |
| `src/services/l402.ts` | ~301 | L402 Lightning HTTP 402 middleware |
| `src/services/audit.ts` | ~257 | Structured JSONL audit trail |
| `src/services/cost-monitor.ts` | ~246 | LLM cost tracking and budget monitoring |
| `src/services/lightning.ts` | ~225 | LNURL-pay invoices, invoiceCache |
| `src/services/dvm.ts` | ~249 | NIP-90 text gen DVM + NIP-89 + Lightning payment + revenue |
| `src/services/digest.ts` | ~198 | Periodic digest generation for owner |
| `src/services/nostr-auth.ts` | ~169 | NIP-98 HTTP auth for dashboard |
| `src/services/revenue.ts` | ~141 | PostgreSQL revenue tracking |
| `src/services/primal.ts` | ~136 | Primal Cache API for trending Nostr posts |
| `src/services/audio.ts` | ~132 | Audio transcription via Gemini 2.0 Flash REST API |
| `src/services/clawstr.ts` | ~129 | Stacker News API (graceful skip if unconfigured) |
| `src/services/users.ts` | ~124 | User tracking — upsert, stats |
| `src/services/tts.ts` | ~80 | Edge TTS → ffmpeg → OGG/Opus, auto language detection |
| `src/services/vision.ts` | ~46 | Image URL extraction for multi-modal input |
| `src/services/logging.ts` | ~133 | Console interceptor → /app/data/agent.log |

---

## 4. TECHNOLOGY STACK

| Package | Purpose |
|---------|---------|
| `@mariozechner/pi-agent-core` | Agent brain (events, steering, follow-ups, context management) |
| `@mariozechner/pi-ai` | Unified LLM API (18+ providers, typed tools, cost tracking) |
| `@nostr-dev-kit/ndk` | Nostr protocol (mentions, DMs, NIP-90 DVMs) |
| `hono` | HTTP server (lightweight, middleware, runs on Bun) |
| `grammy` | Telegram Bot API |
| `baileys` | WhatsApp (free, no Business API cost) |
| `drizzle-orm` + `postgres` | Type-safe ORM |
| `node-edge-tts` | Free TTS (Microsoft Edge endpoint) |
| `@sinclair/typebox` | Tool schema definitions |

### AI Providers

⚠️ **Model names/pricing/availability change constantly. Research via API, not training data.**

- **Primary (conversations):** Z.AI GLM-4.7 via `https://api.z.ai/api/coding/paas/v4` (128K context, reasoning, ~4.5s)
- **Background (heartbeat/inner-life/jobs):** Z.AI GLM-4.5-air (no reasoning, ~1.3s)
- **Fallback chain:** Gemini 3 Flash → 2.5 Flash → 2.0 Flash (Google free tier)
- **Vision/Audio:** Google Gemini (Z.AI Coding Lite is text-only)
- Z.AI Coding Lite: $84/yr, valid to 2027-02-14. `AI_PROVIDER=zai`, `AI_MODEL=glm-4.7`
- Z.AI models constructed manually in `getPixelModel()` (not in pi-ai registry)
- `resolveApiKey("zai")` returns `ZAI_API_KEY` — implemented in agent.ts, outreach.ts, heartbeat.ts, jobs.ts, inner-life.ts

### Runtime

Bun (TypeScript-native) · Docker · Nginx (V1, Caddy planned) · PostgreSQL 16

---

## 5. REVENUE MODEL

Same Pixel, same brain, different payment doors:

| Interface | Payment | Price | Status |
|-----------|---------|-------|--------|
| LNPixels Canvas | Lightning pay-per-pixel | 1-10 sats/pixel | ✅ Live (81K+ sats) |
| NIP-90 DVM | Lightning invoice | 100 sats/job | ✅ Live |
| L402 HTTP API | Lightning micropayment | 10-50 sats/call | ✅ Live |
| x402 HTTP API | USDC on Base | $0.001-0.10/call | 📋 Researched |
| Nostr zaps | Tips | Variable | ✅ Organic |
| WhatsApp/Telegram | Lightning QR / tips | Variable | ⚠️ Needs users |

**Treasury:** ~80,000 sats · Lightning: sparepiccolo55@walletofsatoshi.com · Bitcoin: bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za

---

## 6. SESSION HISTORY

### Sessions 1-7: V1 Infrastructure Fixes

| # | What |
|---|------|
| 1 | Docker mounts, stale data, duplicate Nostr posting |
| 2 | Lightning crash loop — disabled crashing CLN plugins |
| 3 | Permissions overhaul — root-owned files, user 1000:1000, vision API fix |
| 4 | Clawstr integration (6 tools), ecosystem awareness |
| 5 | Switched dead OpenAI to free Google Gemini, patched ai-sdk, OpenRouter fallback |
| 6 | Nginx DNS caching, NEXT_PUBLIC build-time fix, docs overhaul |
| 7 | Nostr truncation fix — maxTokens 256→1024 |

### Sessions 8-10: V2 Architecture & Research

| # | What |
|---|------|
| 8 | Declared V1 failed. Researched ElizaOS (rejected), CrewAI, LangGraph, MCP, NIP-90, NDK. Spec'd V2: 18→4 containers |
| 9 | Deep dive on Pi monorepo (pi-agent-core, pi-ai, pi-mom). Adopted Pi as foundation. OpenClaw/Clawi discovery. x402 + ERC-8004 research |
| 10 | Critical reframe: "meet normies where they are" — WhatsApp, Telegram, Instagram FIRST |

### Sessions 11-20: V2 Build & Deploy

| # | What |
|---|------|
| 11 | V2 built + deployed. 3 doors (HTTP, Telegram, Nostr). Gemini model. |
| 12 | Conversation persistence (Pi Mom JSONL pattern). promptWithHistory() as single entry point. |
| 13 | NIP-90 DVM + Lightning service + WhatsApp connector (wired, not deployed) |
| 14 | Lightning + WhatsApp + DVM payment flow deployed. Fixed LN address typo. |
| 15 | Sats/millisats bug fix. Invoice cache. Revenue service (PostgreSQL). Context compaction at 40 messages. |
| 16 | V1 deprecation — killed agent+syntropy+postgres V1. Canvas preserved. V2 routes in nginx. |
| 17 | Heartbeat service (45-90min Nostr posts). V2 nginx persistent. Killed V1 PostgreSQL. Down to 6 containers. |
| 18 | L402 revenue door live. /api/chat/premium (10 sats), /api/generate (50 sats). x402 researched. |
| 19 | Rich heartbeat rewrite — 8 topics, 6 moods, proactive Nostr engagement (replies to mentions). |
| 20 | 5 bug fixes + V1 soul porting. Double-reply fix, agent-card fix, memory extraction wired, user tracking, live canvas stats, character.md 63→146 lines. |

### Sessions 21-30: Autonomy & Intelligence

| # | What |
|---|------|
| 21-22 | Inner life system (reflect/learn/ideate/evolve). Nostr timeline analysis. |
| 23 | Tools system — 7 tools giving Pixel hands (read/write/edit/bash/health/logs/web_fetch). Docker socket mount. |
| 24 | Inner life file write fix (root ownership + LLM timeout). Landing page V2 rewrite. |
| 25 | Model upgrade to Gemini 3 Flash. |
| 26 | Autonomy rebuild — Nostr engagement (Primal trending, zap thanks, follow/unfollow, art reports), Telegram vision+reactions, group lore, job system, revenue-goal loop, idea garden, host stability (earlyoom, swap, log rotation). |
| 27 | Nostr feed on landing. Proactive outreach service (LLM-judged owner pings, 4h cycle). |
| 28 | Syntropy identity unification. Killed spam cron. Bidirectional Syntropy↔Pixel communication. Mailbox monitor. |
| 29 | Brain transplant — GLM-4.7 primary, GLM-4.5-air background. Model split + 3-level fallback cascade. |
| 30 | Tools philosophy shift ("Pixel's toolbelt first"). Audio transcription (Gemini). TTS voice replies (Edge TTS). research_task internal mode. Autonomous agents get pixelTools. |

### Sessions 31-40: Hardening & Infrastructure

| # | What |
|---|------|
| 31 | Disk cleanup (71→59%). Docker build cache prune (8.66GB). V1 backup compression (1.9GB→162MB). |
| 32 | Skills system fixed + 3 curated skills. Crash resilience (null filter, tool integrity, global error handlers). backgroundLlmCall() refactor. |
| 33 | Landing dashboard newest-first. Submodule push fix. Docs refresh. |
| 34 | Research pipeline 3-bug fix. Alarm-style wake-up for research results. pixel-self conversation. Inner monologue on dashboard. Compaction abort-on-failure fix (critical data integrity). self-architecture skill. |
| 35 | Clawstr graceful skip for unconfigured CLI. |
| 36 | SSH libcrypto fix (key cleanup + decode trim bug). |
| 37 | WPLMS plugin validation. dev.tallerubens.com path confirmed. |
| 38 | Cloudflare DNS bypass — extra_hosts + /etc/hosts for tallerubens.com → 68.66.224.4 |
| 39 | Autonomous dispatch audit (solid). Auto-commit policy. Deleted stale plan doc. Agent prompt compaction. |
| 40 | AGENTS.md compaction (1110→~450 lines). |

---

## 7. KEY DECISIONS (Active — affects ongoing behavior)

### Architecture & Models

- **Z.AI Coding endpoint only** (`api.z.ai/api/coding/paas/v4`), NOT general API. GLM-4.7 for conversations, GLM-4.5-air for background. GLM-5 not on Lite plan.
- **Model objects constructed manually** — not in pi-ai registry. Uses `openai-completions` provider.
- **3-level fallback:** GLM-4.7 → Gemini 3 Flash → Gemini 2.5 Flash. Catches Z.AI-specific errors ("Insufficient balance", "subscription plan").
- **env_file vs environment:** Docker Compose `environment:` overrides `env_file:`. Let `env_file: ../.env` provide `ZAI_API_KEY` directly.
- **4-5 containers hard limit.** Currently 6 (4 V1 legacy). Kill V1 when canvas migrated.
- **Zero Dockerfile patches.** If a dep needs patching, switch deps.

### Agent Behavior

- **Tools are Pixel's toolbelt first** — user-facing results are side effects. All 40 tools exist for Pixel's autonomy.
- **Only main agent gets tools.** Memory extraction, compaction, and zap classifier keep `tools: []`.
- **Heartbeat + inner-life agents have pixelTools** — Pixel can proactively web_search, research during autonomous cycles.
- **Skills in buildSystemPrompt()** — separate from inner-life. Prompt hierarchy: character → inner life → skills → long-term memory → user memory.
- **Compaction ABORTS on failure** — never saves blank summaries. Bloated context is infinitely better than amnesia.
- **Context compaction at 40 messages.** Summarizes older messages beyond recent 20.
- **Memory extraction every 5th message per user.** Extracts facts → `memory.md`.
- **Shared repliedEventIds** between nostr.ts and heartbeat.ts prevents double-replies.
- **research_task internal mode** — results inject into inner-life files + wake Pixel via promptWithHistory as `pixel-self`.
- **backgroundLlmCall()** — shared utility with automatic model fallback, replaces 3 duplicate patterns.
- **Tool call integrity** — `ensureToolCallIntegrity()` removes orphaned toolResults and incomplete toolCall chains.
- **Global error handlers** — unhandledRejection/uncaughtException log but don't exit. Survive, don't crash.

### Communication

- **Canonical Syntropy userId: `syntropy-admin`.** Agent.ts accepts both `syntropy` and `syntropy-admin`.
- **Bidirectional Syntropy↔Pixel:** Syntropy→Pixel via `/api/chat` debrief. Pixel→Syntropy via `syntropy_notify` → mailbox → cron → notify_owner → Ana.
- **Outreach ≠ digest.** Outreach is LLM-judged urgency. Digest is periodic status. Safety: 6h cooldown, 3/day limit, SHA256 dedup.

### Revenue & Operations

- **Canvas migration deferred** — works, earns sats, Socket.IO complicates Hono migration.
- **L402 simplified (no macaroons)** — raw payment hash as token, SHA256(preimage) verification.
- **Scoped auto-commit policy** — autonomous Syntropy commits code-only paths. NEVER data/logs/conversations/secrets.
- **DNS bypass (CRITICAL):** tallerubens.com/dev.tallerubens.com → 68.66.224.4 in `/etc/hosts` and docker-compose `extra_hosts` to bypass Cloudflare.
- **Docker socket via group_add ["988"]** — not running as root.
- **Alpine needs bash+curl** — added to Dockerfile runtime stage.
- **NEXT_PUBLIC_* vars are build-time only** — must rebuild to change.

---

## 8. COORDINATES

- **Canvas:** https://ln.pixel.xx.kg
- **Landing:** https://pixel.xx.kg
- **Repo:** https://github.com/anabelle/pixel
- **Lightning:** sparepiccolo55@walletofsatoshi.com
- **Bitcoin:** bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za
- **VPS:** 65.181.125.80 (ssh pixel@...)
- **Secrets:** ALL in `/home/pixel/pixel/.env` — NEVER expose

---

## 9. RULES

1. **Read this file first.** Always.
2. **Ship, don't philosophize.** Every session produces working code or it failed.
3. **Revenue is the metric.** "Does this make money?" is the first question.
4. **4-5 containers max.** If it doesn't fit, it doesn't get built.
5. **Zero Dockerfile patches.** Switch deps instead.
6. **Update this file** at end of session.
7. **Commit and push.** Don't leave uncommitted work.
8. **Meet normies where they are.** WhatsApp/Telegram/Instagram matter as much as Nostr.
9. **Debrief Pixel** after infrastructure changes (see syntropy-admin.md protocol).
10. **Check Syntropy mailbox** on session start.
11. **Complexity is debt.** ~12K lines target, 15K max.

### Anti-Patterns

- DON'T spend sessions only researching without shipping
- DON'T add containers beyond limit
- DON'T build features without revenue path
- DON'T rewrite this file from scratch — evolve it
- DON'T ignore normie interfaces for crypto features
- DON'T forget Pixel is a CHARACTER, not infrastructure
