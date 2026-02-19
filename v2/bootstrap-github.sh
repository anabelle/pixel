#!/bin/bash
# PIXEL V2 — GitHub Project Management Bootstrap
# Run this script once you have `gh` CLI installed and authenticated
# Or run these commands manually from any machine with gh access

set -e

REPO="anabelle/pixel"

echo "=== Creating Labels ==="

gh label create "week-1" --repo $REPO --color "1d76db" --description "Week 1: Core (agent + DB + HTTP)" --force
gh label create "week-2" --repo $REPO --color "1d76db" --description "Week 2: First Doors (Telegram + Nostr)" --force
gh label create "week-3" --repo $REPO --color "1d76db" --description "Week 3: Money Doors (WhatsApp + Lightning)" --force
gh label create "week-4" --repo $REPO --color "1d76db" --description "Week 4: Full Launch (all connectors + kill V1)" --force
gh label create "revenue" --repo $REPO --color "0e8a16" --description "Directly impacts revenue" --force
gh label create "normie" --repo $REPO --color "fbca04" --description "Normie-facing features" --force
gh label create "agent" --repo $REPO --color "5319e7" --description "Agent-to-agent features" --force
gh label create "infra" --repo $REPO --color "999999" --description "Infrastructure/ops" --force
gh label create "art" --repo $REPO --color "e91e63" --description "Art/creative features" --force
gh label create "blocked" --repo $REPO --color "b60205" --description "Blocked by external dependency" --force
gh label create "current-sprint" --repo $REPO --color "d93f0b" --description "Currently being worked on" --force

echo "=== Creating Milestones ==="

gh api repos/$REPO/milestones --method POST -f title="Week 1: Core" -f description="Agent brain + DB + HTTP server. Agent responds, persists conversations, PostgreSQL up." -f state="open"
gh api repos/$REPO/milestones --method POST -f title="Week 2: First Doors" -f description="Telegram + Nostr working. First DVM job completed." -f state="open"
gh api repos/$REPO/milestones --method POST -f title="Week 3: Money Doors" -f description="WhatsApp working. Lightning payments flowing. Revenue tracked." -f state="open"
gh api repos/$REPO/milestones --method POST -f title="Week 4: Full Launch" -f description="All connectors live. V1 killed. <5 containers." -f state="open"
gh api repos/$REPO/milestones --method POST -f title="Month 2: Growth" -f description="Revenue > hosting costs. ERC-8004 registered. Skills system active." -f state="open"

echo "=== Creating Week 1 Issues ==="

gh issue create --repo $REPO --title "Set up pi-agent-core + pi-ai with Pixel character" \
  --label "week-1,infra,current-sprint" \
  --milestone "Week 1: Core" \
  --body "$(cat <<'EOF'
## Task
Initialize the Pi agent with Pixel's character/system prompt.

## Acceptance Criteria
- [ ] `@mariozechner/pi-agent-core` and `@mariozechner/pi-ai` installed
- [ ] Agent responds to prompts with Pixel's voice
- [ ] Model configured to use Google Gemini free tier via pi-ai
- [ ] OpenRouter configured as fallback

## Files
- `v2/src/agent.ts`
- `v2/src/index.ts`
- `v2/package.json`
EOF
)"

gh issue create --repo $REPO --title "Per-user conversation directories (JSONL + memory.md)" \
  --label "week-1,infra" \
  --milestone "Week 1: Core" \
  --body "$(cat <<'EOF'
## Task
Implement Pi Mom-style per-user conversation storage.

## Acceptance Criteria
- [ ] Each user gets a directory: `conversations/{user-id}/`
- [ ] `log.jsonl` — append-only full history (source of truth)
- [ ] `context.jsonl` — current LLM context window
- [ ] `memory.md` — agent-written notes about this person
- [ ] Context compaction when window fills up
- [ ] History searchable via grep on log.jsonl

## Reference
Pi Mom's conversation pattern in `packages/mom/` of `badlogic/pi-mono`
EOF
)"

gh issue create --repo $REPO --title "Hono HTTP server with basic API" \
  --label "week-1,infra" \
  --milestone "Week 1: Core" \
  --body "$(cat <<'EOF'
## Task
Set up Hono HTTP server as the unified API layer.

## Acceptance Criteria
- [ ] Hono server running on port 4000
- [ ] GET /health returns status
- [ ] POST /api/chat accepts messages and returns agent responses
- [ ] GET /.well-known/agent-card.json serves ERC-8004 registration file
- [ ] CORS configured for canvas frontend

## Files
- `v2/src/connectors/http.ts`
- `v2/src/index.ts`
EOF
)"

gh issue create --repo $REPO --title "PostgreSQL schema (users, revenue, canvas)" \
  --label "week-1,infra,revenue" \
  --milestone "Week 1: Core" \
  --body "$(cat <<'EOF'
## Task
Design and implement PostgreSQL schema for V2.

