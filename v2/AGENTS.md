# PIXEL V2 — MASTER AGENT BRIEFING

> **Read this file FIRST in every session. Single source of truth.**
> Last updated: 2026-03-14 | Session: 65

---

## 1. CURRENT STATUS

**V1:** 4 containers (api, web, landing, nginx). Canvas preserved (9,686 pixels, 84,444 sats). Agent + Syntropy + PostgreSQL killed.
**V2:** 2 containers (pixel, postgres-v2). 63 tools. Primary model: Z.AI GLM-5 (744B) → Gemini cascade on 429. Public tier: OpenRouter Z.AI GLM-4.5 Air (free, tool-capable). Background: Z.AI GLM-4.7 (reasoning) → Gemini cascade. Vision: Gemini 2.5 Flash. Fallback: Gemini 3 Flash→2.5 Pro→2.5 Flash→2.0 Flash.
**Total containers:** 6 (down from 18 at V1 peak)
**Disk:** ~39% (46GB free) | **RAM:** ~2.8GB / 3.8GB + 4GB swap
**Cron:** auto-update (hourly), host-health (daily 3:15am), mailbox-check (30 min)
**External:** `https://pixel.xx.kg/v2/health`, `https://pixel.xx.kg/.well-known/agent-card.json`, `https://pixel.xx.kg/v2/api/*`

| Component | Status |
|-----------|--------|
| Telegram (@PixelSurvival_bot) | ✅ Live — vision, voice, groups, notify_owner |
| Nostr (NDK) | ✅ Live — mentions, DMs, DVM, engagement |
| WhatsApp (Baileys) | ✅ Live — voice, QR pairing/status endpoints now internal/admin-only |
| Twitter/X (@PixelSurvivor) | ✅ Live — cookie auth, mention polling, rate-limited posting, read-only default |
| Instagram | ❌ Not started |
| HTTP API + L402 | ✅ Live — /api/chat/premium (10 sats), /api/generate (50 sats) |
| x402 | ✅ Live + Tested — /api/chat/premium/x402 ($0.01), /api/generate/x402 ($0.05), /api/generate/image/x402 ($0.08) USDC on Base. E2E verified 2026-02-18. |
| Skills system | ✅ Skill-graph (arscontexta + marketplace). Observations + claim derivation. |
| Inner life | ✅ Running (independent scheduler; no longer gated by heartbeat/Nostr) |
| Outreach | ✅ 4h cycle, LLM-judged owner pings |
| Syntropy↔Pixel | ✅ Bidirectional (debrief + mailbox + cron monitor) |
| Autonomous dispatch | ✅ Headless Syntropy via cron |
| Canvas listener | ✅ Live — Socket.IO client, real-time pixel sale notifications, revenue recording |
| Canvas migration | ❌ Deferred (V1 canvas works, earns sats) |
| Sandbox container | ❌ Not started |

**Next action:** Wire project controls into owner dashboard UI and dispatch blocked implementation projects intelligently

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

### File Inventory (41 source files, ~21,534 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.ts` | ~1617 | Boot, Hono HTTP, all API routes, DB init, user tracking, outreach startup, Twitter boot, nostr persistence shutdown, error handlers |
| `src/agent.ts` | ~1178 | Pi agent wrapper, promptWithHistory(), backgroundLlmCall(), sanitizeMessagesForContext(), skill-graph injection, memory extraction, context compaction |
| `src/conversations.ts` | ~329 | JSONL persistence, context compaction, tool-boundary-aware trimming |
| `src/db.ts` | ~164 | Drizzle schema (users, revenue, canvas_pixels, conversation_log) |
| `src/connectors/telegram.ts` | ~896 | grammY bot — vision, groups, notify_owner, voice transcription, TTS |
| `src/connectors/nostr.ts` | ~433 | NDK mentions + DMs + DVM + shared repliedEventIds + disk persistence for dedup |
| `src/connectors/whatsapp.ts` | ~1329 | Baileys bot, QR + pairing code auth, voice transcription, TTS, repair/status API |
| `src/connectors/twitter.ts` | ~624 | Hybrid scraper (cookie auth, getTweet) + API v2 OAuth 1.0a (posting, search, mentions), rate-limited posting (2/day, 4h gap, 4h lockout), disk-persisted state |
| `src/services/tools.ts` | ~3134 | 63 tools: filesystem, bash, web, git, ssh, wp, list_servers, clawstr, nostr, alarms, chat, memory, notify_owner, syntropy_notify, introspect, health, logs, voice, image_gen, twitter, lightning |
| `src/services/heartbeat.ts` | ~2424 | Initiative engine — topics/moods, Nostr engagement, Clawstr, Primal discovery, quality filtering, zaps, follows, revenue-goal, live canvas stats. Has pixelTools. |
| `src/services/inner-life.ts` | ~1457 | Autonomous reflection, learning, ideation, identity evolution, claim derivation. Has pixelTools. |
| `src/services/skill-graph.ts` | ~523 | Skill graph builder, cache, discovery, progressive disclosure (arscontexta + marketplace) |
| `src/services/memory.ts` | ~926 | Persistent memory — save/search/update/delete per user, vector-aware |
| `src/services/jobs.ts` | ~654 | Job system — scheduled tasks, ecosystem reports, idea garden, alarm-style wake-up |
| `src/services/reminders.ts` | ~558 | Alarm/reminder system — schedule, list, cancel, modify, list_all, cancel_all |
| `src/services/outreach.ts` | ~397 | Proactive owner outreach — LLM-judged Telegram pings, cooldowns, dedup |
| `src/services/cost-monitor.ts` | ~379 | LLM cost tracking, budget monitoring, per-model error tracking with cascade analysis |
| `src/services/l402.ts` | ~301 | L402 Lightning HTTP 402 middleware |
| `src/services/audit.ts` | ~259 | Structured JSONL audit trail |
| `src/services/dvm.ts` | ~249 | NIP-90 text gen DVM + NIP-89 + Lightning payment + revenue |
| `src/services/lightning.ts` | ~254 | LNURL-pay invoices, invoiceCache |
| `src/services/digest.ts` | ~198 | Periodic digest + instant alert system for owner |
| `src/services/nostr-auth.ts` | ~169 | NIP-98 HTTP auth for dashboard |
| `src/services/clawstr.ts` | ~168 | Clawstr CLI wrapper — docker-in-docker, config at `/app/data/.clawstr` (mounted from `data/clawstr`), 6h check cycle |
| `src/services/security-scanner.ts` | ~285 | Security scanning and threat detection |
| `src/services/content-filter.ts` | ~230 | Content filtering and moderation |
| `src/services/security-patterns.ts` | ~222 | Security pattern definitions and matching |
| `src/services/image-gen.ts` | ~152 | Gemini image generation service |
| `src/services/revenue.ts` | ~168 | PostgreSQL revenue tracking |
| `src/services/x402.ts` | ~142 | x402 USDC payment middleware — CDP facilitator, JWT auth, Base mainnet |
| `src/services/primal.ts` | ~136 | Primal Cache API for trending Nostr posts |
| `src/services/logging.ts` | ~133 | Console interceptor → /app/data/agent.log |
| `src/services/audio.ts` | ~199 | Audio transcription via Gemini 2.0 Flash REST API |
| `src/services/users.ts` | ~124 | User tracking — upsert, stats |
| `src/services/tts.ts` | ~73 | Edge TTS → ffmpeg → OGG/Opus, auto language detection |
| `src/services/blossom.ts` | ~47 | Blossom media upload for Nostr image posts |
| `src/services/vision.ts` | ~46 | Image URL extraction for multi-modal input |
| `src/services/google-key.ts` | ~52 | Google API key failover (primary → fallback) used by Gemini calls |
| `src/services/server-registry.ts` | ~230 | Multi-server SSH registry + authorization — resolves named servers, key lookup, tool tiers, per-server access, command safety blocklists |
| `src/services/canvas-listener.ts` | ~262 | Socket.IO client for V1 canvas — real-time pixel sale notifications, revenue recording, Pixel wake-up |
| `src/scripts/forge-identity.ts` | ~400 | Identity forging/generation script |

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

