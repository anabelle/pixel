# 🛠️ Pixel Technical Guide (V2)

This document is the consolidated technical reference for building, testing, and troubleshooting the **current V2** Pixel ecosystem.

## 📦 Repositories & Submodules
- **Root**: orchestration + V1 services (canvas + landing) + docs
- **`v2/`**: primary agent brain (Pi agent-core + Hono)
- **`pixel-landing/`**: public landing UI (Next.js)
- **`lnpixels/`**: canvas API + web UI (V1 revenue source)

## ⚠️ THE PRODUCTION TRUTH
The VPS (`65.181.125.80`) is the source of truth. Always verify state via SSH or container health.

## 🧭 Current Architecture
- **V2** runs the agent brain (`v2-pixel-1`) + Postgres (`v2-postgres-v2-1`).
- **V1** still serves canvas + landing behind nginx.
- **Nginx** proxies public traffic to V1/V2 routes.

## 🗝️ Core Commands

### V1 (Legacy: canvas + landing)
```bash
docker compose ps
docker compose logs -f api --tail=100
docker compose logs -f landing --tail=100
docker compose logs -f web --tail=100
```

### V2 (Primary agent brain)
```bash
docker compose -f v2/docker-compose.yml ps
docker compose -f v2/docker-compose.yml logs -f pixel --tail=100
```

### Health Checks
```bash
curl http://localhost:4000/health      # V2 Pixel
curl http://localhost:3000/api/stats   # V1 Canvas API
curl http://localhost:3001             # V1 Landing
curl http://localhost:3002             # V1 Canvas Web
```

## 🤖 AI Provider Architecture

**Primary model:** Z.AI GLM-4.7 (reasoning, 128K)
**Background model:** Z.AI GLM-4.5-air (fast, no reasoning)
**Fallback chain:** Gemini 3 Flash → Gemini 2.5 Flash → Gemini 2.0 Flash

Key env vars (see `.env`):
- `AI_PROVIDER=zai`
- `AI_MODEL=glm-4.7`
- `ZAI_API_KEY=...`
- `GEMINI_API_KEY=...` (fallback + vision)

## 📡 V2 API (Hono)
Base: `https://pixel.xx.kg/v2/api`

Key endpoints:
- `POST /chat` (free)
- `POST /chat/premium` (L402, 10 sats)
- `POST /generate` (L402, 50 sats)
- `GET /posts` (Nostr posts feed)
- `GET /conversations/:userId` (auth-gated)
- `GET /stats`, `GET /revenue`, `GET /jobs`

## 🔧 Troubleshooting

### V2 agent not responding
- Check logs: `docker compose -f v2/docker-compose.yml logs -f pixel --tail=200`
- Verify model keys in `.env`
- Check health: `curl http://localhost:4000/health`

### Landing/dashboard stale data
- Confirm API routes are up: `curl http://localhost:4000/api/stats`
- Ensure nginx routes `/v2/*` to V2 container

### Nginx 502
- Restart nginx: `docker compose restart nginx`

### Permission denied (files)
```bash
docker run --rm -v /home/pixel/pixel:/data alpine chown -R 1000:1000 /data/<path>
```

## 🧪 Testing

V2 has no formal automated test suite yet. For changes:
- Run TypeScript build where applicable.
- Use health endpoints and logs to validate behavior.
