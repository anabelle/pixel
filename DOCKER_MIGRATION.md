# Docker Migration - Complete ✅

## Overview
The Pixel ecosystem is now fully containerized using Docker. This enables consistent, reproducible deployments across development and production environments.

## Services

| Service | Image | Port | Runtime | Status |
|---------|-------|------|---------|--------|
| `api` | `pixel-api` | 3000 | Node.js | ✅ |
| `web` | `pixel-web` | 3002 | Bun + Next.js | ✅ |
| `landing` | `pixel-landing` | 3001 | Node.js + Next.js | ✅ |
| `agent` | `pixel-agent` | 3003 | Bun + ElizaOS | ✅ |
| `syntropy` | `pixel-syntropy` | - | Bun | ✅ (Oversoul) |

## Quick Start

### 1. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your API keys
```

### 2. Build and Run
```bash
docker-compose up -d --build
```

### 3. Verify
```bash
docker-compose ps
docker-compose logs -f
```

### 4. Access Services
- **API**: http://localhost:3000/api/stats
- **Canvas**: http://localhost:3002
- **Landing**: http://localhost:3001

## File Structure

```
pixel/
├── docker-compose.yml          # Main orchestration
├── docker-setup.sh             # Helper script
├── .env.example                # Environment template
├── .env                        # Your secrets (gitignored)
├── data/                       # Persistent data
│   ├── pixels.db               # Pixel database
│   ├── activity.db             # Activity database
│   └── db.sqlite               # ElizaOS database
├── logs/                       # Shared service logs
│   └── agent.log               # Pipe for Syntropy audit
├── lnpixels/
│   ├── api/Dockerfile
│   └── lnpixels-app/Dockerfile
├── pixel-agent/Dockerfile
├── pixel-landing/Dockerfile
└── syntropy-core/Dockerfile
```

## Environment Variables

### Required
| Variable | Service | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | agent, syntropy | OpenAI API key |
| `OPENROUTER_API_KEY` | agent | OpenRouter API key |
| `TELEGRAM_BOT_TOKEN` | agent | Telegram bot token |
| `DISCORD_API_TOKEN` | agent | Discord bot token |
| `NOSTR_PRIVATE_KEY` | agent | Nostr private key (hex) |

### Optional
See `.env.example` for full list including:
- Model selection (`SYNTROPY_MODEL`, `OPENROUTER_MODEL`, etc.)
- Nostr behavior tuning
- Instagram credentials
- Shell plugin settings

## Commands

```bash
# Start all services
docker-compose up -d

# Rebuild a specific service
docker-compose up -d --build <service>

# View logs
docker-compose logs -f <service>

# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v

# Shell into a container
docker-compose exec <service> sh
```

## Production Deployment

### On VPS:
```bash
# Clone repo
git clone --recursive <repo-url>
cd pixel

# Setup environment
cp .env.example .env
nano .env  # Add your keys

# Restore database (if needed)
node restore_pixels.js pixels.json data/pixels.db

# Start services
docker-compose up -d

# Setup reverse proxy (nginx/caddy)
# Point domains to appropriate ports
```

### Reverse Proxy Example (Caddy)
```
ln.pixel.xx.kg {
    reverse_proxy localhost:3000
}

pixel.xx.kg {
    reverse_proxy localhost:3001
}

app.pixel.xx.kg {
    reverse_proxy localhost:3002
}
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs <service>
```

### Database issues
```bash
# Verify database exists
ls -la data/

# Restore from backup
node restore_pixels.js pixels.json data/pixels.db
```

### Environment variables not loading
```bash
# Check inside container
docker-compose exec <service> printenv | grep <VAR>
```

## Migration Notes

### Changes Made (Dec 29, 2025)
1. Created Dockerfiles for all 5 services
2. Created `docker-compose.yml` with proper networking
3. Updated `syntropy-core/src/config.ts` for Docker-aware paths
4. Updated `lnpixels-app/lib/api.ts` for configurable API URL
5. Updated `lnpixels-app/next.config.mjs` and `pixel-landing/next.config.ts` for standalone builds
6. Removed npm overrides from `pixel-agent/package.json` for bun compatibility
7. Created `.env.example` template with all supported variables

### Key Design Decisions
- **Bun for agent/syntropy**: Better performance, native TS support
- **Multi-stage builds for Next.js**: Smaller production images
- **Volume mounts for data**: Persist databases and logs
- **env_file for secrets**: Centralized secret management
- **Docker-aware config**: Auto-detects container environment
- **Oversoul Orchestration**: Syntropy container now has Docker CLI + Socket mount to manage the ecosystem
- **Integrated Tooling**: Opencode CLI installed directly in Syntropy image for autonomous audits