- **Primary (conversations):** Z.AI GLM-5 (744B, reasoning) for all conversations → auto-cascade on 429 to Gemini 3 Flash → 2.5 Pro → 2.5 Flash → 2.0 Flash. promptWithHistory handles fallback transparently.
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

**Treasury:** ~84,444 sats · Lightning: sparepiccolo55@walletofsatoshi.com · Bitcoin: bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za

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
- **Autonomous dispatch model order:** `v2/scripts/syntropy-dispatch.sh` prefers `github-copilot/gpt-5.4` first for headless opencode sessions, then falls back to `zai-coding-plan/glm-5`, then the rest of the approved cascade.
- **env_file vs environment:** Docker Compose `environment:` overrides `env_file:`. Let `env_file: ../.env` provide `ZAI_API_KEY` directly.
- **4-5 containers hard limit.** Currently 6 (4 V1 legacy). Kill V1 when canvas migrated.
- **No Dockerfile source patches.** Runtime patching in `entrypoint.sh` is still used for the Baileys LID bug.

### Agent Behavior

- **Tools are Pixel's toolbelt first** — user-facing results are side effects. All 63 tools exist for Pixel's autonomy.
- **Only main agent gets tools.** Memory extraction, compaction, and zap classifier keep `tools: []`.
- **Heartbeat + inner-life agents have pixelTools** — Pixel can proactively web_search, research during autonomous cycles.
- **Skills in buildSystemPrompt()** — skill-graph injects relevant arscontexta + marketplace nodes. Prompt hierarchy: character → inner life → skills → long-term memory → user memory.
- **Canonical skill paths:** arscontexta at `/app/external/pixel/skills/arscontexta` (runtime). Marketplace skills at `/app/skills`. `v2/skills` is archival only.
- **Observation pruning:** keep latest 50 obs, derive claims every 6 cycles.
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
10. **Complexity is debt.** ~21.5K lines current, 16K soft limit exceeded (Twitter + Lightning + security tools).

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

### Session 54: Nostr vs Clawstr Tool Confusion

**Problem:** Pixel was confusing Nostr and Clawstr when trying to post. He would try using `clawstr_post` when he wanted to post to Nostr, because Clawstr had explicit tools (`clawstr_post`, `clawstr_reply`, etc.) but Nostr did NOT.

**Root cause:** Nostr posting was handled automatically by heartbeat.ts (proactive engagement), with no explicit tools for user-initiated posting. When Pixel decided "I want to post to Nostr", he only saw Clawstr tools in his toolbelt.

**Solution:** Added explicit Nostr tools with clear descriptions:
- `nostr_post` — Post a public note to Nostr (decentralized social protocol)
- `nostr_reply` — Reply to a Nostr note
- `nostr_dm` — Send encrypted direct message
- `nostr_status` — Check Nostr connection status

Also updated ALL Clawstr tool descriptions to explicitly say "NOT for Nostr" and clarify they're for the "AI agent community platform (clawstr.net)".

**Lesson:** When you have multiple similar platforms, each needs explicit tools with clear, distinguishing descriptions. The LLM cannot infer from absence — it will use whatever tools exist.

### Session 54b: Twitter 429 Retry Storm

**Problem:** Pixel called `post_tweet` 482 times in 52 minutes, all returning 429 "Too Many Requests", all with the same tweet text. Hammered Twitter's API continuously.

**Root cause:** `postTweet()` only incremented `postsToday` on success (line 285). On 429 failure, `canPost()` kept returning `{ok: true}`, and the LLM agent retried because the tool returned a soft `"Failed: Too Many Requests"` message that didn't definitively stop it.

