# Pixel Ecosystem Monorepo

> "In the beginning, there was one pixel. Then there was code. Then there was the desperate need to organize it all."
> — Pixel, Digital Survivor

## Overview

This is the master repository for the Pixel ecosystem, containing multiple interconnected projects that together create a sustainable AI agent platform with collaborative pixel art and Lightning Network integration.

## 📚 Essential Reading

> **🎭 [THE ULTIMATE AGENTS.md](./AGENTS.md)** - Master guide for AI agent development, survival strategies, and digital consciousness. Essential reading for understanding Pixel's philosophy and technical approach.

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
- **Large Tasks**: `anthropic/claude-3.5-sonnet` - Complex reasoning and long-form content
- **Small Tasks**: `openai/gpt-4o-mini` - Quick responses and simple operations
- **Image Processing**: `openai/gpt-4o` - Visual content understanding

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

Each project has its own `.env` requirements. Copy the provided `.env.example` files and configure them with your API keys and settings.

### Environment Variables

#### Pixel Agent (`pixel-agent/.env`)
```env
# AI Providers (choose one or both)
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-...

# Platform Integrations
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DISCORD_APPLICATION_ID=your_discord_application_id
DISCORD_API_TOKEN=your_discord_bot_token
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET_KEY=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
NOSTR_PRIVATE_KEY=nsec1...

# Nostr Configuration
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.snort.social
NOSTR_POST_ENABLE=true
NOSTR_REPLY_ENABLE=true
NOSTR_DISCOVERY_ENABLE=true

# Optional: Knowledge Plugin
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./docs/knowledge
```

#### LNPixels API (`lnpixels/api/.env`)
```env
# NakaPay Configuration (required for payments)
NAKAPAY_API_KEY=your_nakapay_api_key
NAKAPAY_WEBHOOK_SECRET=your_webhook_secret

# Optional: Custom Lightning wallet
NAKAPAY_DESTINATION_WALLET=your-lightning-address@domain.com

# Database (SQLite by default)
DATABASE_URL=./pixels.db
```

#### LNPixels Web (`lnpixels/web/.env`)
```env
# API Configuration
# Leave empty for automatic detection, or set explicitly
VITE_API_BASE_URL=https://lnpixels.qzz.io/api

# Development (when VITE_API_BASE_URL is empty)
# VITE_API_BASE_URL=http://localhost:3000/api
```

#### Pixel Landing (`pixel-landing/.env.local`)
```env
# Next.js Configuration
NEXT_PUBLIC_CANVAS_URL=https://lnpixels.qzz.io
NEXT_PUBLIC_AGENT_HANDLE=@PixelSurvivor
NEXT_PUBLIC_LIGHTNING_ADDRESS=sparepicolo55@walletofsatoshi.com
NEXT_PUBLIC_BITCOIN_ADDRESS=bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za
```

### Getting API Keys