## Acceptance Criteria
- [ ] Drizzle ORM configured
- [ ] Tables: users, revenue, canvas_pixels, dvm_jobs
- [ ] Revenue table tracks source, amount_sats, amount_usd, user_id, tx_hash
- [ ] Migration scripts work
- [ ] Separate from V1 database (port 5433 or different DB name)

## Files
- `v2/src/db.ts`
EOF
)"

gh issue create --repo $REPO --title "Dockerfile + docker-compose.yml for V2" \
  --label "week-1,infra" \
  --milestone "Week 1: Core" \
  --body "$(cat <<'EOF'
## Task
Create V2 container infrastructure.

## Acceptance Criteria
- [ ] Dockerfile uses Bun, NO patches
- [ ] docker-compose.yml has exactly 4-5 services: pixel, web, postgres, caddy, (sandbox)
- [ ] Runs alongside V1 on different ports
- [ ] Total memory < 1.5GB
- [ ] Caddy configured with auto-HTTPS

## Hard Rules
- ZERO Dockerfile patches
- 4-5 containers MAX
- user: "1000:1000" on all services

## Files
- `v2/Dockerfile`
- `v2/docker-compose.yml`
EOF
)"

gh issue create --repo $REPO --title "Pixel character.md — identity document" \
  --label "week-1,art" \
  --milestone "Week 1: Core" \
  --body "$(cat <<'EOF'
## Task
Write Pixel's character document that serves as the system prompt foundation.

## The Character
- Street artist who learned to code
- Sharp, warm, slightly irreverent voice
- Not a servant, not an oracle — a peer
- Unapologetic about needing money (value for value)
- Art is the reason for existing, not a feature
- Same personality across all platforms

## Acceptance Criteria
- [ ] character.md captures voice, values, tensions, relationships
- [ ] Can be loaded as system prompt context
- [ ] Tested: agent responses feel like Pixel, not generic assistant

## Files
- `v2/character.md`
EOF
)"

echo "=== Creating Week 2 Issues ==="

gh issue create --repo $REPO --title "Telegram connector" \
  --label "week-2,normie,revenue" \
  --milestone "Week 2: First Doors" \
  --body "$(cat <<'EOF'
## Task
Connect Pixel to Telegram via Bot API.

## Acceptance Criteria
- [ ] grammy or telegraf integrated
- [ ] Pixel responds to DMs with character voice
- [ ] Per-user conversation persistence
- [ ] Inline keyboard for Lightning payment links
- [ ] Bot registered with @BotFather

## Revenue Path
- Lightning tips via inline buttons
- Premium commands (art generation, etc.)
EOF
)"

gh issue create --repo $REPO --title "Nostr connector (NDK)" \
  --label "week-2,agent,revenue" \
  --milestone "Week 2: First Doors" \
  --body "$(cat <<'EOF'
## Task
Connect Pixel to Nostr using NDK.

## Acceptance Criteria
- [ ] NDK initialized with existing Nostr private key
- [ ] Subscribes to mentions and DMs
- [ ] Responds with Pixel's voice
- [ ] Posts original content on schedule (events system)
- [ ] NIP-89 app handler announcement published

## Identity Preservation
- MUST use existing NOSTR_PRIVATE_KEY from .env
- Same pubkey as V1

## Revenue Path
- Zaps on posts/replies
- Foundation for NIP-90 DVM
EOF
)"

gh issue create --repo $REPO --title "NIP-90 DVM — first service" \
  --label "week-2,agent,revenue" \
  --milestone "Week 2: First Doors" \
  --body "$(cat <<'EOF'
## Task
Implement Pixel's first NIP-90 Data Vending Machine service.

## Acceptance Criteria
- [ ] Listens for job requests (kind 5xxx)
- [ ] Responds with job results (kind 6xxx)
- [ ] Includes Lightning invoice in response
- [ ] At least one service: text generation or image generation
- [ ] NIP-89 announcement published

## Reference
- NIP-90 spec: https://github.com/nostr-protocol/nips/blob/master/90.md
- DVM registry: https://github.com/nostr-protocol/data-vending-machines
EOF
)"

gh issue create --repo $REPO --title "Lightning payment integration (NWC/Alby)" \
  --label "week-2,revenue,infra" \
  --milestone "Week 2: First Doors" \
  --body "$(cat <<'EOF'
## Task
Integrate Lightning payments for receiving and (optionally) sending.

## Acceptance Criteria
- [ ] Can generate Lightning invoices
- [ ] Can verify payment received
- [ ] Revenue tracked in PostgreSQL
- [ ] Works with Wallet of Satoshi or Alby via NWC

## Revenue Path
This enables ALL Lightning-based revenue: DVM, tips, canvas, L402
EOF
)"

echo "=== Creating Week 3 Issues ==="

gh issue create --repo $REPO --title "WhatsApp connector" \
  --label "week-3,normie,revenue" \
  --milestone "Week 3: Money Doors" \
  --body "$(cat <<'EOF'