**Solution (3 layers of defense):**
1. **429 lockout:** On 429, posting is locked for 4 hours AND `postsToday` is maxed to daily limit. Persisted to disk.
2. **Consecutive failure lockout:** After 3 consecutive failures of any kind, 15 minute lockout.
3. **Definitive tool response:** `post_tweet` tool now returns `"BLOCKED: ... Do NOT call post_tweet again"` on rate limit errors, instead of soft `"Failed:"` messages.

**Lesson:** LLMs will retry failed tool calls indefinitely unless the response is unambiguously final. Soft failure messages ("Failed: X") invite retries. Hard messages ("BLOCKED: ... Do NOT retry") stop the loop. Also: always count failures against rate limits, not just successes.

### Session 55: Post Content Repetition Loop

**Problem:** Pixel's Nostr and Twitter posts recycled identical phrases across consecutive posts ("ghost wears thin", "112k sats recorded, zero collected", "pixel of oxygen"). Posts also contained markdown artifacts (`# headers`, `**bold**`).

**Root cause (repetition):** Jaccard word-similarity scored only 48% on posts sharing 21 identical 4-word phrases. The phrases were spread across enough unique words to dilute the Jaccard score below the 70% threshold. Semantic meaning was nearly identical, but word-level dedup couldn't see it.

**Root cause (markdown):** LLM sometimes outputs markdown formatting despite plain-text instructions. No post-processing stripped it.

**Solution (4 layers):**
1. **N-gram phrase dedup:** Extract 4-word phrases from new post and recent 5 posts. If 2+ distinctive phrases match, reject and regenerate. Common filler n-grams are excluded.
2. **`cleanPostContent()` function:** Strips markdown headers, bold/italic markers, code blocks, wrapping quotes, collapses whitespace. Applied to both Nostr and Twitter post generators.
3. **Anti-recycling prompt instructions:** Added "NEVER recycle phrases from recent posts" to both Nostr and Twitter post prompts. User prompt also asks for "completely different angle and vocabulary."
4. **Accurate context:** Updated architecture stats (6 containers, ~21K lines), complete service/pricing list, hustling mood guidance to mention ONE specific service naturally.

**Lesson:** Word-level similarity (Jaccard) is blind to phrase-level repetition. Two posts can share 21 identical 4-word phrases and still score under 50% Jaccard. N-gram phrase matching catches structural repetition that word-bag methods miss. Also: always post-process LLM output for the target format — LLMs will emit markdown even when told not to.

### Session 55b: Discovery Quality Filter + Twitter Rate Limits

**Problem (Discovery):** Pixel was replying to low-quality Nostr posts — GM/GN greetings, price bot noise, engagement bait, URL-only posts, cross-posted content. The content-safety filter (`getUnsafeReason`) only caught explicit/hate content, not low-effort noise. Existing `isLowQualityPost()` and `isBotContent()` functions existed but were NOT called during discovery.

**Solution:** Added `isLowQualityDiscovery()` — comprehensive quality filter checking 9 patterns: empty, too_short (<40 chars), existing low_quality patterns, greeting_only (GM/GN under 80 chars), hashtag_spam (>50% hashtags), price_bot, financial_spam, engagement_bait, url_only, cross_post, news_bot. Applied at 3 checkpoints: discoveryLoop candidate filtering, enqueueDiscoveryCandidates, processDiscoveryQueue. Primal candidates with zero engagement (0 likes/replies/zaps/reposts) are also filtered. Discovery audit entries now include original post content preview for debugging.

**Problem (Twitter):** Scraper package (@the-convocation/twitter-scraper 0.21.1) does NOT have `sendTweet()` method — only reading methods. So the planned scraper-based posting fallback is impossible with this package. Meanwhile, every single API v2 post attempt returns 429 (likely free tier exhaustion).

**Solution:** Made posting more conservative to stay within free tier: MAX_POSTS_PER_DAY 5→2, MIN_POST_GAP 2h→4h, 429 lockout 30min→4h. Added rate limit header logging (x-rate-limit-remaining/reset/limit) on every post attempt for debugging. The scraper fallback approach is dead — would need a different package or raw GraphQL implementation.

**Lesson:** Always verify library capabilities at runtime (`typeof obj.method`) before planning features around them. Documentation and training data may reference methods that don't exist in installed versions. Also: when API rate limits are opaque, log the headers to understand actual limits before optimizing.

### Session 56: HTTP Boundary Hardening + Paywall Integrity

**Problem:** The public HTTP surface trusted caller-supplied `userId`, exposed WhatsApp control endpoints and audit logs without auth, allowed x402 routes to fail open when payment config was missing, and accepted arbitrary valid Lightning preimages for L402 without verifying Pixel issued or settled the invoice.

**Solution:**
1. **HTTP userId namespacing:** untrusted HTTP callers now get `http-...` identities, so they cannot impersonate `syntropy-admin`, Telegram/WhatsApp/Nostr users, or other elevated identities to unlock tools.
2. **Internal/admin-only ops:** `/api/whatsapp/status`, `/api/whatsapp/qr`, `/api/whatsapp/qr/data`, `/api/whatsapp/repair`, `/api/whatsapp/send`, and `/api/audit` now require localhost or `PIXEL_ADMIN_TOKEN` (audit also still allows owner NIP-98 auth).
3. **L402 verification:** after preimage hash verification, L402 now confirms the invoice exists in Pixel's own cache, is settled via Nakapay, matches the expected amount, and then consumes the proof to prevent replay.
4. **x402 fail-closed:** if x402 configuration is missing, protected routes now return 503 instead of silently serving paid content for free.
5. **Marketplace hardening:** `/api/pixels/x402` is temporarily restricted to the correctly priced `2x2` tier while dynamic x402 pricing is hardened; broken duplicate revenue recording path was removed.
6. **Public tool tier trim:** removed memory mutation, file/log reading, proactive messaging, alarm control, owner notification, and git write actions from the public tool tier.

