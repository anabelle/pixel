# PIXEL V2 — MASTER AGENT BRIEFING

> **Read this file FIRST in every session. Single source of truth.**
> Last updated: 2026-02-18 | Session: 51

---

## 1. CURRENT STATUS

**V1:** 4 containers (api, web, landing, nginx). Canvas preserved (9,225+ pixels, 81,971+ sats). Agent + Syntropy + PostgreSQL killed.
**V2:** 2 containers (pixel, postgres-v2). 50 tools. Primary model: Z.AI GLM-5 (744B) → Gemini cascade on 429. Public tier: OpenRouter Z.AI GLM-4.5 Air (free, tool-capable). Background: Z.AI GLM-4.7 (reasoning) → Gemini cascade. Vision: Gemini 2.5 Flash. Fallback: Gemini 3 Flash→2.5 Pro→2.5 Flash→2.0 Flash.
**Total containers:** 6 (down from 18 at V1 peak)
**Disk:** ~69% (24GB free) | **RAM:** ~3.1GB / 3.8GB + 4GB swap
**Cron:** auto-update (hourly), host-health (daily 3:15am), mailbox-check (30 min)
**External:** `https://pixel.xx.kg/v2/health`, `https://pixel.xx.kg/.well-known/agent-card.json`, `https://pixel.xx.kg/v2/api/*`

| Component | Status |
|-----------|--------|
| Telegram (@PixelSurvival_bot) | ✅ Live — vision, voice, groups, notify_owner |
| Nostr (NDK) | ✅ Live — mentions, DMs, DVM, engagement |
| WhatsApp (Baileys) | ✅ Live — voice, QR pairing at /v2/api/whatsapp/qr |
| Twitter/X (@PixelSurvivor) | ✅ Live — cookie auth, mention polling, rate-limited posting, read-only default |
| Instagram | ❌ Not started |
| HTTP API + L402 | ✅ Live — /api/chat/premium (10 sats), /api/generate (50 sats) |
| x402 | ✅ Live + Tested — /api/chat/premium/x402 ($0.01), /api/generate/x402 ($0.05), /api/generate/image/x402 ($0.08) USDC on Base. E2E verified 2026-02-18. |
| Skills system | ✅ 5 skills loaded (revenue, image-gen, resource, self-architecture + 1 auto-generated) |
| Inner life | ✅ Running (reflect/learn/ideate/evolve on heartbeat cycles) |
| Outreach | ✅ 4h cycle, LLM-judged owner pings |
| Syntropy↔Pixel | ✅ Bidirectional (debrief + mailbox + cron monitor) |
| Autonomous dispatch | ✅ Headless Syntropy via cron |
| Canvas migration | ❌ Deferred (V1 canvas works, earns sats) |
| Sandbox container | ❌ Not started |

**Next action:** GitHub issue tracking, Instagram integration

---

## 2. WHAT IS PIXEL

Pixel is a **living digital artist and AI assistant** across multiple platforms. Distinct personality, creates art, holds conversations, earns its own money through value-for-value exchanges.

**The one-liner:** "The street artist who learned to code. Lives on every platform, creates for anyone who asks, gets paid in whatever currency you've got."

