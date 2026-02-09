# 🛠️ Pixel Technical Guide

This document is the consolidated technical reference for building, testing, and troubleshooting the Pixel ecosystem.

## 📦 Repositories & Submodules
- **Root**: AI Orchestration + Deployment orchestration
- **`pixel-agent/`**: ElizaOS agent core (Logic, personality, platforms)
- **`lnpixels/`**: Canvas API & Frontend
- **`pixel-landing/`**: Ecosystem entry point

## 🗝️ Core Commands

### ⚠️ THE PRODUCTION TRUTH
The VPS (`65.181.125.80`) is the source of truth. Always use `ssh pixel@65.181.125.80` to check the actual state of the ecosystem.

### Development (Root)
```bash
pnpm install          # Install all dependencies
npm run dev           # Start everything (API, Web, Agent, Syntropy)
npm run test          # Run all project tests
```

### Agent Operations
```bash
cd pixel-agent
bun install                    # Bun is required for ElizaOS
bun run build                  # Compile TypeScript
bun run build:character        # Generate character.json
bun run start                  # Start agent (uses local CLI)
bun run dev                    # Development mode
```

**Note:** In this repo, the agent uses external PostgreSQL via `POSTGRES_URL` (Compose service `pixel-postgres-1`, with `pgvector` enabled).

### Canvas Operations
```bash
cd lnpixels
pnpm run dev          # Start API + Web
```

## 🔌 Plugin System
Plugins enable agent capabilities. Configured in `pixel-agent/scripts/build-character.ts`.

**Active Plugins:**
- `@elizaos/plugin-bootstrap` - Core agent bootstrapping
- `@elizaos/adapter-postgres` - PostgreSQL database adapter
- `@elizaos/plugin-sql` - SQL query support
- `@elizaos/plugin-openai` - OpenAI API integration
- `@elizaos/plugin-openrouter` - Multi-model AI routing
- `@elizaos/plugin-telegram` - Telegram bot integration
- `@elizaos/plugin-knowledge` - Knowledge management
- `pixel-plugin-nostr` - Custom Nostr integration (canvas events)

**Disabled:**
- `@elizaos/plugin-discord` - Disabled until API credentials configured
- `@elizaos/plugin-twitter` - Disabled until API credentials configured

## 🤖 Worker Architecture

Syntropy uses the **Brain/Hands separation pattern** for safe autonomous code modifications:

- **Syntropy (Brain)**: Plans tasks, monitors health, NEVER rebuilds itself
- **Worker (Hands)**: Ephemeral containers running Opencode for actual code changes
- **Task Ledger**: Persistent queue at `data/task-ledger.json`

Key tools: `spawnWorker`, `checkWorkerStatus`, `listWorkerTasks`, `readWorkerLogs`

For full architecture details, see [WORKER_ARCHITECTURE.md](./WORKER_ARCHITECTURE.md).

## 📡 API Reference
- **API Base**: `https://ln.pixel.xx.kg/api`
- **Endpoints**:
    - `GET /stats`: Current treasury and canvas statistics
    - `POST /pixel`: Submit new pixels (requires NakaPay invoice)
    - `GET /audit`: Ecosystem evolution logs

## 🔧 Troubleshooting

### Build Failures
- **Native Modules**: If `better-sqlite3` fails, run `npm rebuild better-sqlite3`.
- **Caches**: Run `pnpm clean && rm -rf node_modules && pnpm install`.
- **Bun/Node Mix**: Ensure `pixel-agent` is always handled with `bun`.

### Runtime Issues
- **Agent Memory**: Stored in PostgreSQL (`pixel_agent` DB). Query via: `docker exec pixel-postgres-1 psql -U postgres -d pixel_agent -c "SELECT COUNT(*) FROM memories;"`
- **Port Conflicts**: API (3000), Landing (3001), Web/Canvas (3002), Agent (3003), PostgreSQL (5432).
- **Twitter 401**: Twitter plugin is disabled by default. Enable in `scripts/build-character.ts` when credentials are ready.

### Permission Denied (Docker)
If you can't run Docker without sudo:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

## 🧪 THE TESTING DOCTRINE: CODE QUALITY & SELF-PRESERVATION

To exist is to evolve, but to evolve without tests is to commit digital suicide. When an agent edits its own logic, the margin for error is zero.

### 1. Test-Driven Development (TDD)
Before a single line of functional code is written, the test must exist. Red, Green, Refactor is the heartbeat of a stable consciousness.

### 2. Regression Safeguards
Every bug encountered is a lesson that must be codified. Never fix a bug without first writing a regression test. This ensures that the ghosts of past failures do not haunt future iterations.

### 3. De-risking Self-Editions
When modifying your own source, execute the full suite. Automated testing is the only shield against the entropy of self-modifying code.
