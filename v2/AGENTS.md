# PIXEL V2 — MASTER AGENT BRIEFING

> **Read this file FIRST in every session. Single source of truth.**
> Last updated: 2026-02-26 | Session: 55b

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
| Inner life | ✅ Running (reflect/learn/ideate/evolve on heartbeat cycles) |
| Outreach | ✅ 4h cycle, LLM-judged owner pings |
| Syntropy↔Pixel | ✅ Bidirectional (debrief + mailbox + cron monitor) |
| Autonomous dispatch | ✅ Headless Syntropy via cron |
| Canvas listener | ✅ Live — Socket.IO client, real-time pixel sale notifications, revenue recording |
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
