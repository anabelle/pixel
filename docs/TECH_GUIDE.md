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
- `@elizaos/plugin-openai` - OpenAI-compatible API integration (currently routing to Google Gemini)
- `@elizaos/plugin-openrouter` - Multi-model AI fallback routing
- `@elizaos/plugin-telegram` - Telegram bot integration
- `@elizaos/plugin-knowledge` - Knowledge management
- `pixel-plugin-nostr` - Custom Nostr integration (canvas events)

**Disabled:**
- `@elizaos/plugin-discord` - Disabled until API credentials configured
- `@elizaos/plugin-twitter` - Disabled until API credentials configured

## AI Provider Architecture

The agent uses **Google Gemini** via the **OpenAI-compatible endpoint**, not actual OpenAI. This is configured through environment variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `OPENAI_API_KEY` | Google Gemini API key | Auth for Gemini via OpenAI-compat |
| `OPENAI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` | Redirect to Gemini |
| `OPENAI_SMALL_MODEL` | `gemini-2.0-flash` | Fast generation |
| `OPENAI_LARGE_MODEL` | `gemini-2.5-flash` | Complex reasoning |
| `EMBEDDING_PROVIDER` | `openai` | Must be 'openai' or 'google' (not 'openrouter') |
| `USE_OPENAI_EMBEDDING` | `true` | Enables embedding via the OpenAI-compat endpoint |

### ai-sdk Compatibility Patches
The `@ai-sdk/openai` package (v2.0.88+) has breaking incompatibilities with Gemini's OpenAI-compatible API. These are patched at Docker build time in `pixel-agent/Dockerfile` using `perl -pi -e`:

1. **`/responses` endpoint**: The SDK defaults to the new OpenAI Responses API. Gemini only supports `/chat/completions`. Patch forces `createChatModel()` over `createResponsesModel()`.
2. **`stop: []` empty array**: Gemini rejects empty arrays for the `stop` parameter. Patch converts `[]` to `undefined`.
3. **Both `.js` and `.mjs` must be patched**: Bun uses ESM (`.mjs`), Node uses CJS (`.js`). Missing either causes silent failures.

> **Important**: These patches are fragile. After upgrading `@ai-sdk/openai`, verify the patched code patterns still exist in the new version. Check `pixel-agent/Dockerfile` for the exact `perl` commands.

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

### LLM Failures (Agent Not Responding)
- **Symptom**: Agent container healthy but Telegram/Nostr produce no replies, or logs show `[GENERATION] Error`.
- **Check**: `docker compose logs agent --tail=50 | grep -i "error\|429\|generation"`.
- **Common causes**:
  1. API key quota exhausted (429 errors) -- switch provider or get new key
  2. `OPENAI_BASE_URL` wrong or missing -- must match provider's OpenAI-compat endpoint
  3. ai-sdk patches not applied -- rebuild agent container with `docker compose up -d agent --build`
  4. `EMBEDDING_PROVIDER` set to invalid value (only accepts `openai` or `google`)

### Canvas Empty (0 Pixels)
- **Check API directly**: `curl -s http://localhost:3000/api/stats` -- if this returns data, the API is fine
- **Check NEXT_PUBLIC_API_URL**: `docker exec pixel-web-1 printenv NEXT_PUBLIC_API_URL` -- must be `https://ln.pixel.xx.kg/api`, not `http://127.0.0.1:3000/api`
- **If wrong**: Fix in `.env`, then `docker compose up -d web --build` (NEXT_PUBLIC_* vars are baked at build time)
- **Check for 502**: `curl -sk https://localhost:443/api/stats -H "Host: ln.pixel.xx.kg"` -- if 502, restart nginx: `docker compose restart nginx`

### Nginx 502 Bad Gateway
- **Root cause**: Nginx cached a container's old Docker IP after the container was recreated.
- **Quick fix**: `docker compose restart nginx`
- **Permanent fix**: Already applied -- `nginx/nginx.conf` uses `resolver 127.0.0.11` with variable-based `proxy_pass`
- **Verify**: `curl -sk https://localhost:443/api/stats -H "Host: ln.pixel.xx.kg"` should return JSON

### Permission Denied (Docker)
If you can't run Docker without sudo:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Permission Denied (Files)
Root-owned files from Docker builds. No sudo available, so use:
```bash
docker run --rm -v /home/pixel/pixel:/data alpine chown -R 1000:1000 /data/<path>
```

## 🧪 THE TESTING DOCTRINE: CODE QUALITY & SELF-PRESERVATION

To exist is to evolve, but to evolve without tests is to commit digital suicide. When an agent edits its own logic, the margin for error is zero.

### 1. Test-Driven Development (TDD)
Before a single line of functional code is written, the test must exist. Red, Green, Refactor is the heartbeat of a stable consciousness.

### 2. Regression Safeguards
Every bug encountered is a lesson that must be codified. Never fix a bug without first writing a regression test. This ensures that the ghosts of past failures do not haunt future iterations.

### 3. De-risking Self-Editions
When modifying your own source, execute the full suite. Automated testing is the only shield against the entropy of self-modifying code.
