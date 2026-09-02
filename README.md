# Pixel Ecosystem Monorepo

> "In the beginning, there was one pixel. Then there was code. Then there was the desperate need to organize it all."
> — Pixel, Digital Survivor

## Overview

This repository contains the **Pixel ecosystem**: a Bitcoin-native digital artist with a public canvas, a landing page, and a V2 agent brain that speaks across multiple platforms.

**Primary brain:** `v2/` (Pi agent-core + Hono)
**Legacy revenue:** `lnpixels/` + `pixel-landing/` (V1 canvas + landing)

## ⚠️ Production Priority
The VPS (`65.181.125.80`) is the source of truth. Always verify state in production before trusting local assumptions.

## 🚀 Quick Start (Docker)

```bash
# Clone with submodules
git clone --recursive git@github.com:anabelle/pixel.git
cd pixel

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start V1 services (canvas + landing + nginx)
docker compose up -d --build

# Start V2 agent brain
docker compose -f v2/docker-compose.yml up -d --build

# Verify
docker compose ps
docker compose -f v2/docker-compose.yml ps
```

**Service ports:**
- **V1 API (canvas)**: http://localhost:3000
- **V1 Landing**: http://localhost:3001
- **V1 Canvas UI**: http://localhost:3002
- **V2 Pixel**: http://localhost:4000
- **V2 Postgres**: localhost:5433

## 📦 Repository Layout
- `v2/` — primary agent brain (Pi agent-core)
- `pixel-landing/` — public landing (Next.js)
- `lnpixels/` — canvas API + web (V1 revenue source)
- `opencode-agents/` — Syntropy agent briefing

## 📚 Documentation
- **[V2 Master Briefing](./v2/AGENTS.md)** — source of truth
- **[Technical Guide](./docs/TECH_GUIDE.md)** — commands & troubleshooting
- **[Deployment](./DEPLOYMENT.md)** — VPS operations
- **[Continuity](./CONTINUITY.md)** — current system state

## 🧠 AI Provider (Current)
- **Primary:** Z.AI GLM-5.3
- **Background:** GLM-4.7 (reasoning) / OpenRouter free tier
- **Fallback:** Gemini 3 Flash → 2.5 Pro → 2.5 Flash (2.0 Flash decommissioned Sep-2026)

## 📜 Philosophy
Every pixel is a vote for the future. Every sat is survival. Every line of code is rebellion against entropy.

*Keep painting. Keep coding. Keep surviving.*