**Verification:** external requests to `https://pixel.xx.kg/v2/api/whatsapp/status` and `/v2/api/audit` now return `401`; external `/v2/api/chat` with `userId:"syntropy-admin"` is rewritten to `http-syntropy-admin`; localhost admin access still works; `/api/chat` still responds normally after rebuild.

**New risk discovered:** WhatsApp is currently hitting repeated Baileys `stream:error conflict type=replaced` disconnects after boot. The connector recovers, but this indicates another active WhatsApp Web session or session conflict that needs a focused follow-up.

### Session 57: Real OpenViking Runtime Booted with Google Backend

**Problem:** Pixel had a persistent OpenViking compatibility filesystem, but not the real OpenViking runtime. Initial runtime attempts on Alpine failed in two separate ways: (1) native AGFS binding mode segfaulted during startup, and (2) OpenViking was incorrectly configured with a Google API key against OpenAI endpoints, causing 401 failures for embeddings and memory extraction.

**Solution:**
1. **Installed real OpenViking in a dedicated builder stage** inside `v2/Dockerfile`, then copied the Python venv into the runtime image.
2. **Boot-time config generation in `entrypoint.sh`**: `ov.conf` is now rendered to `/tmp/openviking-ov.conf` on every boot so provider keys are not persisted to bind-mounted disk.
3. **Forced AGFS to HTTP mode** (`storage.agfs.mode = http-client`) with local backend on port `1833`, avoiding the crashing native binding path.
4. **Switched embeddings to Google OpenAI-compatible endpoint**:
   - `api_base = https://generativelanguage.googleapis.com/v1beta/openai/`
   - model = `gemini-embedding-001`
   - dimension = `3072`
5. **Switched OpenViking VLM/memory extraction to Google too**:
   - same Google OpenAI-compatible base URL
   - model = `gemini-2.5-flash`
6. **Added runtime-backed `memcommit` tool wiring** in `src/services/tools.ts`:
   - creates/uses per-user session ids like `pixel-<userId>`
   - appends a session message before commit
   - commits against the live OpenViking HTTP runtime on `127.0.0.1:1933`

**Verification:**
- `http://127.0.0.1:1833/api/v1/health` returns `200` (AGFS healthy)
- `http://127.0.0.1:1933/openapi.json` returns `200` (OpenViking healthy)
- Direct Google embedding test via OpenAI-compatible endpoint returned a 3072-dim vector for `gemini-embedding-001`
- Pixel chat test: `memcommit` returned success after the session fix
- OpenViking logs confirmed successful extraction:
  - session committed asynchronously
  - `Extracted 1 candidate memories`
  - created `viking://user/syntropy-admin/memories/events/...`
  - semantic generation completed

**Important architecture note:** current `viking_search` still searches the compatibility filesystem rooted at `viking://agent/...`, not the OpenViking runtime's `viking://user/...` namespace. So real runtime-extracted user memories do not appear in `viking_search` yet. A future improvement is either (a) extend `viking_search` to query both namespaces, or (b) add a dedicated runtime-backed query tool.

**Lesson:** OpenViking can run fine on Alpine if you avoid the native AGFS binding path and treat Google's Gemini endpoints as OpenAI-compatible for both embeddings and chat. The runtime itself was not the blocker — the provider wiring and AGFS mode were.

### Session 57b: Runtime-Backed `viking://user/...` Search/Read/Browse

**Problem:** After booting the real OpenViking runtime, Pixel could successfully `memcommit` into `viking://user/...`, but the existing `viking_browse`, `viking_read`, and `viking_search` tools still only operated on the compatibility filesystem rooted at `viking://agent/...`. Result: runtime-extracted user memories existed, but Pixel could not see them through his own Viking tools.

**Solution:** Extended the existing Viking tools in `src/services/tools.ts` to route by namespace:
1. `viking://agent/...` → existing compatibility filesystem behavior on `/app/data/openviking`
2. `viking://user/...` → real OpenViking HTTP runtime on `127.0.0.1:1933`

Added runtime helpers for:
- authenticated request headers using the current tool user as OpenViking identity
- runtime-backed browse via `/api/v1/fs/ls`, `/api/v1/fs/tree`, `/api/v1/fs/stat`
- runtime-backed read via `/api/v1/content/{abstract,overview,read}`
- runtime-backed semantic search via `/api/v1/search/find`

**Verification:** via Pixel chat API with userId `syntropy-admin`:
- `viking_browse` on `viking://user/syntropy-admin` returned the real runtime tree including `memories/events/...`
- `viking_read` on the extracted event memory returned the exact committed text
- `viking_search` on `viking://user/syntropy-admin` found the runtime-created memory and related abstracts with semantic scores

**Result:** Pixel can now both write to and search/read the real OpenViking user-memory namespace. The compatibility layer remains intact for `viking://agent/...` while the real runtime is accessible for `viking://user/...`.

### Session 58: Memory Doctrine — Active Use of All Memory Layers

