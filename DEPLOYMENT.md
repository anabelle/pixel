# Production Operations Guide

This guide covers the procedures for maintaining and recovering the Pixel ecosystem in production.

## 🐳 Docker Deployment (Recommended)

### Initial Deployment
```bash
# Clone and setup
git clone --recursive git@github.com:anabelle/pixel.git
cd pixel
cp .env.example .env
nano .env  # Add your secrets

# Restore database if needed
node restore_pixels.js pixels.json data/pixels.db

# Start all services
docker compose up -d --build
```

### Redeployment (Update Code)
```bash
git pull --recurse-submodules
docker compose up -d --build
```

### Common Commands
```bash
# View status
docker compose ps

# View logs (all or specific service)
docker compose logs -f
docker compose logs -f api

# Restart a service
docker compose restart <service>

# Rebuild and restart a service
docker compose up -d --build <service>

# Stop all services
docker compose down

# Shell into container
docker compose exec <service> sh
```

## 🛠️ Maintenance Tasks

### Database Backups
With Docker, databases are stored in `./data/`:
```bash
# Manual backup
cp data/pixels.db backups/pixels-$(date +%Y%m%d).db

# Automated backup (add to cron)
./autonomous-backup.sh
```

### Health Monitoring
```bash
# Check container health
docker compose ps

# API stats
curl http://localhost:3000/api/stats

# Resource usage
docker stats
```

## 🚨 Emergency Recovery

### Service won't start
```bash
# Check logs
docker compose logs <service>

# Rebuild from scratch
docker compose build --no-cache <service>
docker compose up -d <service>
```

### Database issues
```bash
# Restore from backup
node restore_pixels.js pixels.json data/pixels.db

# Or from a backup file
cp backups/pixels-YYYYMMDD.db data/pixels.db
docker compose restart api
```

### Complete reset
```bash
docker compose down
docker compose up -d --build
```

## 📝 Services

| Service | Container | Port | Runtime | Description |
|---------|-----------|------|---------|-------------|
| API | pixel-api | 3000 | Node.js | Express + Socket.IO |
| Web App | pixel-web | 3002 | Bun + Next.js | Canvas UI |
| Landing | pixel-landing | 3001 | Node.js + Next.js | Landing page |
| Agent | pixel-agent | - | Bun + ElizaOS | AI Agent |
| Syntropy | pixel-syntropy | - | Bun | AI Orchestration |

## 🌐 Reverse Proxy (Caddy)

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

---

## 📜 Legacy: PM2 Deployment

> **Note**: Docker is now the recommended deployment method. PM2 instructions kept for reference.

### Start with PM2
```bash
npm run deploy:production
# or
pm2 start ecosystem.config.js
```

### PM2 Commands
```bash
pm2 restart <service>
pm2 logs <service>
pm2 status
pm2 reload all
```

| Service | PM2 Name | Port |
|---------|----------|------|
| LNPixels API | lnpixels-api | 3000 |
| LNPixels App | lnpixels-app | 3002 |
| Pixel Agent | pixel-agent | - |
| Pixel Landing | pixel-landing | 3001 |
| Syntropy Core | syntropy-core | - |
