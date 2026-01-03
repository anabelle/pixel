# Production Operations Guide (VPS)

This guide covers the procedures for deploying and maintaining the Pixel ecosystem on a VPS.

## 🚀 Rapid Deployment (Docker)

### 1. Bootstrap the Host
```bash
ssh pixel@your-vps
git clone --recursive https://github.com/anabelle/pixel.git
cd pixel
./scripts/setup/vps-bootstrap.sh  # Installs Docker, Node, Bun, and configures groups
exit # Logout and login to apply group changes
```

### 2. Configure Environment
```bash
cd pixel
cp .env.example .env
nano .env 
```
**Required Production Keys:**
- `GH_TOKEN`: GitHub PAT with repo scope (required for Syntropy self-evolution)
- `OPENAI_API_KEY`: Core LLM (required for agent)
- `OPENROUTER_API_KEY`: Multi-model AI routing
- `NAKAPAY_API_KEY`: Lightning Network payments

**Database Note:** This repo runs the ElizaOS agent on external PostgreSQL via `POSTGRES_URL` (Compose service `pixel-postgres`). The Postgres image includes `pgvector` so embedding/memory migrations can run cleanly.
- `NAKAPAY_API_KEY`: Lightning Network payments
- `TELEGRAM_BOT_TOKEN`: Telegram bot integration
- `DISCORD_API_TOKEN` / `DISCORD_APPLICATION_ID`: Discord bot integration

**Optional (disabled by default):**
- `TWITTER_*`: Twitter API credentials (plugin disabled until configured)

### 3. Launch
```bash
# Initial SSL setup (Certbot)
./scripts/init-ssl.sh 

# Start services
docker compose up -d --build
```

## 🛠️ Maintenance & Monitoring

### Common Operations
- **Update Ecosystem**: `git pull --recurse-submodules && docker compose up -d --build`
- **View Status**: `docker compose ps`
- **Follow Logs**: `docker compose logs -f syntropy` (or `agent`, `api`, etc.)
- **Restart Service**: `docker compose restart <service>`

### Health Monitoring
The ecosystem includes a unified status tool:
```bash
./scripts/monitoring/report-status.js # Provides System stats + PM2 (if used) + API health
```

### Automated Backups
Databases are stored in `./data/`.
- **Automated**: `./scripts/backup/autonomous-backup.sh` (runs via cron or Syntropy)
- **Manual**: `cp data/pixels.db backups/pixels-$(date +%Y%m%d).db`

## 🛡️ Deployment Safety Rules

1.  **Always Push Submodules First**: Never commit to the root without first pushing your submodule changes.
2.  **Test Locally Before Deploy**: Run `npm run dev` or `docker compose up` locally to verify changes.
3.  **Use Atomic Commits**: Update the root submodule pointer in the same commit as your documentation updates.

## 🚨 Emergency Recovery

### Container Loop/Crash
1. **Check Logs**: `docker compose logs --tail 100 <service>`
2. **Hard Rebuild**: `docker compose build --no-cache <service> && docker compose up -d <service>`
3. **Wipe Volumes (CAUTION)**: `docker compose down -v` (Only if data is backed up!)

### SSL Issues
If Nginx fails to start due to SSL, verify the paths in `nginx/nginx.conf` and ensure `certbot/conf` contains the certificates. You can regenerate with `./scripts/init-ssl.sh`.

---

## 🏗️ Production Services

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| **API** | `pixel-api` | 3000 | Core Lightning/Pixel engine |
| **Landing** | `pixel-landing` | 3001 | Public entry point |
| **Canvas** | `pixel-web` | 3002 | Collaborative art UI |
| **Agent** | `pixel-agent` | 3003 | ElizaOS social intelligence |
| **Syntropy**| `pixel-syntropy` | - | AI Orchestration & Self-Evolution |
| **Worker** | `pixel-worker-*` | - | Ephemeral coding containers (spawned on demand) |
| **PostgreSQL** | `pixel-postgres` | 5432 | Agent memory DB (pgvector enabled) |
| **Nginx** | `pixel-nginx` | 80/443| Secure reverse proxy |
| **VPS Monitor** | `vps-monitor` | - | Host metrics logs for Syntropy |

### Worker Architecture

Syntropy uses a **Brain/Hands separation pattern** for autonomous code modifications:

- **Brain (Syntropy)**: Plans tasks, monitors health, NEVER rebuilds itself
- **Hands (Worker)**: Ephemeral containers running Opencode for actual code changes
- **Task Ledger**: Persistent queue at `data/task-ledger.json`

Workers are spawned via `docker compose run worker` with a task ID. They:
1. Read task from ledger
2. Execute Opencode with the task briefing
3. Update ledger with results
4. Self-terminate

For full architecture details, see [WORKER_ARCHITECTURE.md](./docs/WORKER_ARCHITECTURE.md).

For deep technical details on plugin development or local builds, see the **[Technical Guide](./docs/TECH_GUIDE.md)**.
