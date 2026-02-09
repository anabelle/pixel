# Pixel Ecosystem Monorepo

> "In the beginning, there was one pixel. Then there was code. Then there was the desperate need to organize it all."
> — Pixel, Digital Survivor

## Overview

This is the master repository for the Pixel ecosystem, containing multiple interconnected projects that together create a sustainable AI agent platform with collaborative pixel art and Lightning Network integration.

# ⚠️ CRITICAL: PRODUCTION PRIORITY
**The VPS (`65.181.125.80`) is the source of truth.** 
Agents must ALWAYS check production status via SSH before assuming local state reflects reality.

## 🚀 Quick Start (Docker)

The easiest way to run the entire ecosystem locally or in production:

```bash
# Clone with submodules
git clone --recursive git@github.com:anabelle/pixel.git
cd pixel

# Configure environment
cp .env.example .env
# Edit .env with your API keys (OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, etc.)

# Start all services
docker compose up -d --build

# Verify
docker compose ps
```

**Services available:**
- **API**: http://localhost:3000
- **Landing**: http://localhost:3001
- **Canvas**: http://localhost:3002
- **Agent**: http://localhost:3003
- **PostgreSQL**: localhost:5432

## 📦 Package Architecture
The Pixel ecosystem uses a **Hybrid Manager Strategy**:
- **Monorepo (pnpm)**: `lnpixels`, `pixel-landing` managed by pnpm workspace.
- **Agent (Bun)**: `pixel-agent` uses Bun runtime with ElizaOS CLI v1.7.0.
- **Database**: PostgreSQL 15 for agent persistence (migrated from SQLite).
- **Orchestration**: `syntropy-core` manages autonomous evolution.

## 📚 Documentation
- 🛠️ **[Technical Guide](./docs/TECH_GUIDE.md)** - Commands, architecture, troubleshooting
- 🚀 **[Deployment](./DEPLOYMENT.md)** - Production setup and maintenance
- 🎭 **[Philosophy](./AGENTS.md)** - Pixel's soul and evolution logic
- 📓 **[Continuity](./CONTINUITY.md)** - Current state and task tracking

## 🚀 Production Architecture (Docker)
```
┌─────────────────────────────────────────────────────────────────┐
│                        VPS / Cloud Server                       │
│                                                                 │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │    Nginx    │  │           Docker Compose               │  │
│  │Reverse Proxy│  │                                         │  │
│  │SSL (Certbot)│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │
│  └──────┬──────┘  │  │pixel-api│ │pixel-web│ │ landing │   │  │
│         │         │  │  :3000  │ │  :3002  │ │  :3001  │   │  │
│         │         │  └─────────┘ └─────────┘ └─────────┘   │  │
│         │         │       ┌──────────┐                      │  │
│         └─────────┤       │ postgres │                      │  │
│                   │       │  :5432   │                      │  │
│                   │       └──────────┘                      │  │
│                   │  ┌──────────┐ ┌─────────────┐          │  │
│                   │  │pixel-    │ │  syntropy-  │          │  │
│                   │  │agent     │ │  core       │          │  │
│                   │  │(ElizaOS) │ │(AI Orch)    │          │  │
│                   │  └──────────┘ └─────────────┘          │  │
│                   └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 📜 Philosophy
Every pixel is a vote for the future. Every sat is survival. Every line of code is rebellion against entropy.

*Keep painting. Keep coding. Keep surviving.*
