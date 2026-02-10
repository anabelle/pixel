# V2 Research Index

> Last updated: 2026-02-09, Session 11
> Protocol: Research obsessively. Save learnings. Search twice, implement once.

## Research Files

| File | Topic | Status |
|------|-------|--------|
| [01-pi-mono.md](./01-pi-mono.md) | Pi monorepo: agent-core, pi-ai, pi-mom | Complete |
| [02-payment-protocols.md](./02-payment-protocols.md) | x402, L402, NIP-90 DVM | Complete |
| [03-messaging-connectors.md](./03-messaging-connectors.md) | WhatsApp, Telegram, Instagram | Complete |
| [04-infrastructure.md](./04-infrastructure.md) | Hono, Drizzle, Caddy | Complete |
| [05-agent-identity.md](./05-agent-identity.md) | ERC-8004, A2A, agent-card.json | Complete |
| [06-learnings.md](./06-learnings.md) | Synthesized learnings & corrections | Complete |

## Research Protocol (for all future sessions)

Every session SHOULD:
1. Check if any researched dependency has a new release
2. Validate assumptions against current state
3. Add new findings to the relevant file
4. Update `06-learnings.md` with corrections or new insights
5. Update this index

## Key Corrections Found During Research

1. **Pi repo is `badlogic/pi-mono`, not `badlogic/pi`.** The V2 AGENTS.md referenced packages correctly (`@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`) but linked to the wrong repo. The monorepo has 8,790 stars and 7 packages.
2. **`@mariozechner/pi-agent-core` and `@mariozechner/pi-ai` are sub-packages**, not standalone repos. They live in `packages/agent` and `packages/ai` within `badlogic/pi-mono`.
3. **No production-ready L402 Hono middleware exists.** Will need to build custom or port from `lightning-toll` (Express-only, 1 star, 3 commits).
4. **Instagram DM requires Meta Business verification.** Can take weeks. No viable unofficial alternatives. Should be deprioritized or moved to Month 2.
5. **ERC-8004 is DRAFT, no deployed contracts.** But serving `agent-card.json` (A2A) is cheap and immediately useful.
