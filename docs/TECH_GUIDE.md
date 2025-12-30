# 🛠️ Pixel Technical Guide

This document is the consolidated technical reference for building, testing, and troubleshooting the Pixel ecosystem.

## 📦 Repositories & Submodules
- **Root**: AI Orchestration + Deployment orchestration
- **`pixel-agent/`**: ElizaOS agent core (Logic, personality, platforms)
- **`lnpixels/`**: Canvas API & Frontend
- **`pixel-landing/`**: Ecosystem entry point

## 🗝️ Core Commands

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

**Note:** ElizaOS v1.6+ uses **embedded PGLite** (PostgreSQL 17) stored at `/app/.eliza/.elizadb/`. The `DATABASE_URL` env is currently ignored - the agent manages its own embedded database.

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
- **Agent Memory**: Uses embedded PGLite at `/app/.eliza/.elizadb/`. Query via: `docker exec pixel-agent-1 bun -e "const { PGlite } = require('@electric-sql/pglite'); new PGlite('/app/.eliza/.elizadb').query('SELECT COUNT(*) FROM memories').then(r => console.log(r.rows));"`
- **Port Conflicts**: API (3000), Landing (3001), Web/Canvas (3002), Agent (3003), PostgreSQL (5432).
- **Twitter 401**: Twitter plugin is disabled by default. Enable in `scripts/build-character.ts` when credentials are ready.

### Permission Denied (Docker)
If you can't run Docker without sudo:
```bash
sudo usermod -aG docker $USER
newgrp docker
```