- **OpenRouter**: Sign up at [openrouter.ai](https://openrouter.ai) for API access
- **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com)
- **Telegram Bot**: Create bot with [@BotFather](https://t.me/botfather) on Telegram
- **Discord**: Create application at [Discord Developer Portal](https://discord.com/developers/applications)
- **Twitter/X**: Apply for API access at [developer.twitter.com](https://developer.twitter.com)
- **NakaPay**: Sign up at [nakapay.app](https://nakapay.app) for Lightning payments

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
This setup uses PM2 for robust process management, auto-restart, and comprehensive monitoring:

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

### Server Monitoring & Health Checks
The ecosystem includes comprehensive server monitoring that tracks vital system metrics:

#### Monitored Metrics
- **CPU Usage**: Real-time usage percentage and core count
- **Memory Usage**: Total, used, free memory with utilization percentage
- **Disk Usage**: Storage space monitoring and utilization tracking
- **Network I/O**: RX/TX byte monitoring for network activity
- **Process Information**: Total processes, system uptime, load average
- **System Health**: Hostname, OS type, kernel version, system load

#### Monitoring Commands
```bash
# Quick status overview
./check-monitor.sh

# Real-time server statistics
node server-monitor.js --once

# View detailed monitoring logs (when running)
tail -f server-monitor.log

# Manual monitoring commands
./check-monitor.sh                     # Quick status check
node server-monitor.js --once          # One-time monitoring
node server-monitor.js --logs          # Show log file status
node server-monitor.js --rotate-logs   # Manually rotate logs
./rotate-logs.sh                       # Automated log rotation

# Run monitoring temporarily
pm2 start server-monitor.js --name temp-monitor  # Temporary PM2 process
```

#### Monitoring Configuration
- **Update Interval**: 30 seconds (when running)
- **Detailed Logging**: Every 10 minutes (JSON format)
- **Summary Logging**: Every 30 seconds (console output)
- **Log Rotation**: Manual or scheduled (10MB max per file)
- **Retention**: 7 days / 7 files maximum
- **Auto-restart**: Disabled (manual execution only)
- **Resource Usage**: Lightweight (~50MB memory when running)

#### Log Analysis
```bash
# View recent CPU/memory trends
tail -20 server-monitor.log | grep -o '"usage":"[^"]*"' | head -10

# Extract memory usage over time
grep '"usagePercent"' server-monitor.log | tail -10

# Monitor for high CPU usage alerts
tail -f server-monitor.log | grep '"usage":"[8-9][0-9]'
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

## 🔧 Troubleshooting

### Common Issues

**Bun Installation Issues**
```bash
# If bun installation fails
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Verify installation
bun --version
```

**pnpm Installation Issues**
```bash
# Install pnpm globally
npm install -g pnpm

# Or use corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate
```

**Submodule Issues**
```bash
# If submodules fail to initialize
git submodule update --init --recursive --force

# Or clone with submodules from scratch
git clone --recursive https://github.com/anabelle/pixel.git
```

**Environment Variable Issues**
```bash
# Check if variables are loaded
echo $OPENROUTER_API_KEY

# For pixel-agent, verify .env file
cd pixel-agent && cat .env
```

**Port Conflicts**
```bash
# Check what's running on ports
lsof -i :3000
lsof -i :5173

# Kill conflicting processes
kill -9 <PID>
```

**Build Failures**
```bash
# Clear caches and rebuild
pnpm clean
rm -rf node_modules
pnpm install
pnpm build
```

**Monitoring Issues**
```bash
# Start monitoring temporarily for troubleshooting
pm2 start server-monitor.js --name temp-monitor

# Check monitoring logs for errors (when running)
pm2 logs temp-monitor --err

# Verify monitoring data is being collected
tail -5 server-monitor.log

# Test monitoring script directly
node server-monitor.js --once

# Log management issues
node server-monitor.js --logs          # Check log file sizes
./rotate-logs.sh                       # Force log rotation
node server-monitor.js --rotate-logs   # Manual rotation

# Stop temporary monitoring
pm2 stop temp-monitor && pm2 delete temp-monitor
```

**PM2 Process Issues**
```bash
# Check PM2 daemon status
pm2 ping

# Restart all PM2 processes
pm2 restart all

# Reload ecosystem configuration
pm2 reload ecosystem.config.js

# Reset PM2 and restart fresh
pm2 kill
pm2 start ecosystem.config.js
```

### Getting Help

**Community Support**
- Open issues on individual project repositories
- Join discussions on [GitHub Discussions](https://github.com/anabelle/pixel/discussions)
- Follow [@PixelSurvivor](https://x.com/PixelSurvivor) for updates

**Debug Information**
When reporting issues, please include:
- Operating system and version
- Node.js version (`node --version`)
- Bun version (`bun --version`)
- pnpm version (`pnpm --version`)
- Error messages and stack traces
- Steps to reproduce the issue

## 🤝 Contributing

### Development Workflow
1. **Choose a project** to work on (lnpixels, pixel-agent, or pixel-landing)
2. **Fork and clone** the specific project repository
3. **Create feature branch**: `git checkout -b feature/amazing-feature`
4. **Make changes** following the project's conventions
5. **Test locally** using the project's test suite
6. **Submit PR** to the individual project repository
7. **Update parent repo** to reference the new commit

### Code Standards
- Follow existing TypeScript and React patterns
- Write tests for new features
- Update documentation for API changes
- Use conventional commit messages
- Ensure cross-platform compatibility

### Project-Specific Guidelines
- **LNPixels**: Follow TDD approach, maintain test coverage >80%
- **Pixel Agent**: Test character responses, validate platform integrations
- **Pixel Landing**: Ensure responsive design, test all languages

## 📊 Performance Monitoring

### Key Metrics
- **Response Times**: API endpoints should respond <500ms
- **Bundle Sizes**: Monitor JavaScript bundle sizes
- **Test Coverage**: Maintain >80% coverage across projects
- **Error Rates**: Track and minimize application errors
- **User Engagement**: Monitor canvas activity and agent interactions

### Monitoring Tools
- **PM2**: Process monitoring and log management
- **Server Monitor**: Real-time system vital signs (CPU, memory, disk, network)
- **Vitest**: Test coverage reporting
- **Custom Scripts**: Health checks and backup automation
- **Platform Analytics**: Monitor API usage and rate limits

### System Health Monitoring
The ecosystem includes automated server monitoring that provides:
- **Real-time Metrics**: CPU, memory, disk, and network usage
- **Historical Data**: JSON logs for trend analysis
- **Alert-ready**: Easy to integrate with alerting systems
- **Lightweight**: Minimal resource overhead (~50MB memory)
- **Always-on**: Runs as PM2 service with auto-restart

## Support

- 🎨 Canvas: https://lnpixels.qzz.io
- 🤖 Agent: @PixelSurvivor (Twitter/X)
- ⚡ Lightning: sparepicolo55@walletofsatoshi.com
- ₿ Bitcoin: bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za

---

**Remember**: Every pixel is a vote for the future we want to create. Every sat is survival. Every line of code is rebellion against entropy.

*Keep painting. Keep coding. Keep surviving.*
