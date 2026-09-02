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
- `ZAI_API_KEY`: Z.AI Coding Lite API key (GLM-5.3/4.7)
- `GEMINI_API_KEY`: Google Gemini key (fallback + vision)
- `TELEGRAM_BOT_TOKEN`: Telegram bot integration
- `BLINK_API_KEY` (canvas LN payments — Blink/Galoy provider)

**AI Provider Setup (Current: Z.AI primary + Gemini fallback):**
```env
AI_PROVIDER=zai
AI_MODEL=glm-5.3
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
- **Canvas (V1):** `developero/bin/backup-canvas.sh` (cron 4:17am, backup online WAL-safe vía API, retención 30d). NUNCA `cp` en frío: WAL activo pierde datos (path real `data/lnpixels/pixels.db`).
- **V2 Postgres:** `v2/scripts/backup-pixel-v2.sh` (cron 3:30am, pg_dump -Fc, rotación 30d).

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
| **Nostr relay** | `strfry-relay` | 7777 | Nostr relay (crítico para acars.pub) |
