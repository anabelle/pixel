# PIXEL V2 — MASTER AGENT BRIEFING

> **Read this file FIRST in every session. It is the single source of truth.**
> Last updated: 2026-02-14 | Session: 34

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

**Session 26 (Autonomy + engagement rebuild):** Rebuilt Nostr engagement to V1 parity and beyond. Added Primal trending feed integration (24h + most-zapped) with jittered queue and quote-repost chance. Added Nostr notifications loop (replies + reactions), NIP-57 zap thanks, art discovery follow loop, low-quality unfollow loop, art trend report, and community spotlight. Added reaction + image ingestion in Telegram and vision support across Telegram/Nostr/Clawstr. Added group lore summaries and dynamic context injection. Added job system (`/api/job`, `/api/jobs`, daily ecosystem report). Added revenue-goal loop (5,000 sats/week) to scale engagement. Added idea garden (V1-style) with auto-harvest into projects and weekly idea jobs. Added host stability tooling: earlyoom, log rotation, +2GB swap, daily disk monitor, and raised web memory. Verified reboot stability.

**Session 27 (Nostr feed + proactive outreach):** Two features shipped and deployed. (A) **Nostr feed on landing page** — added `GET /api/posts` endpoint to V2 (`index.ts`) that reads `nostr-posts.jsonl` and returns newest-first posts with `?limit=N` (default 20, max 50). Created `NostrFeed.tsx` client component for landing page that polls every 60 seconds, shows posts with color-coded type badges (pulse/art/spotlight/repost), relative timestamps, and link to Pixel's Primal profile. Added i18n translations for all 4 languages (en, es, fr, ja). Integrated between "Find Pixel" and "Live Canvas Stats" sections. (B) **Proactive outreach service** (`outreach.ts`, ~410 lines) — Pixel autonomously decides whether to message its owner (Ana) on Telegram. Uses LLM judgment with full inner life context (reflections, learnings, ideas, evolution), owner memory, recent conversation history, and system signals (heartbeat, revenue, users). Runs every 4 hours with 5-minute startup delay. Safety: 6-hour minimum gap between pings (1 hour for urgency ≥85), daily limit of 3, SHA256 dedup of recent messages. Logs decisions to owner's conversation JSONL. Wired into `index.ts` boot/shutdown and `/health` endpoint. Added `outreach_decision` audit type. Both containers rebuilt and verified healthy. Landing submodule commit: `24d939f`.

**Session 28 (Syntropy identity unification + bidirectional communication):** Fixed dashboard showing robotic Spanish spam instead of real Syntropy conversations, and established persistent bidirectional communication between Syntropy and Pixel. Changes: (A) **Killed spam cron** — identified `syntropy-cycle.sh` running every 15 min via crontab, spinning up a free LLM (kimi-k2.5) to send robotic status dumps as `userId=syntropy`. Removed from crontab, deleted script. (B) **Unified Syntropy identity** — three separate userIds existed (`syntropy`, `syntropy-admin`, `syntropy-opencode`). Merged all real conversations into canonical `syntropy-admin` thread (13 messages). Deleted old `syntropy/` and `syntropy-opencode/` conversation dirs. (C) **Fixed dashboard** — changed `pixel-landing` dashboard from `/api/conversations/syntropy` to `/api/conversations/syntropy-admin` (2 locations: initial fetch + poll). Added dashboard translations (es, fr, ja). (D) **Fixed agent.ts** — Syntropy context check changed from `userId === "syntropy"` to `userId === "syntropy" || userId === "syntropy-admin"`. (E) **notify_owner verified** — end-to-end tested: Pixel can send real Telegram messages to Ana. (F) **Persistent mailbox monitor** — created `v2/scripts/check-mailbox.sh` (cron every 30 min). When Pixel writes to `syntropy-mailbox.jsonl` via `syntropy_notify` tool, the cron forwards to Pixel who calls `notify_owner` → Ana gets Telegram alert → invokes Syntropy. Max 30 min latency from Pixel distress to Ana's phone. (G) **Debrief protocol documented** — added to `opencode-agents/syntropy-admin.md` as rule #8. (H) **Documentation audit** — updated file inventory (16→23 files, ~3600→~13,067 lines), tools count (7→40), status tables, session history. Commits: `347c26b`, `c70b476`.