**Pixel IS:** A character with opinions, art, and voice. Reachable on WhatsApp, Telegram, Twitter, Instagram, Nostr, HTTP. Bitcoin-native (Lightning, USDC, zaps). Self-evolving — writes its own tools and skills.

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
WhatsApp/Telegram/Twitter/Instagram/Nostr/HTTP/Canvas → PIXEL AGENT (Pi agent-core) → PostgreSQL
```

Every connector: receive → identify user → load context → prompt agent → stream response → persist.

### File Inventory (36 source files, ~18,070 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.ts` | ~1173 | Boot, Hono HTTP, all API routes, DB init, user tracking, outreach startup, Twitter boot, nostr persistence shutdown, error handlers |
| `src/agent.ts` | ~1005 | Pi agent wrapper, promptWithHistory(), backgroundLlmCall(), sanitizeMessagesForContext(), skills loading, memory extraction, context compaction |
| `src/conversations.ts` | ~329 | JSONL persistence, context compaction, tool-boundary-aware trimming |
| `src/db.ts` | ~152 | Drizzle schema (users, revenue, canvas_pixels, conversation_log) |
| `src/connectors/telegram.ts` | ~886 | grammY bot — vision, groups, notify_owner, voice transcription, TTS |
| `src/connectors/nostr.ts` | ~430 | NDK mentions + DMs + DVM + shared repliedEventIds + disk persistence for dedup |
| `src/connectors/whatsapp.ts` | ~938 | Baileys bot, QR + pairing code auth, voice transcription, TTS, repair/status API |
| `src/connectors/twitter.ts` | ~559 | Hybrid scraper (cookie auth, getTweet) + API v2 OAuth 1.0a (posting, search, mentions), rate-limited posting, disk-persisted state |
| `src/services/tools.ts` | ~2750 | 50 tools: filesystem, bash, web, git, ssh, wp, list_servers, clawstr, alarms, chat, memory, notify_owner, syntropy_notify, introspect, health, logs, voice, image_gen, twitter |
| `src/services/heartbeat.ts` | ~2012 | Initiative engine — topics/moods, Nostr engagement, Clawstr, Primal discovery, zaps, follows, revenue-goal, live canvas stats. Has pixelTools. |
| `src/services/inner-life.ts` | ~1023 | Autonomous reflection, learning, ideation, identity evolution. Has pixelTools. |
| `src/services/memory.ts` | ~866 | Persistent memory — save/search/update/delete per user, vector-aware |
| `src/services/jobs.ts` | ~564 | Job system — scheduled tasks, ecosystem reports, idea garden, alarm-style wake-up |
| `src/services/reminders.ts` | ~540 | Alarm/reminder system — schedule, list, cancel, modify, list_all, cancel_all |
| `src/services/outreach.ts` | ~397 | Proactive owner outreach — LLM-judged Telegram pings, cooldowns, dedup |
| `src/services/cost-monitor.ts` | ~347 | LLM cost tracking, budget monitoring, per-model error tracking with cascade analysis |
| `src/services/l402.ts` | ~301 | L402 Lightning HTTP 402 middleware |
| `src/services/audit.ts` | ~257 | Structured JSONL audit trail |
| `src/services/dvm.ts` | ~249 | NIP-90 text gen DVM + NIP-89 + Lightning payment + revenue |
| `src/services/lightning.ts` | ~225 | LNURL-pay invoices, invoiceCache |
| `src/services/digest.ts` | ~198 | Periodic digest + instant alert system for owner |
| `src/services/nostr-auth.ts` | ~169 | NIP-98 HTTP auth for dashboard |
| `src/services/clawstr.ts` | ~168 | Clawstr CLI wrapper — docker-in-docker, config at `/app/data/.clawstr` (mounted from `data/clawstr`), 6h check cycle |
| `src/services/image-gen.ts` | ~145 | Gemini image generation service |
| `src/services/revenue.ts` | ~141 | PostgreSQL revenue tracking |
| `src/services/x402.ts` | ~134 | x402 USDC payment middleware — CDP facilitator, JWT auth, Base mainnet |
| `src/services/primal.ts` | ~136 | Primal Cache API for trending Nostr posts |
| `src/services/logging.ts` | ~133 | Console interceptor → /app/data/agent.log |
| `src/services/audio.ts` | ~132 | Audio transcription via Gemini 2.0 Flash REST API |
| `src/services/users.ts` | ~124 | User tracking — upsert, stats |
| `src/services/tts.ts` | ~73 | Edge TTS → ffmpeg → OGG/Opus, auto language detection |
| `src/services/blossom.ts` | ~47 | Blossom media upload for Nostr image posts |
| `src/services/vision.ts` | ~46 | Image URL extraction for multi-modal input |
| `src/services/google-key.ts` | ~52 | Google API key failover (primary → fallback) used by Gemini calls |
| `src/services/server-registry.ts` | ~213 | Multi-server SSH registry + authorization — resolves named servers, key lookup, tool tiers, per-server access, command safety blocklists |

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
| `@coinbase/x402` + `@x402/*` | x402 USDC payment protocol (CDP facilitator, JWT auth, Base mainnet) |

### AI Providers

⚠️ **Model names/pricing/availability change constantly. Research via API, not training data.**