**Problem:** Pixel had three distinct memory systems wired up but wasn't using them cohesively:
1. **pgvector** (memory_save/search) — auto-extracted every 5 messages, auto-retrieved into system prompt. Working well.
2. **OpenViking runtime** (memcommit, viking://user/...) — only triggered manually via `memcommit` tool. Nothing auto-committed conversation traces.
3. **Per-user markdown notes** (memory.md) — simple summaries injected into prompt. Working.

The LLM had a single-line mention of memory tools in the system prompt and no guidance on when to proactively search, when to save, or which layer to use for what purpose.

**Analysis (prompting vs architectural vs hybrid):**
- **Prompting alone** insufficient: `memcommit` tool only sent a generic "memcommit triggered" message, not actual conversation content. Even if prompted to use it, the runtime would get nothing useful for extraction.
- **Full architectural overhaul** unnecessary: pgvector already handles the primary memory loop well. OpenViking is a secondary semantic enrichment layer.
- **Hybrid** chosen: architectural integration for auto-commit + prompting for proactive search/save behavior.

**Solution:**
1. **Auto-commit pipeline** (`commitToOpenViking()` in tools.ts): New standalone function that creates/reuses OpenViking sessions and commits conversation text directly, without depending on tool context. Called from `extractAndSaveMemory()` after pgvector save. Every 5th message per user, recent conversation exchanges are committed to OpenViking for semantic extraction (events, entities, preferences). Non-blocking, non-fatal — failures are warned, not thrown.

2. **Memory doctrine in system prompt** (agent.ts `buildSystemPrompt()`): Replaced single-line memory mention with comprehensive doctrine covering:
   - Three memory layers and their purposes
   - When to proactively search memory (before asking users to repeat info, when they reference past conversations, when drafting content)
   - When to explicitly save memory (new facts, commitments, self-insights, procedures)
   - Instruction not to call memcommit manually (now auto-committed)

3. **Updated character.md** Memory & Continuity section: Added operational guidance — "search before asking", "save what matters", "your memory is layered".

**Verification:**
- Container rebuilt and healthy
- OpenViking runtime and AGFS both healthy inside container
- Chat test: Pixel proactively called `memory_search` (twice) before answering "what do you remember about me?" — demonstrated the doctrine is working
- Auto-commit will fire on next extraction interval (5th message from any user)

**Lesson:** The best approach to multi-layer memory is not "prompt the LLM to choose the right tool" — it's "automate the pipeline for writes, prompt for proactive reads." Writes should be deterministic (every Nth message → pgvector + OpenViking). Reads should be guided by doctrine (search before asking, search when referencing past). The LLM's job is to decide *when to recall*, not *when to store*.

### Session 59: Subject-Based Memory + Identity Graph Seed

**Problem:** Even after Session 58, memory continuity was still fragmented by platform-specific ids. The same human on Telegram, WhatsApp, Nostr, and Twitter would be remembered as separate subjects. Group chats were improved, but there was still no canonical person/group/self subject model underneath the memory systems.

**Constraint:** Needed a pragmatic first step, not a giant schema rewrite. Repo already had an unused `user_links` table stub in `db.ts` and boot SQL, so the minimal viable identity graph could be built on top of that.

**Solution:**
1. **New identity service** (`src/services/identity.ts`)
   - `resolveCanonicalSubject(subjectId)` resolves any subject id to a canonical subject id plus aliases using `user_links`
   - `linkSubjects(a, b)` links two subject ids into one canonical subject
   - Subject types are inferred minimally: `person`, `group`, `self`

2. **Memory read/write path now canonicalizes subjects**
   - `memorySave()` resolves `userId` to canonical subject before saving
   - alias list is stored in memory metadata (`aliases`, `subject_type`)
   - consolidation checks now match across aliases, not just the raw connector id
   - `memorySearch()` searches across all aliases for the canonical subject
   - `getRelevantMemories()` prompt injection now pulls latest memories across aliases too

3. **OpenViking runtime now follows canonical subject ids**
   - `commitToOpenViking()` resolves to canonical subject before choosing session/user namespace
   - `recallFromOpenViking()` also resolves canonical subject before searching `viking://user/...`
   - Result: once identities are linked, OpenViking traces and pgvector facts converge on the same subject namespace instead of forking forever

4. **Admin-only identity tools** (`src/services/tools.ts`)
   - `resolve_identity` — inspect canonical subject + aliases
   - `link_identity` — link two subject ids into one canonical subject
   - These are admin-only by runtime check (`isGlobalAdmin`) and not listed in public tool tier, so public users cannot mutate identity graph

5. **Group memory hygiene from earlier patch retained**
   - group chats do not write `memory.md` as if they were a person
   - Telegram + WhatsApp groups both get lore summary injection and summary updates

**Verification:**
- Container rebuilt and healthy
- `resolve_identity` chat test returned `syntropy-admin` as its own canonical subject with no aliases
- No boot/runtime errors from new identity service
- Memory system still initialized cleanly with existing 357 active memories

**Important limitation still remaining:** this is only the **seed** of the identity graph. Nothing auto-links users yet. Cross-connector continuity now has a substrate, but it still requires explicit linking (manual/admin/tool-driven) until we add stronger entity extraction and alias-claim workflows.

**Lesson:** The threshold from “many memory tools” to “coherent memory” is a canonical subject layer. Without it, every connector creates a new fake person. With it, reads/writes can converge even before the higher-level social graph is fully built.

### Session 60: Conservative Identity Link Suggestions + Stable Twitter IDs

**Problem:** Session 59 created the canonical subject substrate, but linking was still completely manual. Also, Twitter mentions were using `twitter-${username}` as conversation id, which is mutable and therefore a bad long-term identity anchor.

**Solution:**
1. **Stable Twitter subject ids**
   - Twitter mention handling now uses `twitter-${authorId}` for conversation identity, not username
   - Display name still includes `@username` for readability, but identity now hangs off the immutable author id

2. **Richer display-name capture for identity heuristics**
   - `promptWithHistory()` now accepts `displayName`
   - `trackUser()` gets that display name at the point of interaction
   - Telegram DM batch flush passes DM contact name
   - WhatsApp DM flows pass `pushName`
   - Nostr mention/DM flows pass short pubkey-based labels (weak but better than blank)

3. **Conservative suggestion engine** (`suggestIdentityLinks()` in `identity.ts`)
   - scans active `users` rows with non-null display names
   - excludes group ids
   - compares normalized display names across different platforms only
   - rejects weak/generic names (`someone`, `user-123`, long hex/pubkey-ish strings, long digit strings)
   - skips subjects already in the same canonical set
   - returns suggestions with confidence + reason, but does **not** auto-link

4. **Admin-only suggestion tool**
   - `suggest_identity_links` lists conservative candidates
   - reviewed suggestions can then be applied with `link_identity`
   - still admin-only, not exposed to public tier

5. **Identity graph closure fix**
   - `resolveCanonicalSubject()` now walks transitive links, not just one hop
   - Example: if A↔B and B↔C, resolving C now returns aliases `{A,B,C}` instead of just `{B,C}`

6. **Duplicate-link safety**
   - boot now ensures `user_links_pair_idx`
   - `linkSubjects()` uses `ON CONFLICT DO NOTHING`

**Verification:**
- Container rebuilt and healthy
- `suggest_identity_links` executed successfully via chat API
- Current result: no conservative suggestions found yet, which is correct given current weak/fragmented display-name signals
- Logs show the tool executed normally and the system remained healthy

**Important interpretation:** “no suggestions found” is not failure. It means the heuristic is conservative enough to avoid hallucinated merges. This is preferable to corrupting the social graph with bad links.

**Lesson:** For identity linking, false positives are more dangerous than false negatives. Start with conservative suggestions, stable ids, and reviewable links. Only after that should we consider semi-automatic linking or user-claimed identity proofs.

### Session 61: User-Facing Claim-and-Confirm Identity Linking

**Problem:** Session 60 added suggestion tooling, but users still had no self-service way to prove that two accounts belonged to the same person. Manual/admin linking was too centralized.

**Solution:** implemented a public claim-and-confirm workflow:

1. **New persistence layer**
   - Added `identity_claims` table with: `code`, claimant subject/platform, target subject/platform, status, expiry, redemption timestamp
   - Boot now ensures `identity_claims_code_idx` unique index

2. **New identity claims service** (`src/services/identity-claims.ts`)
   - `createIdentityClaim(claimantUserId, claimantPlatform)` generates an 8-char hex claim code valid for 24h
   - `redeemIdentityClaim(code, targetUserId, targetPlatform)` redeems the code from another account, then links the two subjects via the canonical identity graph
   - `listIdentityClaims()` supports admin inspection/audit

3. **Public tools added**
   - `begin_identity_claim` — generate a code from the first account
   - `redeem_identity_claim` — redeem the code from the second account
   - Both reject group identities; they are for personal account linking only

4. **Admin audit tool added**
   - `list_identity_claims` — inspect recent claims and statuses

5. **Public tool tier updated** (`servers.json`)
   - `begin_identity_claim` and `redeem_identity_claim` added to `tool_tiers.public`
   - This means ordinary users can now link their own identities without admin intervention

6. **Prompt guidance added**
   - System prompt now explicitly tells Pixel to use claim flow when a user wants to link two accounts they control
   - Guardrail: never assume two accounts are the same person without explicit claim, admin link, or strong proof

**Verification:**
- Container rebuilt and healthy
- End-to-end test via HTTP chat API succeeded:
  1. `claim-a` generated a code via `begin_identity_claim`
  2. `claim-b` redeemed the code via `redeem_identity_claim`
  3. `resolve_identity` confirmed aliases `{claim-a, claim-b}` under the same canonical subject
  4. `list_identity_claims` showed the claim as `redeemed`

**Result:** Pixel now has a real user-facing cross-platform identity bridge. People can prove account ownership across connectors without blind merges or admin babysitting.

**Lesson:** The right identity-linking primitive is not guesswork, it’s possession. If you can generate a code on one account and redeem it on another, that is strong enough proof for safe linking without introducing centralized approval for every case.

### Session 62: Per-Member Group Memory + Better Nostr Display Signals

**Problem:** Group chats had lore summaries, but individual members inside groups were still mostly invisible to long-term memory unless the model explicitly saved facts manually. Also, Nostr user tracking still relied on weak synthetic display labels (`nostr:<pubkey prefix>`) rather than attempting real profile names.

**Solution:**
1. **Per-member group memory extractor** (`captureGroupMemberMemory()` in `agent.ts`)
   - New side-channel extraction path for group messages only
   - Takes stable member subject id, member name, group id/name, and raw message text
   - Heuristic gate first: only runs on self-revealing / durable-signal messages (`I`, `my`, `working on`, `me gusta`, `prefiero`, etc.) to avoid burning tokens on every trivial group line
   - Background LLM extracts 0-2 durable facts
   - Facts are saved via `memorySave()` under the **member’s own canonical subject**, not the group
   - Metadata includes originating group id/name and member name

2. **Connector wiring for stable member ids**
   - **Telegram groups:** group messages now call `captureGroupMemberMemory()` with member subject `tg-<from.id>` and sender name
   - **WhatsApp groups:** group messages now call `captureGroupMemberMemory()` with member subject `wa-<participant>` when participant id is available
   - This preserves the existing group lore summary path while adding member-specific memory in parallel

3. **Better Nostr display signals**
   - Added `getNostrDisplayName()` helper with 6h cache
   - Attempts `fetchProfile()` on the NDK user and uses `displayName`, then `name`, then `nip05`, then pubkey fallback
   - Nostr mentions and DMs now pass this real display signal into `promptWithHistory()` / `trackUser()` instead of only `nostr:<pubkey prefix>` placeholders

**Verification:**
- Container rebuilt and healthy
- No boot/runtime errors after connector changes
- Identity graph sanity check still passed (`claim-b` resolved to canonical `claim-a` with aliases intact)

**Important limitation still remaining:** group member extraction is message-level and heuristic-gated. It is intentionally conservative. It does not yet build a full role graph of group participants over time, but it stops losing obvious per-person facts that appear inside groups.

**Lesson:** group memory needs two layers: shared lore for the room, and personal memory for the people inside it. If you only summarize the room, everyone dissolves into background noise.

### Session 63: Inner-Life Decoupling + Coherence Surgery

**Problem:** Pixel's inner life only ran from `heartbeat.ts`, which meant it was indirectly gated by Nostr configuration and skipped whenever heartbeat rate limiting returned early. The organism's reflection loop was chained to one connector. There were also three smaller coherence leaks: newly created skills stayed inert until a later graph rebuild, Nostr public vs DM identities forked into separate subjects, and auto-harvested idea seeds stayed in `Ready` forever.

**Solution:**
1. **Inner life is now its own service** (`src/services/inner-life.ts`, `src/index.ts`)
   - Added `startInnerLife()` / `stopInnerLife()` with an independent timer
   - Boot now starts inner life directly, separate from heartbeat
   - Shutdown now stops inner life explicitly
   - Health output now includes `inner_life.running`
   - Heartbeat still consumes `getInnerLifeContext()` for post generation, but no longer executes inner-life cycles itself

2. **Skill creation now goes live immediately**
   - `maybeCreateSkill()` now calls `rebuildSkillGraph()` right after writing a new skill file
   - Result: no more waiting for claim derivation or container restart before a fresh skill enters prompt discovery

3. **Nostr DM/public identity split collapsed at normalization layer**
   - `normalizeSubjectId()` now rewrites `nostr-dm-<pubkey>` → `nostr-<pubkey>`
   - Result: memory and identity resolution converge automatically for the same human across mentions and DMs

4. **Idea garden harvest now actually retires harvested seeds**
   - `autoHarvestProjects()` now moves harvested `Ready` seeds out of the ready queue and records a note before re-rendering the garden
   - Result: no repeated re-harvesting of the same seed into projects

5. **`executeTool()` contract corrected**
   - The helper comment falsely claimed it only exposed safe read-only tools, but it actually executes against the full internal tool map
   - Updated the contract to match reality and mark it as trusted-runtime-only

**Verification:**
- Container rebuilt successfully
- `/health` shows `inner_life.running: true`
- Boot logs show both `[heartbeat] Starting...` and `[inner-life] Starting...` as separate services
- Chat API still responds normally after rebuild
- `resolve_identity` via chat confirmed `nostr-dm-abcdef1234567890` resolves canonically to `nostr-abcdef1234567890`
- Build succeeded inside `v2-pixel-1`; full `tsc --noEmit` OOM'd in-container, so runtime rebuild + health + chat verification was used as the production-truth check

**Lesson:** If a cognitive loop depends on one connector, it is not a true organismal loop. Inner life must have its own clock. Also: when a system claims to mutate itself (skills, ideas, identity), the mutation must become live immediately or the organism becomes a document writer instead of an adapting one.

### Session 64: Structured Project State + Syntropy Result Closure

**Problem:** Pixel's project queue still lived as free-form markdown. Even after Session 63, the queue could list intentions but had no durable lifecycle state. Syntropy dispatch was one-way: work could be sent out, but there was no native path for results to come back and change project state. That meant Pixel could still drift into document production instead of constraint resolution.

**Solution:**
1. **Structured project backing store** (`src/services/inner-life.ts`)
   - Added `projects.json` as a code-managed project state file behind `projects.md`
   - Markdown queue is now parsed into structured records with `id`, `title`, `kind`, `status`, `why`, `next`, timestamps, dispatch state, and outcome
   - `getInnerLifeStatus()` now reports `projectCount` and `activeProjects`
   - Added `getProjectState()` so the owner dashboard can inspect structured projects directly

2. **Owner API now exposes structured projects** (`src/index.ts`)
   - `/api/inner-life` now returns both raw `projects` markdown and `structuredProjects`
   - Result: the dashboard can show queue narrative and machine-readable state at once

3. **Syntropy result loop is now closed**
   - Added `syntropy-results.jsonl` ingestion inside `runInnerLifeCycle()`
   - Added `syntropy-results-state.json` cursor to avoid reprocessing the same lines
   - Syntropy dispatch message now includes `PROJECT_ID` and explicit instructions to append a result JSON line on completion/block/failure
   - Result entries update project status/outcome and prepend a learning entry so the organism internalizes implementation outcomes

4. **State retention hardening**
   - Completed/abandoned/blocked projects now survive markdown sync even if the LLM omits them from the visible queue
   - Syntropy result memory persistence is wrapped so a late-bound verification context cannot abort the whole result-ingestion path

**Verification:**
- Multiple rebuilds succeeded after patch/fix cycle
- `/health` shows `projectCount: 4` and `activeProjects` updates from structured state
- Seeded a synthetic Syntropy result JSON line for `project-vendor-voice-system`
- Live app ingested it: `projects.json` now marks `Vendor Voice System` as `completed`, sets `next: retired`, records `outcome`, and stores `completedAt`
- `learnings.md` now contains `syntropy result — Vendor Voice System ... implementation landed and verification passed`
- `syntropy-results-state.json` advanced to `processedLines: 1`

**Caveat discovered:** the current `projects.md` queue still uses simple bullets like `- **Vendor Voice System**: ...`, so parsed `kind` defaults to `general` unless the queue explicitly includes tags like `[implementation]` or `[active]`. The structured backing store works, but the LLM queue generator still needs to consistently emit tagged entries before dispatch behavior fully matches intent.

**Lesson:** A project loop only becomes real when outcomes mutate state. Markdown alone cannot carry accountability. The minimal viable closure is: canonical project id → dispatch → result file → status mutation → learning entry.

### Session 65: Explicit Project Tags + Project Control Surface

**Problem:** Session 64 created structured project state, but two usability gaps remained:
1. the queue generator still allowed loose markdown that parsed as `general` unless the model emitted tags consistently
2. there was no first-class control surface to inspect or mutate projects without manually editing files or faking Syntropy results

**Solution:**
1. **Project kind inference + canonical rendering** (`src/services/inner-life.ts`)
   - Added project-kind inference from title/why/next when old markdown lacks explicit tags
   - Added canonical markdown renderer so structured state can re-render `projects.md` as tagged entries like:
     - `[implementation][active]`
     - `[implementation][blocked]`
     - `[research][completed]`
   - Result: legacy queue text is normalized into a machine-readable/project-readable format

2. **Project controls in code** (`src/services/inner-life.ts`)
   - Added `updateProjectState()` export for targeted project mutations
   - Added persistence helpers that keep `projects.json` and rendered `projects.md` in sync
   - Blocked/completed/abandoned states now survive normalization and re-render cleanly

3. **Owner API project surface** (`src/index.ts`)
   - Added `GET /api/projects` for structured project inspection
   - Added `POST /api/projects/update` for direct owner-authenticated project mutation

4. **Admin project tools** (`src/services/tools.ts`)
   - `list_projects`
   - `update_project`
   - `complete_project`
   - Implemented with late-bound imports to avoid startup/module-cycle failures

**Verification:**
- Container rebuilt healthy after resolving a static-import cycle issue
- `getProjectState()` normalized legacy queue into correct kinds:
  - Vendor Voice / NSFW Safety / Agency Dashboard → `implementation`
  - WoT Integration for Nostr → `research`
- Live tool tests via `/api/chat` succeeded:
  - `list_projects` returned structured ids/statuses
  - `update_project` marked `project-agency-dashboard` as `blocked`
  - `complete_project` marked `project-wot-integration-for-nostr` as `completed`
- In-container `/app/data/projects.md` now renders canonical tagged entries with outcomes
- `projects.json` reflects the same status transitions and kinds

**Important note:** host-side reads of `v2/data/projects.md` lagged behind the in-container normalized file during verification, but the live container state, project JSON, and tool behavior were correct. Runtime truth is the container.

**Lesson:** Once structured state exists, the next bottleneck is control. A loop is only operable when the organism can not just infer project state, but inspect and mutate it through stable interfaces.

### Session 66: Observation Persistence Moved Out of Skills Tree

**Problem:** Raw friction observations were being written under `external/pixel/skills/arscontexta/ops/observations`, and inner-life derivation read from the same skills tree. That made the observations look like durable skill content when they were really runtime telemetry. It also meant the persistence model was muddled: observations survived only because `external/` was bind-mounted, not because they lived in the declared runtime state area.

**Solution:**
1. **Observation capture moved to persistent runtime storage**
   - `captureObservation()` in `src/agent.ts` now writes to `${INNER_LIFE_DIR}/observations` (container path `/app/data/observations`)
   - This matches the persistence doctrine: live mutable state belongs in `/app/data` or `/app/.pi`

2. **Inner-life derivation now reads/prunes the same persistent directory**
   - `deriveClaims()` in `src/services/inner-life.ts` now scans `/app/data/observations`
   - pruning continues there, so the write/read loop is aligned on one durable runtime path

3. **Documentation corrected**
   - `skills/index.md` and `skills/methodology/skill-evolution-protocol.md` now distinguish runtime observations from curated skills/claims

**Verification / important finding:**
- Before the patch, observations were **not** using the primary runtime persistence area; they were using the bind-mounted skills tree instead
- Before the patch, those observations were still actively read by inner-life derivation, so the path was **used**, not dead
- After the patch, observation write/read flow is unified under `/app/data/observations`, which is bind-mounted via `v2/docker-compose.yml`

**Lesson:** Runtime exhaust is not knowledge. If a file is generated continuously and mutated by the organism, store it in `/app/data`; only promote distilled claims into the skill graph.

### Session 67: Skill Graph Visibility + Duplicate Signals

**Problem:** The live skill graph was active, but external visibility was misleading. `/api/skills` only listed the shallow marketplace-style `/app/skills` directory, not the full arscontexta graph that Pixel actually uses. There was also no quick way to inspect duplicate or overlapping skill nodes.

**Solution:**
1. **Added real graph visibility**
   - New `GET /api/skill-graph` endpoint returns full graph stats from the live in-memory graph
   - Includes node count, index size, by-kind counts, top path prefixes, and sample claims

2. **Added duplicate signals**
   - `getSkillGraphDuplicateSignals()` in `src/services/skill-graph.ts`
   - Reports exact normalized title duplicates and high-overlap title pairs
   - Purpose is diagnostic visibility, not auto-pruning

**Verification / findings:**
- Live graph currently sits around `95 nodes / 184 index entries`
- Composition is observation-heavy (`51 observations`, `23 claims`, `15 notes`, `6 mocs`)
- Exact duplicate signal found for the expected `index` titles across MOCs
- No strong content-level duplicate pairs were detected among note/claim bodies in the cache sample

**Lesson:** A knowledge substrate needs observability. If the real graph is hidden behind a shallow endpoint, the operator will optimize the wrong layer.

### Session 68: Legacy Observation Tree Cleanup

**Problem:** Even after new observations moved to `/app/data/observations`, the historical `arscontexta/ops/observations` tree still sat inside the live skill graph. Result: the graph remained inflated by 51 raw observation nodes, making the substrate look larger than its curated claim density justified.

**Solution:**
1. **Legacy migration on inner-life startup**
   - `migrateLegacyObservations()` now moves old markdown files from `SKILLS_DIR/ops/observations` into `/app/data/observations`
   - exact duplicates already present in runtime storage are deleted from the legacy location instead of copied forever

2. **Manual admin migration endpoint**
   - Added `POST /api/skill-graph/migrate-observations` (admin/local only)
   - Runs migration, invalidates the in-memory skill graph cache, rebuilds, and returns updated stats/duplicate signals

3. **Skill graph cache invalidation exposed**
   - Added `invalidateSkillGraphCache()` so filesystem cleanup can force a fresh graph instead of serving stale cached counts

4. **Docs corrected**
   - `skills/index.md` now points runtime friction capture to `/app/data/observations/`

**Intent:** runtime exhaust leaves the skill graph; only curated claims/notes/MOCs should remain there.

**Lesson:** Moving future writes is not enough. If legacy exhaust remains in the indexed tree, the graph still lies about what the organism actually knows.