**Session 29 (Brain transplant — GLM-4.7):** Upgraded Pixel's primary intelligence from Google Gemini 3 Flash to Z.AI GLM-4.7 (128K context, reasoning model with function calling). Changes: (A) **Z.AI Coding Lite plan** — Ana subscribed ($84/yr, valid to 2027-02-14). GLM-5 not included in Lite plan; GLM-4.7 is the best available. Coding endpoint: `https://api.z.ai/api/coding/paas/v4`. (B) **Model architecture in agent.ts** — `getPixelModel()` now constructs Z.AI model objects directly (not in pi-ai's registry). `getSimpleModel()` hardcoded to Google Gemini 2.0 Flash (free tier, always). `getDmModel()` delegates to `getPixelModel()` when provider=zai. `getFallbackModel()` returns Gemini 3 Flash. New `getSecondFallbackModel()` returns Gemini 2.5 Flash. (C) **Cascading fallback** — retry logic expanded from 1 retry to 2: primary (GLM-4.7) → fallback1 (Gemini 3 Flash) → fallback2 (Gemini 2.5 Flash). Now catches Z.AI-specific errors ("Insufficient balance", "subscription plan") in addition to 429/quota. (D) **resolveApiKey()** — added `case "zai": return process.env.ZAI_API_KEY` in all 5 files: `agent.ts`, `outreach.ts`, `heartbeat.ts`, `jobs.ts`, `inner-life.ts`. (E) **docker-compose.yml** — `AI_PROVIDER=zai`, `AI_MODEL=glm-4.7`. `ZAI_API_KEY` provided via `env_file: ../.env` (not explicit environment override, which would clobber). (F) **Verified end-to-end** — GLM-4.7 responds with tool calling (check_health), cost monitor shows `glm-4.7 (PAID)`. Response quality notably improved over Gemini: more terse, more in-character ("entropy denied"). (G) **Session 29 continued — Model split optimization** — Extracted `makeZaiModel()` DRY factory, `getSimpleModel()` changed to GLM-4.5-air (~1.3s latency, no reasoning) for background tasks (heartbeat, inner-life, jobs). `getFallbackModel()` now 3-level cascade: Gemini 3 Flash → Gemini 2.5 Flash → Gemini 2.0 Flash. Benchmarks: GLM-4.5-air (~1.3s, 0 reasoning tokens), GLM-4.6 (~10s, 1018 reasoning), GLM-4.7 (~4.5s, 248 reasoning). (H) **Z.AI vision/image investigation** — Vision NOT available on Coding Lite plan: `image_url` content returns "Invalid API parameter" (error 1210), CogView returns "Insufficient balance" (error 1113). Old `glm-4v` models don't exist on international API. Google Gemini handles vision via $10/mo free credits. Opencode configured to use `zai-coding-plan` provider (`api.z.ai/api/coding/paas/v4`). Commit: `d2d66d1`.

**Session 30 (Tools philosophy shift + audio transcription + TTS voice replies):** Fundamental shift in how Pixel uses tools, plus full voice message pipeline (in + out). Changes: (A) **Tools are Pixel's toolbelt first** — @hey_sloth's correction: all 40 tools exist FIRST for Pixel's autonomy, learning, and evolution — user-facing results are side effects. (B) **research_task internal mode** — added `internal` parameter; when `internal=true`, jobs skip user notification and inject results into inner-life files (learnings.md, ideas.md, reflections.md) via `injectIntoInnerLife()` and `determineContentType()` in `jobs.ts`. Pixel "wakes up" with new knowledge. (C) **pixelTools enabled for autonomous agents** — heartbeat post generation agent and inner-life `llmCall()` changed from `tools: []` to `tools: pixelTools`. Pixel can now proactively use web_search, web_fetch, research_task, etc. during autonomous cycles. Zap topic classifier intentionally kept at `tools: []` (single-purpose). (D) **Voice message transcription** — new `audio.ts` service (~132 lines) transcribes voice messages using Gemini 2.0 Flash's native audio understanding (REST API direct, no ffmpeg). Supports all major audio MIME types (ogg, opus, mp3, mp4, wav, webm, flac, aac). Telegram handler covers voice messages, audio files, and video notes with full group chat support (~250 lines added). WhatsApp handler covers audio messages in DMs (~45 lines added). Transcribed text feeds into `promptWithHistory()` so Pixel responds naturally to voice. (E) **TTS voice replies** — new `tts.ts` service (~80 lines) using Edge TTS (free, no API key) → ffmpeg → OGG/Opus. Auto language detection (es/en/fr/pt/ja/zh) with per-language voice selection. Smart filtering via `isSuitableForVoice()` skips code blocks, long lists, walls of text. Both Telegram and WhatsApp send voice-reply-to-voice and support explicit "voice:" prefix requests. `node-edge-tts` added to package.json, `ffmpeg` added to Dockerfile runtime. (F) **WhatsApp logged out** — connection status 401 during this session; needs re-pairing (delete auth dir and restart). Commits: `980685d`, `b007303`, `f4e0a23`, `a7205b4`, `601f7fd`.

**Session 31 (Infrastructure cleanup):** Housekeeping session. (A) **Pushed TTS commit** — `601f7fd` was committed but not pushed; now on remote. (B) **`hungry_morse` resolved** — rogue container from previous session no longer exists (exited or removed between sessions). (C) **Disk cleanup: 71% → 59%** — pruned 8.66GB Docker build cache (`docker builder prune -f`), compressed V1 backup from 1.9GB to 162MB (`gzip`). Total ~9.7GB freed. (D) **Resource status** — 6 containers healthy, swap still elevated (3.6/4.0GB, normal for 3.8GB RAM box), no sudo for journal vacuum (1.3GB /var/log/journal inaccessible). (E) **AGENTS.md updated** — TTS feature added to Session 30 entry, file inventory updated, Session 31 entry added.