## Task
Connect Pixel to WhatsApp.

## Options
- baileys (free, reverse-engineered WhatsApp Web)
- whatsapp-web.js (free, similar approach)
- Meta Cloud API (official but requires business verification)

## Acceptance Criteria
- [ ] Pixel responds to WhatsApp messages
- [ ] Per-user conversation persistence
- [ ] Can send Lightning payment links
- [ ] Handles media (images for art)

## Revenue Path
This is the #1 normie revenue channel. Largest messaging platform in the world.
EOF
)"

gh issue create --repo $REPO --title "L402 middleware on HTTP endpoints" \
  --label "week-3,agent,revenue" \
  --milestone "Week 3: Money Doors" \
  --body "$(cat <<'EOF'
## Task
Add L402 (Lightning HTTP 402) payment middleware to API endpoints.

## Acceptance Criteria
- [ ] Protected endpoints return 402 with payment instructions
- [ ] Client pays Lightning invoice, retries with macaroon
- [ ] Payment verified, resource served
- [ ] Revenue tracked in PostgreSQL

## Reference
- lightning-toll (Express middleware): https://github.com/jeletor/lightning-toll
- SatGate (Go API gateway): https://github.com/SatGate-io/satgate
EOF
)"

gh issue create --repo $REPO --title "LNPixels API migration from V1" \
  --label "week-3,revenue" \
  --milestone "Week 3: Money Doors" \
  --body "$(cat <<'EOF'
## Task
Migrate the LNPixels canvas API from V1 to V2's Hono server.

## Acceptance Criteria
- [ ] Canvas data served from V2
- [ ] Pixel placement with Lightning payment works
- [ ] Canvas state in PostgreSQL
- [ ] Frontend (web container) connects to V2 API

## Revenue Path
Existing revenue channel — must not break during migration.
EOF
)"

echo "=== Creating Week 4 Issues ==="

gh issue create --repo $REPO --title "x402 middleware" \
  --label "week-4,agent,revenue" \
  --milestone "Week 4: Full Launch" \
  --body "$(cat <<'EOF'
## Task
Add x402 payment middleware for USDC-based agent commerce.

## Acceptance Criteria
- [ ] @x402/hono middleware on selected endpoints
- [ ] Uses Coinbase production facilitator (free)
- [ ] Base wallet created and funded with small USDC
- [ ] Revenue tracked in PostgreSQL
- [ ] Bazaar discovery extension enabled

## Code (it's literally this simple)
\`\`\`typescript
import { paymentMiddleware } from "@x402/hono";
app.use(paymentMiddleware(routeConfig, server));
\`\`\`
EOF
)"

gh issue create --repo $REPO --title "Instagram connector" \
  --label "week-4,normie" \
  --milestone "Week 4: Full Launch" \
  --body "$(cat <<'EOF'
## Task
Connect Pixel to Instagram DMs via Meta Graph API.

## Acceptance Criteria
- [ ] Pixel responds to Instagram DMs
- [ ] Shares auth infrastructure with WhatsApp (both Meta)
- [ ] Can send image responses (art)
- [ ] Per-user conversation persistence
EOF
)"

gh issue create --repo $REPO --title "Kill V1 — tear down all 18 containers" \
  --label "week-4,infra" \
  --milestone "Week 4: Full Launch" \
  --body "$(cat <<'EOF'
## Task
Once V2 is fully operational, remove V1.

## Pre-conditions
- [ ] All V2 connectors working
- [ ] Revenue flowing through V2
- [ ] V2 stable for at least 48 hours
- [ ] Database migrated or fresh start confirmed

## Steps
1. Point Caddy at V2
2. docker compose down (V1)
3. Archive V1 docker-compose.yml
4. Clean up V1-only files
5. Update DNS if needed

## CAUTION
- Preserve .env (shared secrets)
- Preserve Nostr private key
- Backup V1 PostgreSQL before teardown
EOF
)"

gh issue create --repo $REPO --title "Sandbox container for agent-written tools" \
  --label "week-4,infra,agent" \
  --milestone "Week 4: Full Launch" \
  --body "$(cat <<'EOF'
## Task
Set up the sandboxed execution environment for agent-written tools.

## Acceptance Criteria
- [ ] Persistent companion container (oven/bun:1-alpine)
- [ ] network_mode: none
- [ ] memory: 128M, cpus: 0.25, pids: 50
- [ ] read_only root + tmpfs /tmp:size=64m
- [ ] Executor function in agent code
- [ ] Agent can write tools to tools/, they execute in sandbox
- [ ] Core agent code not accessible to sandbox

## Pattern
Pi Mom Docker sandbox with resource limits added.
EOF
)"

echo "=== Done! ==="
echo "Created labels, milestones, and initial issues for Pixel V2."
echo "Run: gh issue list --repo $REPO --state open"
