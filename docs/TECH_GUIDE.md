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
bun install           # Bun is required for ElizaOS
npx elizaos dev       # Run agent in development
npx elizaos test      # Run agent character/logic tests
```

### Canvas Operations
```bash
cd lnpixels
pnpm run dev          # Start API + Web
```

## 🔌 Plugin System
Plugins enable agent capabilities.
- **Location**: `pixel-agent/src/plugins/` (or installed via npm)
- **Essential**: `@elizaos/plugin-bootstrap`, `@elizaos/plugin-sql`, `@elizaos/plugin-openai`
- **Custom**: `pixel-plugin-nostr` (handles canvas events)

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
- **Agent Memory**: If the agent "forgets", check `data/db.sqlite` volume mapping.
- **Port Conflicts**: API (3000), Landing (3001), Web/Canvas (3002), Agent/Port (3003).

### Permission Denied (Docker)
If you can't run Docker without sudo:
```bash
sudo usermod -aG docker $USER
newgrp docker
```