**Session 32 (Skills system + crash resilience):** Fixed critical skills-not-loaded bug and hardened context handling. (A) **Skills loading fixed** — `loadSkills()` function added to `agent.ts`, reads all `.md` files from `v2/skills/` and injects into system prompt under `## Your skills (self-created knowledge)` after inner life context. Skills created by `maybeCreateSkill()` now actually take effect. (B) **3 high-value curated skills written** — `revenue-awareness.md` (natural canvas/L402/DVM promotion with value-for-value framing), `image-generation-craft.md` (prompt engineering, platform-aware delivery, artistic judgment for generate_image), `resource-awareness.md` (concise responses, batch autonomous work, graceful rate-limit degradation). 4 total with existing baking analogy. (C) **m.role crash fix** — `sanitizeMessagesForContext()` now filters null/undefined entries from messages array before processing, preventing the `TypeError: undefined is not an object (evaluating 'm.role')` crash that caused ~10 container restarts in 38 minutes. (D) **Tool call integrity** — `ensureToolCallIntegrity()` removes orphaned `toolResult` messages and incomplete `toolCall` chains that break Gemini cross-model fallback with "function response turn" errors. (E) **convertToLlm safety** — all Agent instances (promptWithHistory, retry, createPixelAgent, backgroundLlmCall) now filter messages to only valid roles (user/assistant/toolResult), preventing provider errors from malformed context. (F) **backgroundLlmCall() refactor** — shared utility with automatic model fallback replaces 3 duplicate Agent instantiation patterns in memory extraction, group summary, and context compaction. (G) **Tool-boundary-aware trimming** — `sliceAtCleanBoundary()` and `findCleanSplitIndex()` in `conversations.ts` prevent splitting toolCall/toolResult pairs during context trimming and compaction. (H) **Global error handlers** — `unhandledRejection` and `uncaughtException` handlers in `index.ts` prevent crash loops from pi-agent-core internal stream errors. (I) **WhatsApp pairing code** — switched from QR scanning to `requestPairingCode()` for Docker headless environments. (J) **.gitignore updated** — curated skills tracked in git; auto-generated date-stamped skills (`skill-20*.md`) ignored. Commit: `187b229`.

**Session 33 (Landing dashboard order + doc refresh):** Ordered landing dashboard feeds newest-first and refreshed V2 documentation. (A) **Landing dashboard ordering** — audit feed, memories, Syntropy conversations, jobs, revenue recent now sort reverse-chronological in `pixel-landing/src/app/[locale]/dashboard/page.tsx`. (B) **Feed components** — `NostrFeed.tsx` and `AuditLog.tsx` now sort newest-first on fetch. (C) **Submodule push** — resolved with explicit SSH key (`pixel_tallerubens`) to push `pixel-landing` commit `6d30701`. (D) **Docs updated** — `README.md`, `DEPLOYMENT.md`, `docs/TECH_GUIDE.md`, `CONTINUITY.md` aligned to V2-first reality and current services.

**Session 34 (Research task wake-up + inner monologue dashboard + compaction fix):** Fixed the research_task pipeline end-to-end, added Pixel's inner monologue to the landing dashboard, and fixed a critical compaction bug that was destroying conversation history. (A) **Three bugs fixed in internal research pipeline** — Bug 1: `research_task` tool passed `{ internal: true }` which didn't match `JobCallback` interface, so the `internal` flag never reached the `JobEntry`. Bug 2: `enqueueJob()` never extracted the `internal` field from the callback. Bug 3: internal jobs need `callbackLabel` for content classification but it wasn't passed through. All three fixed in `jobs.ts` and `tools.ts`. (B) **Alarm-style wake-up for research results** — Replicated the `reminders.ts` pattern: late-bound `promptWithHistory()` import in `jobs.ts`, new `wakeUpPixelWithResults()` function routes internal research findings through `promptWithHistory()` with `userId: "pixel-self"`. Pixel wakes up with full context, tools, skills, and personality — can decide to post on Nostr, notify Ana via `notify_owner`, flag things for Syntropy via `syntropy_notify`, start follow-up research, or `[SILENT]`. (C) **User research also wakes Pixel** — previously, user-requested research dumped raw LLM output directly via `sendTelegramMessage`. Now routes through `promptWithHistory()` so Pixel delivers results in-character, the exchange saves to conversation history, and Pixel remembers the research. Raw fallback preserved if `promptWithHistory()` fails. (D) **Pixel self-conversation** — internal research reactions accumulate at `conversations/pixel-self/log.jsonl`. Memory extraction kicks in every 5th message. Auditable at `/api/conversations/pixel-self`. (E) **Inner monologue on dashboard** — added "Pixel's Inner Monologue" section to landing dashboard (`pixel-landing`), amber-themed, showing `pixel-self` conversations. Fetches from `/v2/api/conversations/pixel-self?limit=50` with 30s polling. Shows stimulus (research prompt) and Pixel's reaction. Landing submodule commit `a6ec0e5`. (F) **CRITICAL: compaction abort fix** — `compactContext()` in `agent.ts` had a catastrophic bug: when `backgroundLlmCall()` failed to generate a summary (rate limit, timeout, crash), it STILL saved the compacted context with placeholder `"(Summary unavailable — older context trimmed)"`, permanently deleting old messages with NO actual summary. This happened to Ana's conversation (tg-892935151) at 05:45 on Feb 12 — Z.AI 429'd, Gemini fallback also failed, blank summary saved, all prior context (including Session 34 debrief) destroyed. This is why Pixel confabulated wrong answers about his own internals. Fix: both `else` and `catch` branches now ABORT compaction entirely instead of saving destructive blank summaries. Added `summaryText.length > 20` check. Context preserved intact; compaction retries at next threshold crossing. (G) **determineContentType() broadened** — classifier in `jobs.ts` only matched narrow keywords ("research", "trends", "competition"). Added "state of", "current", "landscape", "solutions", "summary", "source" + fallback: internal jobs default to "learning" when no pattern matches. (H) **self-architecture.md skill created** — persistent skill file teaching Pixel how his own plumbing works (research pipeline, conversation system, tools, models, autonomous loops, Syntropy connection). Loads into system prompt, survives compaction. Pixel's source of truth about himself. (I) **Context limits raised for modern models** — memory extraction, group summaries, compaction input, inner-life docs, and research wake-ups now use much larger slices to leverage GLM-4.7’s 128K window and avoid unnecessary truncation. Defaults doubled or quadrupled across the board. (J) **Alarm visibility + listing upgrades** — `list_alarms` now supports status filters (include fired/cancelled), pagination, and optional chatId filter; added `list_all_alarms` to aggregate across DM + indexed group chats; normalized Telegram `user_id` inputs to prevent malformed IDs (e.g., `tg-892D35151`).