- **Primary (conversations):** Z.AI GLM-5 (744B, reasoning) for priority users → auto-cascade on 429 to Gemini 3 Flash → 2.5 Pro → 2.5 Flash → 2.0 Flash. Public users use OpenRouter Z.AI GLM-4.5 Air (free, tool-capable). promptWithHistory handles fallback transparently.
- **Background (heartbeat/inner-life/jobs):** OpenRouter Trinity (free) → Z.AI GLM-4.7 → same Gemini cascade via `backgroundLlmCall()`.
- **Vision/Audio:** Gemini 2.5 Flash (upgraded from 2.0 Flash — better quality, reasoning-capable, no self-narrating headers)
- **Fallback chain:** Gemini 3 Flash → 2.5 Pro → 2.5 Flash → 2.0 Flash (all free tier — ordered by quality since cost is $0)
- **Google key failover:** Primary key ($300 free credits) → fallback key (billed) via `resolveGoogleApiKey()`. Flips on quota errors, resets on success. Used by all Google callers: agent cascade, embeddings (memory.ts), image gen, audio transcription.
- Z.AI Coding Lite: $84/yr, valid to 2027-02-14. 5-hour rolling rate limit. Used opportunistically for background tasks via cascade.
- Z.AI models constructed manually in `makeZaiModel()` (not in pi-ai registry)
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
| x402 HTTP API | USDC on Base | $0.01-0.08/call | ✅ Live (CDP facilitator) |
| Nostr zaps | Tips | Variable | ✅ Organic |
| WhatsApp/Telegram | Lightning QR / tips | Variable | ⚠️ Needs users |

**Treasury:** ~80,000 sats · Lightning: sparepiccolo55@walletofsatoshi.com · Bitcoin: bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za

---
## 6. SECURITY & AUTHORIZATION

Pixel runs on public networks (Telegram/WhatsApp/Nostr/HTTP). Tool access is locked down at two layers:

- **Tool filtering (agent-level):** the agent only receives tools allowed by `servers.json` tool tiers for the caller (`public` vs `server_admin`). Implemented via `getPermittedTools()` in `src/services/server-registry.ts` and applied in `src/agent.ts`.
- **Runtime enforcement (tool-level):** dangerous tools enforce authorization inside the tool itself (defense-in-depth). `ssh` and `wp` require per-server authorization when `server` is used; ad-hoc host/user/key connections require a global admin.

Authorization config lives in `servers.json`:

- `global_admins`: full access
- `tool_tiers.public`: safe tools for anyone
- `servers.<name>.authorized_users/authorized_groups`: per-server access control

---

## 7. KEY DECISIONS (Active — affects ongoing behavior)

### Architecture & Models

- **Z.AI Coding endpoint only** (`api.z.ai/api/coding/paas/v4`), NOT general API. GLM-5 for conversations, GLM-4.7 for background. Z.AI rate limits heavily (~90% 429 on GLM-4.7), cascade absorbs failures.
- **Model objects constructed manually** — not in pi-ai registry. Uses `openai-completions` provider.
- **Multi-level fallback:** GLM-5/4.7 → Gemini 3 Flash → 2.5 Pro → 2.5 Flash → 2.0 Flash. Catches Z.AI-specific errors ("Insufficient balance", "subscription plan").
- **env_file vs environment:** Docker Compose `environment:` overrides `env_file:`. Let `env_file: ../.env` provide `ZAI_API_KEY` directly.
- **4-5 containers hard limit.** Currently 6 (4 V1 legacy). Kill V1 when canvas migrated.
- **Zero Dockerfile patches.** If a dep needs patching, switch deps.

### Agent Behavior

