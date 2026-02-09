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
- `OPENAI_API_KEY`: LLM provider API key. Currently set to a **Google Gemini API key** routed via OpenAI-compatible endpoint (see AI Provider Setup below)
- `NAKAPAY_API_KEY`: Lightning Network payments
- `TELEGRAM_BOT_TOKEN`: Telegram bot integration

**AI Provider Setup (Current: Google Gemini Free Tier):**
The agent uses Google Gemini via OpenAI-compatible API, not actual OpenAI:
```env
OPENAI_API_KEY=<your-google-gemini-api-key>
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_SMALL_MODEL=gemini-2.0-flash
OPENAI_LARGE_MODEL=gemini-2.5-flash
EMBEDDING_PROVIDER=openai
USE_OPENAI_EMBEDDING=true
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```
> **Warning**: The `@ai-sdk/openai` package has two known incompatibilities with Gemini that are patched at Docker build time in `pixel-agent/Dockerfile`:
> 1. It defaults to the `/responses` endpoint (Gemini only supports `/chat/completions`) -- patched to force `createChatModel`
> 2. It sends `stop: []` (empty array) which Gemini rejects -- patched to send `undefined` instead

**Optional:**
- `OPENROUTER_API_KEY`: Multi-model AI fallback routing (free tier available with no key)
- `DISCORD_API_TOKEN` / `DISCORD_APPLICATION_ID`: Discord bot integration
- `TWITTER_*`: Twitter API credentials (plugin disabled until configured)

**Database Note:** This repo runs the ElizaOS agent on external PostgreSQL via `POSTGRES_URL` (Compose service `pixel-postgres`). The Postgres image includes `pgvector` so embedding/memory migrations can run cleanly.

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

0.  **The VPS is the Truth**: The production environment (`65.181.125.80`) is the only absolute reality. Always check there before trusting local state.
1.  **Always Push Submodules First**: Never commit to the root without first pushing your submodule changes.
2.  **Test Locally Before Deploy**: Run `npm run dev` or `docker compose up` locally to verify changes.
3.  **Use Atomic Commits**: Update the root submodule pointer in the same commit as your documentation updates.

## Operational Gotchas (Hard-Won Knowledge)

### Nginx DNS Caching (502 After Container Recreation)
Nginx resolves upstream hostnames at startup and caches the IP. When `docker compose up -d --build` recreates a container, the container gets a new Docker-internal IP, but nginx still points to the old one -- resulting in **502 Bad Gateway**.

**Current mitigation**: `nginx/nginx.conf` uses Docker's embedded DNS resolver (`resolver 127.0.0.11 valid=10s`) with variable-based `proxy_pass` (`set $var http://service:port; proxy_pass $var`). This forces re-resolution every 10 seconds. If you ever revert to static `upstream` blocks, you **must** restart nginx after any container recreation.

### NEXT_PUBLIC_* Variables Are Baked at Build Time
Next.js `NEXT_PUBLIC_*` environment variables are embedded into the JavaScript bundle at **build time**, not runtime. Changing `.env` alone is not enough -- you must **rebuild the web container** (`docker compose up -d web --build`). The `NEXT_PUBLIC_API_URL` must be set to `https://ln.pixel.xx.kg/api` (the public domain), not `http://127.0.0.1:3000/api` (which would make the browser try to reach localhost).

### No sudo / No Node on Host
The `pixel` user has no sudo access. Use `docker run --rm` with Alpine for permission fixes (e.g., `docker run --rm -v /home/pixel/pixel:/data alpine chown -R 1000:1000 /data/somefile`). There is no Node/npm/bun installed on the host -- all build tools run inside Docker containers.

### Container Rebuild Cascades
Running `docker compose up -d web --build` may also recreate `api` and `narrative-correlator` due to the dependency chain. After any rebuild, verify all dependent containers are still healthy with `docker compose ps`.

### ai-sdk Patches in Agent Dockerfile
The `pixel-agent/Dockerfile` applies `perl -pi -e` patches to `@ai-sdk/openai` package files (both `index.js` and `index.mjs` since Bun uses ESM). These patches are fragile and must be verified after any `@ai-sdk/openai` version update. The patches fix:
1. `/responses` -> `/chat/completions` endpoint routing
2. `stop: []` empty array rejection
3. Telegram error handling and crash prevention

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
| **pgAdmin** | `pixel-pgadmin` | 5050 | Database GUI (on-demand, `tools` profile) |
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