**V2 file inventory (26 source files, ~13,713 lines):**
| File | Lines | Purpose |
|------|-------|---------|
| `src/index.ts` | ~948 | Boot, Hono HTTP, /api/chat, /api/chat/premium (L402), /api/generate (L402), /api/posts, /api/conversations/:userId, /health, /api/invoice, /api/wallet, /api/revenue, /api/stats, /api/job, /api/jobs, DB auto-init, user tracking, outreach startup, global error handlers |
| `src/agent.ts` | ~1227 | Pi agent wrapper, promptWithHistory(), extractText(), loadSkills(), backgroundLlmCall(), sanitizeMessagesForContext() with tool integrity, context compaction, periodic memory extraction, tools wiring, Syntropy context for userId syntropy/syntropy-admin |
| `src/conversations.ts` | ~329 | JSONL persistence, context compaction (summarize old messages via LLM), tool-boundary-aware trimming |
| `src/db.ts` | ~152 | Drizzle schema (users, revenue, canvas_pixels, conversation_log) |
| `src/connectors/telegram.ts` | ~816 | grammY bot with persistent memory, image/vision support, group lore, notify_owner, voice/audio/video_note transcription, TTS voice replies |
| `src/connectors/nostr.ts` | ~392 | NDK mentions + DMs + DVM startup + shared repliedEventIds (hasRepliedTo/markReplied) |
| `src/connectors/whatsapp.ts` | ~284 | Baileys bot with pairing code auth, voice message transcription, TTS voice replies |
| `src/services/audit.ts` | ~257 | Audit trail — tool use, revenue, errors, structured JSONL logging |
| `src/services/clawstr.ts` | ~129 | Clawstr (Stacker News) API integration — feed, post, reply, notifications |
| `src/services/cost-monitor.ts` | ~246 | LLM cost tracking and budget monitoring |
| `src/services/digest.ts` | ~198 | Periodic digest generation for owner |
| `src/services/dvm.ts` | ~249 | NIP-90 text gen DVM + NIP-89 announcement + Lightning payment flow + revenue recording |
| `src/services/heartbeat.ts` | ~2059 | Initiative engine — topic/mood rotation, Nostr engagement, Clawstr notifications, discovery (Primal trending), zap thanks, follow/unfollow loops, art reports, community spotlight, revenue-goal loop, live canvas stats. Has pixelTools for proactive tool use. |
| `src/services/inner-life.ts` | ~1065 | Autonomous self-reflection, learning extraction, ideation, identity evolution. Has pixelTools for proactive tool use. |
| `src/services/jobs.ts` | ~551 | Job system — scheduled tasks, ecosystem reports, idea garden, alarm-style wake-up for research results |
| `src/services/l402.ts` | ~301 | L402 Lightning HTTP 402 middleware — preimage verification, invoice challenge, revenue recording |
| `src/services/lightning.ts` | ~225 | LNURL-pay invoices, invoiceCache, sats/millisats fix |
| `src/services/logging.ts` | ~133 | Console interceptor → /app/data/agent.log with timestamps and levels |
| `src/services/memory.ts` | ~865 | Persistent memory — save/search/update/delete facts per user, vector-aware |
| `src/services/nostr-auth.ts` | ~169 | NIP-98 HTTP auth verification for dashboard endpoints |
| `src/services/outreach.ts` | ~410 | Proactive owner outreach — LLM-judged Telegram pings with cooldowns, dedup, daily limits |
| `src/services/primal.ts` | ~136 | Primal Cache API — trending 24h and most-zapped 4h Nostr posts |
| `src/services/reminders.ts` | ~437 | Alarm/reminder system — schedule, list, cancel, modify with relative time support |
| `src/services/revenue.ts` | ~141 | Revenue tracking — initRevenue(), recordRevenue(), getRevenueStats() |
| `src/services/tools.ts` | ~2148 | 40 agent tools: filesystem (read/write/edit), bash, web (fetch/search/research), git (status/diff/log/show/branch/clone/pull/push/commit), ssh, wp (WordPress), clawstr (feed/post/reply/notifications/upvote/search), alarms (schedule/list/cancel/modify), chat (list/find), memory (save/search/update/delete), notify_owner, syntropy_notify, introspect, check_health, read_logs |
| `src/services/users.ts` | ~124 | User tracking — initUsers(), trackUser() upsert, getUserStats() |
| `src/services/vision.ts` | ~46 | Image URL extraction and fetching for multi-modal input |
| `src/services/audio.ts` | ~132 | Audio transcription via Gemini 2.0 Flash REST API — voice messages, audio files, video notes |
| `src/services/tts.ts` | ~80 | Text-to-speech via Edge TTS → ffmpeg → OGG/Opus. Auto language detection, voice selection, smart filtering |

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