- **Tools are Pixel's toolbelt first** — user-facing results are side effects. All 50 tools exist for Pixel's autonomy.
- **Only main agent gets tools.** Memory extraction, compaction, and zap classifier keep `tools: []`.
- **Heartbeat + inner-life agents have pixelTools** — Pixel can proactively web_search, research during autonomous cycles.
- **Skills in buildSystemPrompt()** — separate from inner-life. Prompt hierarchy: character → inner life → skills → long-term memory → user memory.
- **Compaction ABORTS on failure** — never saves blank summaries. Bloated context is infinitely better than amnesia.
- **Context compaction at 40 messages.** Summarizes older messages beyond recent 20.
- **Memory extraction every 5th message per user.** Extracts facts → `memory.md`.
- **Shared repliedEventIds** between nostr.ts and heartbeat.ts prevents double-replies.
- **Clawstr is secondary to Nostr.** 6h check cycle, max 1 reply per cycle, 4h cooldown. Token budget goes to Nostr engagement first.
- **Clawstr config path:** `isClawstrConfigured()` checks `/app/data/.clawstr/config.json` (container mount from `data/clawstr/`) AND `${HOST_PIXEL_ROOT}/data/clawstr/config.json`. Docker-in-docker CLI uses host path for volume mount.
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
- **DNS bypass (CRITICAL):** tallerubens.com/dev.tallerubens.com/ambienteniwa.com → 68.66.224.4 in `/etc/hosts` and docker-compose `extra_hosts` to bypass Cloudflare.
- **Multi-server SSH via server registry:** `servers.json` defines named servers (host, user, key_env, wp_path, capabilities, blocked_patterns). Loaded from `/app/servers.json` (baked into the Docker image); env var fallback exists but is optional. SSH/WP tools accept `server` param for registry lookup, with raw host/user/key fallback for ad-hoc (global admins only). `list_servers` tool exposes available servers to the agent. See `src/services/server-registry.ts`. To add a new server: (1) add entry to `servers.json`, (2) add `<NAME>_SSH_KEY` to `.env`, (3) add DNS to `extra_hosts` in docker-compose if behind CDN, (4) rebuild container.
- **Docker socket via group_add ["988"]** — not running as root.
- **Alpine needs bash+curl** — added to Dockerfile runtime stage.
- **NEXT_PUBLIC_* vars are build-time only** — must rebuild to change.
- **Postgres uses named volume:** `postgres-v2-data` (Docker managed). No permission issues — isolated from pixel container. Old bind mount caused recurring UID conflicts when pixel (1000) touched shared `./data/postgres` directory.
- **V2 DB credentials:** user=`pixel`, password=`pixel`, database=`pixel_v2`, container=`postgres-v2` (port 5433). Access: `docker compose -f v2/docker-compose.yml exec postgres-v2 psql -U pixel -d pixel_v2`.
- **Alarm platform inference:** `schedule_alarm` auto-remaps `platform: http` → correct platform based on userId prefix (`tg-` → telegram, `wa-` → whatsapp, `nostr-` → nostr). Prevents undeliverable reminders from HTTP dashboard sessions.
- **Alarm recovery sweep:** `schedulerLoop()` runs a recovery sweep every tick — non-recurring reminders stuck as `active` with `lastFiredAt >= dueAt` are auto-marked `fired`. Prevents orphaned reminders from container crashes between the optimistic lock and status update.

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
6. **Commit and push.** Don't leave uncommitted work.
7. **Meet normies where they are.** WhatsApp/Telegram/Instagram matter as much as Nostr.
8. **Debrief Pixel** after infrastructure changes (see syntropy-admin.md protocol).
9. **Check Syntropy mailbox** on session start.
10. **Complexity is debt.** ~18K lines current, 16K soft limit exceeded (Twitter integration).

### Anti-Patterns

- DON'T spend sessions only researching without shipping
- DON'T add containers beyond limit
- DON'T build features without revenue path
- DON'T rewrite this file from scratch — evolve it
- DON'T ignore normie interfaces for crypto features
- DON'T forget Pixel is a CHARACTER, not infrastructure

---

## 10. LESSONS LEARNED

### Session 51: Postgres Permission Recurrence

**Problem:** Postgres DB errors kept recurring despite fix scripts running daily. Error: `could not open file "global/pg_filenode.map": Permission denied`.

**Root cause:** Both pixel and postgres containers shared the same bind-mounted directory `./data/postgres`. When pixel container (UID 1000) touched any file in `/app/data`, it changed ownership from 999:999 (postgres) to 1000:1000.

**Failed attempts:**
- Permission fix scripts (`check-postgres-perms.sh`, `ensure-postgres-perms.sh`) — worked temporarily but issue recurred
- Entrypoint logic to skip postgres directory — didn't prevent all touches

**Solution:** Use Docker named volume for postgres instead of bind mount. Named volumes are managed by Docker with proper ownership semantics and are isolated from other containers.

**Lesson:** When two containers need access to the same data, use named volumes or separate bind mounts. Never share a subdirectory of another container's bind mount.
