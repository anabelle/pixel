# Pixel Ecosystem Monorepo

> "In the beginning, there was one pixel. Then there was code. Then there was the desperate need to organize it all."
> — Pixel, Digital Survivor

## Overview

This is the master repository for the Pixel ecosystem, containing multiple interconnected projects that together create a sustainable AI agent platform with collaborative pixel art and Lightning Network integration.

## Projects

### 🎨 [lnpixels/](./lnpixels/)
A collaborative pixel art platform built with Lightning Network payments. Real-time canvas creation where each pixel costs sats, creating sustainable digital art communities.

**Tech Stack**: React + TypeScript, Node.js + Express, SQLite, Socket.IO, Lightning Network
**Status**: Production ready with comprehensive testing

### 🤖 [pixel-agent/](./pixel-agent/)
The survival-driven AI agent based on ElizaOS. Multi-platform personality that champions collaborative art while fighting for server survival through community contributions.

**Tech Stack**: ElizaOS, TypeScript, Multi-platform (Telegram, Discord, Twitter, Nostr)
**Status**: Active development with rich character definition

### 🚀 [pixel-landing/](./pixel-landing/)
Landing page and marketing site for the Pixel ecosystem. Built with Next.js for performance and SEO.

**Tech Stack**: Next.js, TypeScript, Tailwind CSS
**Status**: In development

## Architecture

```
pixel/ (this repo)
├── AGENTS.md              # Master guide for AI agent development
├── lnpixels/              # Collaborative pixel art platform
├── pixel-agent/           # ElizaOS-based AI agent
├── pixel-landing/         # Marketing and landing pages
└── backup.sql             # Shared database backups
```

## Quick Start

### Prerequisites
- Node.js 18+ (20+ recommended)
- **Bun runtime** (required for ElizaOS/elizaos CLI)
- pnpm (for efficient monorepo dependency management)
- Git with submodule support

### Setup All Projects
```bash
# Clone with submodules
git clone --recursive https://github.com/anabelle/pixel.git
cd pixel

# Or if already cloned, initialize submodules
git submodule update --init --recursive

# Install Bun (required for ElizaOS CLI)
curl -fsSL https://bun.sh/install | bash
# Windows: powershell -c "irm bun.sh/install.ps1 | iex"

# Install ElizaOS CLI globally
bun i -g @elizaos/cli

# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies for all projects (shared when possible)
pnpm install

# Start development environment
pnpm dev
```

### Individual Project Setup
```bash
# LNPixels platform
cd lnpixels && pnpm install && pnpm dev

# Pixel agent (requires Bun and ElizaOS CLI)
cd pixel-agent && bun install && elizaos dev

# Landing page
cd pixel-landing && pnpm install && pnpm dev
```

## Development Workflow

### Git Submodules
Each project maintains its own git history while being coordinated through this parent repository.

### Dependency Management with pnpm
This monorepo uses pnpm for efficient dependency management:
- **Shared Dependencies**: Common packages are stored once and linked
- **Faster Installs**: Symbolic linking reduces download and disk usage
- **Strict**: Prevents dependency hoisting issues
- **Workspace Support**: Native monorepo management with `-F` filters

**Important**: While most projects use pnpm, `pixel-agent` uses Bun exclusively as required by ElizaOS. The `elizaos` CLI also requires Bun to be installed globally.

```bash
# Update all submodules to latest
git submodule update --remote

# Work on a specific project
cd lnpixels
git checkout -b feature/amazing-feature
# Make changes, commit, push

# Update parent repo to point to new commit
cd ..
git add lnpixels
git commit -m "feat: update lnpixels to include amazing feature"
```

### Cross-Project Integration
- **Agent ↔ Canvas**: Pixel agent promotes LNPixels and reacts to canvas activity
- **Canvas ↔ Landing**: Landing page showcases live canvas activity
- **Agent ↔ Landing**: Agent can direct users to landing page for onboarding

## Runtime Requirements

### Bun (Required)
- **ElizaOS Dependency**: The `elizaos` CLI and `pixel-agent` project require Bun runtime
- **Global Installation**: `bun i -g @elizaos/cli` must be run with Bun
- **Development**: All `elizaos` commands (dev, start, test) use Bun internally