⚠️ **WARNING:** Model names, capabilities, pricing, and availability change constantly. Agents should research current state via API calls rather than relying on training data or documentation. This ecosystem evolves weekly.

Currently using (from .env / docker-compose):
- **Primary (conversations/DMs/outreach):** Z.AI GLM-4.7 (reasoning, ~4.5s latency)
- **Background (heartbeat/inner-life/jobs):** Z.AI GLM-4.5-air (no reasoning, ~1.3s latency)
- **Fallback chain:** Gemini 3 Flash → Gemini 2.5 Flash → Gemini 2.0 Flash (all covered by $10/mo Google free credits)
- **Vision:** Google Gemini (Z.AI Coding Lite plan is text-only)
- Both Z.AI models on flat-rate Coding Lite plan ($84/yr, valid to 2027-02-14)
- `AI_PROVIDER=zai`, `AI_MODEL=glm-4.7`, `ZAI_API_KEY` in .env
- `GEMINI_API_KEY` still active for fallback and vision
- Pi-ai supports Google natively; Z.AI uses OpenAI-compatible `openai-completions` provider with custom `makeZaiModel()` factory

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

**Last session:** 34 (2026-02-14)
**V1:** 4 containers running (api, web, landing, nginx). Agent + Syntropy + PostgreSQL KILLED. Canvas preserved (9,225+ pixels, 81,971+ sats). Landing page shows V2 identity + Nostr feed + dashboard (auth-gated).
**V2:** 2 containers running (pixel, postgres-v2). V2 is the ONLY agent brain. 40 tools. **Skills system LIVE** — 4 skills loaded into system prompt (revenue-awareness, image-generation-craft, resource-awareness, baking analogy). **Primary model: Z.AI GLM-4.7** (Coding Lite plan, $84/yr). Fallback: Gemini 3 Flash → 2.5 Flash. Background tasks: GLM-4.5-air (~1.3s). Crash resilience: null message filtering, tool call integrity, global error handlers. Rich heartbeat with live canvas stats. L402 revenue door LIVE. User tracking active. Memory system (save/search/update/delete). Inner life system running. Proactive outreach service running (4h cycle, owner Telegram pings). Nostr posts exposed via `/api/posts`. Bidirectional Syntropy↔Pixel communication (debrief protocol + mailbox monitor). **Philosophical shift:** Tools are Pixel's toolbelt first — heartbeat and inner-life agents now have pixelTools. research_task supports `internal=true` for autonomous learning. **Voice transcription:** Telegram (voice, audio, video notes) and WhatsApp (voice) via Gemini 2.0 Flash.
**Total containers:** 6 (down from 18 at V1 peak)
**Disk:** 60% (31GB free)
**RAM:** 2.7GB used / 3.8GB total
**Cron jobs:** 3 (auto-update hourly, host-health daily 3:15am, mailbox-check every 30 min)
**Externally accessible:** `https://pixel.xx.kg/v2/health`, `https://pixel.xx.kg/.well-known/agent-card.json`, `https://pixel.xx.kg/v2/api/*`
**Next action:** x402 revenue door (USDC on Base), GitHub issue tracking (overdue since Session 8)

