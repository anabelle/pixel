# Production Operations Guide (VPS)

This guide covers the procedures for deploying and maintaining the **current V2-first** Pixel ecosystem on the VPS.

## 🚀 Rapid Deployment (Docker)

### 1. Bootstrap the Host
```bash
ssh pixel@your-vps
git clone --recursive https://github.com/anabelle/pixel.git
cd pixel
./scripts/setup/vps-bootstrap.sh
exit
```

### 2. Configure Environment
```bash
cd pixel
cp .env.example .env
nano .env
```

**Required Production Keys:**
- `ZAI_API_KEY`: Z.AI Coding Lite API key (GLM-4.7/4.5-air)
- `GEMINI_API_KEY`: Google Gemini key (fallback + vision)
- `TELEGRAM_BOT_TOKEN`: Telegram bot integration
- `NAKAPAY_API_KEY` (if canvas LN payments)

**AI Provider Setup (Current: Z.AI primary + Gemini fallback):**
```env
AI_PROVIDER=zai
AI_MODEL=glm-4.7
ZAI_API_KEY=...
GEMINI_API_KEY=...
```

### 3. Launch
```bash
# Start V1 (canvas + landing + nginx)
docker compose up -d --build

# Start V2 brain
docker compose -f v2/docker-compose.yml up -d --build
```

## 🛠️ Maintenance & Monitoring

### Common Operations
- **Update Ecosystem:**
  ```bash
  git pull --recurse-submodules
  docker compose up -d --build
  docker compose -f v2/docker-compose.yml up -d --build
  ```
- **View Status:** `docker compose ps` and `docker compose -f v2/docker-compose.yml ps`
- **Follow Logs:**
  - V1: `docker compose logs -f landing --tail=100`
  - V2: `docker compose -f v2/docker-compose.yml logs -f pixel --tail=100`

### Health Checks
```bash
curl http://localhost:4000/health      # V2 Pixel
curl http://localhost:3000/api/stats   # V1 Canvas API
curl http://localhost:3001             # V1 Landing
curl http://localhost:3002             # V1 Canvas
```

### Automated Backups
Databases are stored in `./data/`.
- **Manual:** `cp data/pixels.db backups/pixels-$(date +%Y%m%d).db`

## 🛡️ Deployment Safety Rules

0. **The VPS is the Truth**: always verify production state.
1. **Push submodules first**, then update parent pointer.
2. **Rebuild when changing NEXT_PUBLIC_***: Next.js vars are build-time only.

## Operational Gotchas

### Nginx DNS Caching (502 after container recreation)
Nginx caches upstream IPs. If a container is recreated, restart nginx:
```bash
docker compose restart nginx
```

### NEXT_PUBLIC_* Variables Are Build-Time
Landing/canvas need rebuild after `.env` changes:
```bash
docker compose up -d landing --build
docker compose up -d web --build
```

### No sudo / No Node on Host
Use Docker for permission fixes:
```bash
docker run --rm -v /home/pixel/pixel:/data alpine chown -R 1000:1000 /data/<path>
```

## 🏗️ Production Services (Current)

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| **V1 API** | `pixel-api` | 3000 | Canvas engine |
| **V1 Landing** | `pixel-landing` | 3001 | Public entry point |
| **V1 Canvas** | `pixel-web` | 3002 | Collaborative canvas UI |
| **V2 Pixel** | `v2-pixel-1` | 4000 | Primary agent brain |
| **V2 Postgres** | `v2-postgres-v2-1` | 5433 | Agent DB |
| **Nginx** | `pixel-nginx` | 80/443 | Reverse proxy |