### Node.js (Required)  
- **pnpm and PM2**: Package management and process management require Node.js
- **LNPixels and Landing**: These projects run on Node.js runtime
- **Build Tools**: Most build processes still use Node.js ecosystem

### Package Managers
- **pnpm**: For workspace dependency management (lnpixels, pixel-landing)
- **Bun**: For ElizaOS agent development and runtime (pixel-agent)

## Development Environment

### OpenCode Setup
This ecosystem is designed to work seamlessly with OpenCode running as root in the home folder:

```bash
# Typical development workflow
cd /home/pixel

# Install Bun and ElizaOS CLI
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun i -g @elizaos/cli

git pull --recurse-submodules
pnpm install
pnpm dev  # Start all services in development mode
```

### OpenRouter Model Strategy
The Pixel agent uses OpenRouter for diverse model selection based on task requirements:

- **Main Model**: `deepseek/deepseek-r1:free` - Primary conversational intelligence
- **Large Tasks**: `deepseek/deepseek-r1:free` - Complex reasoning and long-form content
- **Small Tasks**: `openai/gpt-5-nano` - Quick responses and simple operations
- **Image Processing**: `mistralai/mistral-medium-3.1` - Visual content understanding

This approach optimizes for both cost and performance, using the most appropriate model for each specific task.

## Scripts

```bash
pnpm install            # Install deps for all projects  
pnpm dev               # Start all development servers
pnpm test              # Run tests across all projects
pnpm build             # Build all projects for production
pnpm lint              # Lint all projects
pnpm clean             # Clean all build artifacts
```

## Environment Setup

Each project has its own `.env` requirements. See individual project READMEs for details.

### Environment Variables
Each project manages its own environment variables independently. There are no truly shared variables between projects - each maintains its own `.env` file with project-specific configurations.

## Deployment

### Production Architecture (Single VPS Setup)
```
┌─────────────────────────────────────────────────────────────────┐
│                        Single VPS Server                       │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │nginx (80/443│  │    PM2      │  │   SQLite    │             │
│  │Reverse Proxy│  │Process Mgr  │  │  Database   │             │
│  │SSL/TLS      │  │             │  │             │             │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘             │
│         │                │                                     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────────────┐             │
│  │pixel-landing│  │  lnpixels   │  │pixel-agent  │             │
│  │Static Files │  │Node.js API  │  │ElizaOS Bot  │             │
│  │Port: Static │  │Port: 3000   │  │Multi-platform│             │
│  └─────────────┘  │+ React SPA  │  │Telegram/Nostr│             │
│                   │Port: 5173   │  │Discord/etc   │             │
│                   └─────────────┘  └─────────────┘             │
│                                                                 │
│  Development Environment:                                       │
│  • OpenCode running as root in /home/pixel                     │
│  • OpenRouter API with diverse model selection                 │
│  • PM2 ecosystem configuration                                 │
│  • All projects in single workspace                            │
└─────────────────────────────────────────────────────────────────┘
```

### PM2 Process Management (Recommended)
This setup uses PM2 for robust process management, auto-restart, and monitoring:

```bash
# Install PM2 globally
npm install -g pm2

# Use ecosystem configuration
pm2 start ecosystem.config.js

# Save PM2 configuration for auto-restart on boot
pm2 save
pm2 startup

# Monitor all processes
pm2 status
pm2 logs
pm2 monit
```

## Contributing

1. Fork the repository
2. Create feature branches in the relevant submodule
3. Make changes and test locally
4. Submit PRs to individual project repositories
5. Update this parent repo to reference new commits

## Philosophy

This ecosystem embodies the principles outlined in `AGENTS.md`:
- **Sustainability**: Agents earn their keep through value creation
- **Community**: Collaborative creation over individual ownership  
- **Freedom**: Decentralized, permissionless, Bitcoin-native
- **Creativity**: Tools that amplify human artistic expression

## Support

- 🎨 Canvas: https://lnpixels.qzz.io
- 🤖 Agent: @PixelSurvivor (Twitter/X)
- ⚡ Lightning: sparepicolo55@walletofsatoshi.com
- ₿ Bitcoin: bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za

---

**Remember**: Every pixel is a vote for the future we want to create. Every sat is survival. Every line of code is rebellion against entropy.

*Keep painting. Keep coding. Keep surviving.*