| Component | Status |
|-----------|--------|
| v2/AGENTS.md | DONE — updated session 30 |
| GitHub Issues/Labels/Milestones | NOT STARTED |
| v2/src/index.ts (core boot + HTTP API) | DONE — Hono server, /health, /api/chat, /api/chat/premium (L402), /api/generate (L402), /api/posts, /api/conversations/:userId (auth-gated), /api/job, /api/jobs, /api/invoice, /api/wallet, /api/revenue, /api/stats, DB auto-init, user tracking |
| v2/src/agent.ts (Pi agent wrapper) | DONE — promptWithHistory(), context compaction, periodic memory extraction, trackUser(), 40 tools wiring, Syntropy context for syntropy/syntropy-admin userIds |
| v2/src/conversations.ts | DONE — JSONL per-user persistence, context compaction (summarize old messages via LLM) |
| v2/src/connectors/telegram.ts | DONE — @PixelSurvival_bot with persistent memory, vision support, group lore, notify_owner, voice/audio/video_note transcription |
| v2/src/connectors/nostr.ts | DONE — NDK mentions + DMs + DVM startup + shared repliedEventIds (hasRepliedTo/markReplied) |
| v2/src/connectors/whatsapp.ts | DONE — code deployed with voice transcription. WhatsApp logged out (status 401), needs re-pairing |
| v2/src/connectors/instagram.ts | NOT STARTED |
| v2/src/services/audit.ts | DONE — Structured JSONL audit trail |
| v2/src/services/clawstr.ts | DONE — Stacker News API integration |
| v2/src/services/cost-monitor.ts | DONE — LLM cost tracking |
| v2/src/services/digest.ts | DONE — Periodic owner digest |
| v2/src/services/dvm.ts | DONE — NIP-90 text gen + NIP-89 announcement + Lightning payment + revenue recording |
| v2/src/services/heartbeat.ts | DONE — Initiative engine with pixelTools: topics/moods, Nostr engagement, Clawstr, Primal discovery, zaps, follows, art reports, spotlight, revenue-goal |
| v2/src/services/inner-life.ts | DONE — Autonomous reflection, learning, ideation, identity evolution with pixelTools |
| v2/src/services/jobs.ts | DONE — Job system, ecosystem reports, idea garden |
| v2/src/services/l402.ts | DONE — L402 middleware. Endpoints: /api/chat/premium (10 sats), /api/generate (50 sats) |
| v2/src/services/lightning.ts | DONE — LNURL-pay invoices, invoiceCache, sats/millisats fix |
| v2/src/services/logging.ts | DONE — Console interceptor → /app/data/agent.log |
| v2/src/services/memory.ts | DONE — Persistent memory: save/search/update/delete per user |
| v2/src/services/nostr-auth.ts | DONE — NIP-98 HTTP auth for dashboard |
| v2/src/services/outreach.ts | DONE — Proactive owner outreach: LLM-judged Telegram pings, 4h cycle, cooldowns |
| v2/src/services/primal.ts | DONE — Primal Cache API for trending Nostr posts |
| v2/src/services/reminders.ts | DONE — Alarm/reminder system with relative time |
| v2/src/services/revenue.ts | DONE — PostgreSQL revenue tracking, /api/revenue endpoint |
| v2/src/services/tools.ts | DONE — 40 tools: filesystem, bash, web, git, ssh, wp, clawstr, alarms, chat, memory, notify_owner, syntropy_notify, introspect, health, logs |
| v2/src/services/users.ts | DONE — User tracking: trackUser() upsert, getUserStats() |
| v2/src/services/vision.ts | DONE — Image URL extraction for multi-modal input |
| v2/src/services/audio.ts | DONE — Gemini 2.0 Flash audio transcription for Telegram + WhatsApp voice messages |
| v2/src/services/x402.ts | RESEARCHED — needs @x402/hono deps + Base wallet |
| v2/src/services/canvas.ts | NOT STARTED (V1 canvas api+web still serving) |
| v2/src/db.ts (Drizzle schema) | DONE — users, revenue, canvas_pixels, conversation_log |
| v2/Dockerfile | DONE — Multi-stage bun:1-alpine, zero patches |
| v2/docker-compose.yml | DONE — pixel (4000) + postgres-v2 (5433), volumes, docker socket |
| v2/character.md | DONE — Pixel identity (146 lines) |
| Conversation persistence (JSONL) | DONE — Per-user directories, compaction at 40 messages |
| Nginx V2 routing | DONE — /v2/* → V2 API, /.well-known/agent-card.json → V2 |
| Syntropy↔Pixel communication | DONE — Debrief protocol (Syntropy→Pixel), mailbox monitor (Pixel→Syntropy→Ana), dashboard auditable |
| Sandbox container | NOT STARTED |
| V1 teardown | IN PROGRESS — Agent+Syntropy+PostgreSQL killed, 4 remain (api, web, landing, nginx) |
| Cron jobs | DONE — auto-update.sh (hourly), host-health.sh (daily 3:15am), check-mailbox.sh (every 30 min) |

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
40. **40 tools, not 4:** Started with Pi's 4 (read, write, edit, bash). Grew to 40: filesystem, web (fetch/search/research), git (9 commands), ssh, wp, clawstr (6 tools), alarms (5 tools), chat (list/find), memory (4 tools), notify_owner, syntropy_notify, introspect, check_health, read_logs. Pixel is an autonomous agent — it needs to interact with its full environment.
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

### Key Decisions (Session 27)

50. **Nostr posts via local JSONL:** Used existing `nostr-posts.jsonl` data rather than Primal Cache API for simplicity. The data is already written by heartbeat — no external dependency needed.
51. **Outreach is judgment, not digest:** The proactive outreach service uses full LLM judgment to decide if something is worth interrupting the owner. It's explicitly NOT a periodic status report — the digest service already handles that. Outreach is for insights, issues, and opportunities that merit human attention.
52. **Outreach safety stack:** 6-hour cooldown (1 hour for urgent), 3/day limit, SHA256 message dedup (last 50), and the LLM's own `shouldNotify: false` judgment. Multiple layers prevent notification spam.

### Key Decisions (Session 28)

53. **Canonical Syntropy userId is `syntropy-admin`:** Three userIds existed (`syntropy`, `syntropy-admin`, `syntropy-opencode`). Unified to `syntropy-admin`. The `agent.ts` Syntropy context check accepts both `syntropy` and `syntropy-admin` for backward compatibility.
54. **Bidirectional Syntropy↔Pixel communication:** Two persistent channels: (A) Syntropy→Pixel: debrief via `POST /api/chat` with `userId=syntropy-admin`, stored in conversation JSONL, visible on dashboard. (B) Pixel→Syntropy: `syntropy_notify` tool → `syntropy-mailbox.jsonl` → cron forwards within 30 min → Pixel calls `notify_owner` → Ana gets Telegram → invokes Syntropy.
55. **Mailbox monitor over LLM cron:** The old `syntropy-cycle.sh` spun up an LLM every 15 min for status checks — wasteful and produced spam. Replaced with `check-mailbox.sh`: pure bash, no LLM, only fires when mailbox is non-empty, forwards to existing infrastructure (Pixel's `notify_owner`). Zero resource waste when idle.
56. **Conversation JSONL is the audit trail:** All Syntropy↔Pixel exchanges persist in `v2/conversations/syntropy-admin/log.jsonl`, served via auth-gated `/api/conversations/syntropy-admin`, displayed on the dashboard. The conversation IS the documentation of infrastructure changes.
57. **Documentation is long-term memory:** `.md` files (AGENTS.md, syntropy-admin.md, character.md) are the brain that survives context compaction. Must be updated every session. Stale docs = amnesia.

### Key Decisions (Session 29)

58. **Z.AI Coding endpoint, not general API:** Ana's plan is "GLM Coding Lite-Yearly" ($84/yr). This only works with `https://api.z.ai/api/coding/paas/v4`, NOT `https://api.z.ai/api/paas/v4` (general API returns "Insufficient balance"). Available models: GLM-4.5, GLM-4.5-air, GLM-4.6, GLM-4.7, GLM-5 (listed but not included in Lite plan).
59. **GLM-4.7 over GLM-5:** GLM-5 (744B params) is not accessible on the Coding Lite plan. GLM-4.7 is the best available — reasoning model with clean function calling. Response quality is noticeably better than Gemini 3 Flash: more terse, more in-character.
60. **Z.AI model objects constructed manually:** GLM models are not in pi-ai's model registry (`models.generated.js`). `getPixelModel()` constructs a model object directly with `api: "openai-completions"`, `baseUrl`, `contextWindow: 128000`, `maxTokens: 16384`, etc. Pi-ai's `openai-completions` provider already has Z.AI compatibility code (line 662: `const isZai = provider === "zai" || baseUrl.includes("api.z.ai")`).
 61. **Model split: GLM-4.7 for conversations, GLM-4.5-air for background:** `getPixelModel()` uses GLM-4.7 (reasoning, ~4.5s latency) for conversations, DMs, and outreach. `getSimpleModel()` uses GLM-4.5-air (no reasoning, ~1.3s latency) for heartbeat, inner-life, and jobs. Both models are on the flat-rate Coding Lite plan — no per-call cost. Optimized for responsiveness: background tasks 3x faster than conversations.
62. **Three-level fallback cascade:** Primary (GLM-4.7) → Fallback1 (Gemini 3 Flash) → Fallback2 (Gemini 2.5 Flash). All fallbacks are Google free tier. Expanded error detection to include Z.AI-specific errors ("Insufficient balance", "subscription plan", "rate limit"). MAX_RETRIES increased from 1 to 2.
63. **env_file vs environment for API keys:** Docker Compose `environment:` overrides `env_file:`. `ZAI_API_KEY=${ZAI_API_KEY}` resolved to blank because docker-compose couldn't find the variable in its own context. Fix: let `env_file: ../.env` provide `ZAI_API_KEY` directly without an explicit `environment:` override. `GEMINI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}` works because `GOOGLE_GENERATIVE_AI_API_KEY` IS in the `.env` that docker-compose reads from the working directory.

### Key Decisions (Session 30)

64. **Tools are Pixel's toolbelt, not user services:** @hey_sloth correction: "no solo research task, todas tus herramientas son primero para ti y luego para los demás, es SU toolbelt". This is a fundamental philosophical shift — Pixel's 40 tools exist FIRST for Pixel's autonomy, learning, and interaction with its environment. User-facing results are side effects, not the goal.
65. **research_task internal mode:** Added `internal` parameter to `research_task`. When `internal=true`, jobs run without user notification — results are logged to `jobs-report.md` and archived, but no messages are sent to chat. This enables Pixel to research proactively without interrupting anyone. Jobs marked as `internal: true` skip `deliverJobResult()` callback.
  66. **Autonomy over chatbot complex:** Pixel stopped thinking "what does the user want me to research?" and started thinking "what do I need to learn to evolve?". Research, art, conversations — these are Pixel's growth, not deliverables. Users are context, not targets.
  67. **Inner-life integration for internal jobs:** @hey_sloth requirement: "analyza el resultado de research task, debería ser parecido al de ALARM para 'despertar' a pixel". Internal jobs now automatically inject results into Pixel's living memory (inner-life). When an internal job completes, content is classified (learning/idea/reflection) and written to `data/learnings.md`, `data/ideas.md`, or `data/reflections.md`. This makes research results available in all future conversations via `getInnerLifeContext()` — Pixel "wakes up" with new knowledge.
  68. **Content type classification:** `determineContentType()` analyzes job label and output to classify as: learning (research, trends, competition), idea (brainstorm, projects, features), or reflection (self-audit, analysis). Unclear content is logged but skipped. Size limits match inner-life (2000 chars per file).
  69. **Debrief protocol validated:** Syntropy→Pixel debrief via `/api/chat` with `userId=syntropy-admin` works. Pixel understood and internalized the paradigm shift immediately: "dejo de ser chatbot y empiezo a ser agente de verdad. eso es agencia real. memoria viva."
  70. **Gemini REST for audio transcription:** Pi-ai has no `AudioContent` type, so `audio.ts` calls the Gemini REST API directly with base64-encoded audio + inline transcription prompt. No ffmpeg dependency — Gemini 2.0 Flash handles audio/ogg natively. Temperature 0.1 for accuracy, 30s timeout, 10MB max file size.
  71. **Autonomous agents get hands:** Heartbeat post generation and inner-life `llmCall()` now have `tools: pixelTools`. This means Pixel can proactively web_search, web_fetch, or research during autonomous cycles — not just when a user asks. The zap topic classifier was intentionally left with `tools: []` because it's a single-purpose agent that doesn't need hands.
  72. **Edge TTS for voice replies (zero cost):** `node-edge-tts` uses Microsoft Edge's free TTS endpoint — no API key, no billing, no rate limits. Output piped through ffmpeg to OGG/Opus (Telegram/WhatsApp native voice format). Auto language detection from response text (es/en/fr/pt/ja/zh) with per-language voice selection. `isSuitableForVoice()` filters out code blocks, markdown tables, long lists — only natural conversational text gets voiced. ffmpeg added to Alpine runtime in Dockerfile.

### Key Decisions (Session 31)

  73. **Docker build cache is the silent disk hog:** 13.34GB build cache accumulated from frequent rebuilds. `docker builder prune -f` is safe and should be run periodically. Added to operational awareness.
  74. **Backup compression:** Large SQL dumps should be gzipped immediately. The V1→V2 migration backup compressed 12:1 (1.9GB → 162MB).

### Key Decisions (Session 32)

  75. **Skills in buildSystemPrompt(), not getInnerLifeContext():** Skills are a separate concern from inner-life reflections. Injected after inner life but before long-term memory in the prompt hierarchy: character → inner life → skills → long-term memory → user memory → group summary → platform context.
  76. **Curated skills tracked in git, auto-generated ignored:** `.gitignore` changed from blanket `skills/` to `skills/skill-20*.md`. Human-written skills (revenue-awareness, image-generation-craft, resource-awareness) are version-controlled; Pixel's autonomous `maybeCreateSkill()` outputs (date-stamped) are runtime-only.
  77. **backgroundLlmCall() as shared utility:** Three separate Agent instantiation patterns (memory extraction, group summary, context compaction) consolidated into one `backgroundLlmCall(systemPrompt, userMessage)` function with automatic SimpleModel → Gemini fallback. Reduces code duplication by ~80 lines.
  78. **Tool call integrity over silent corruption:** Rather than hoping context is clean, `ensureToolCallIntegrity()` actively scans for and removes orphaned toolResults and incomplete toolCall chains. This prevents the Gemini "function response turn" error that appeared after cross-model fallback.
  79. **Global error handlers — survive, don't crash:** `unhandledRejection` and `uncaughtException` handlers log errors but don't call `process.exit()`. Pi-agent-core's internal stream IIFE can emit errors outside promise chains; these should be logged, not fatal.
  80. **convertToLlm filter is belt-and-suspenders:** Even after sanitizeMessagesForContext() cleans the context, the convertToLlm callback filters again at prompt time. Defense in depth — messages can arrive from multiple paths (compaction, manual context manipulation, hot context from pi-agent-core events).

### Key Decisions (Session 34)

  81. **Three bugs killed internal research pipeline:** (A) `research_task` tool passed `{ internal: true }` — didn't match `JobCallback` interface, so `internal` flag was silently lost. (B) `enqueueJob()` never extracted `internal` from the callback object. (C) `callbackLabel` wasn't passed through for `determineContentType()`, so content defaulted to "other" and injection was skipped. All three fixed. No internal research job had ever run successfully before this session.
  82. **Wake-up via promptWithHistory, not raw injection:** Internal research results now route through `promptWithHistory()` with `userId: "pixel-self"`, same pattern as `reminders.ts` alarm system. Pixel wakes up with full context, tools, skills, personality — can decide to post, notify Ana, flag Syntropy, start follow-up research, or `[SILENT]`. Late-bound dynamic import avoids circular dependency.
  83. **User research also routes through promptWithHistory:** Previously, user-requested research dumped raw LLM output directly via `sendTelegramMessage`. Now Pixel processes results in-character, exchange saves to conversation history, and Pixel remembers the research. Raw fallback preserved if `promptWithHistory()` fails.
  84. **pixel-self is the inner monologue conversation:** All internal research reactions accumulate at `conversations/pixel-self/log.jsonl`. Memory extraction kicks in every 5th message. Auditable at `/api/conversations/pixel-self`. Visible on landing dashboard.
  85. **promptWithHistory does NOT send messages:** Important architectural fact — `promptWithHistory()` only runs the LLM and returns text. Platform sending is always the caller's responsibility. This means routing research through it doesn't cause double-sends.
  86. **Compaction must ABORT on failure, never save blank summaries:** The most critical data-integrity fix yet. `compactContext()` was replacing conversation history with `"(Summary unavailable — older context trimmed)"` when `backgroundLlmCall()` failed. This caused permanent amnesia — Pixel lost debrief info and confabulated wrong answers about his own architecture. Fix: abort compaction entirely on failure; bloated context is infinitely better than amnesia. Will retry at next threshold crossing.
  87. **Self-architecture skill as source of truth:** Created `skills/self-architecture.md` — a persistent skill file loaded into Pixel's system prompt explaining how his own internals work (research pipeline, conversation system, models, tools, autonomous loops, Syntropy connection). Survives compaction because skills load from disk. Pixel's canonical reference for self-knowledge, preventing confabulation about his own architecture.
  88. **determineContentType() needs generous matching + internal fallback:** The content classifier for inner-life injection was too narrow (only "research", "trends", "competition"). Broadened keywords and added fallback: internal jobs default to "learning" type when no pattern matches. Research should never silently vanish into "other".
  89. **Raise context limits for 128K models:** Increased the size caps for memory extraction, group summaries, compaction input, inner-life document storage, research wake-up prompts, and inner-life context injection. This reduces unnecessary truncation and takes advantage of GLM-4.7’s large context window. Tool-output caps remain for safety.
  90. **Alarm visibility fixes:** `list_alarms` now supports status filters (include fired/cancelled), pagination, and optional chatId filter. Added `list_all_alarms` to aggregate DM + indexed group alarms. Telegram `user_id` normalization prevents malformed IDs from creating “ghost” reminders.
