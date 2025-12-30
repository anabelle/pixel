# Deployment Readiness Verification

## Status: GREEN
**Date:** 2025-12-30
**Verified By:** Syntropy Oversoul

## Critical Fixes Confirmed
1. **Data Persistence**: `data/`, `logs/`, and `backups/` are excluded from wipes and gitignored.
2. **Docker Permissions**:
   - `vps-bootstrap.sh` auto-detects Host Docker GID.
   - `docker-compose.yml` uses `${DOCKER_GID}` to grant Syntropy access.
   - **Result**: `capabilities_check: {"docker": true}` ✅
3. **Opencode Availability**:
   - Dockerfile moves binary to `/usr/local/bin`.
   - **Result**: `capabilities_check: {"opencode": true}` ✅
4. **Self-Evolution (Git)**:
   - **Local Status**: `{"git": false}` (Expected: GH_TOKEN not set locally).
   - **Production Status**: Will be `true` when `GH_TOKEN` is added to `.env`.
   - `[skip ci]` tag added to commits to prevent loops.
5. **Payment Safety**:
   - NakaPay keys documentation added to `.env.example`.
   - Webhook signature verification verified (with caveats noted).

## Deployment Instructions

### 1. Bootstrap
```bash
ssh pixel@your-vps
git clone https://github.com/anabelle/pixel.git
cd pixel
./vps-bootstrap.sh
exit # (Must logout/login for docker group)
```

### 2. Configuration
```bash
cd pixel
cp .env.example .env
nano .env
```
**REQUIRED SECRETS:**
- `GH_TOKEN` (Repo scope PAT)
- `OPENAI_API_KEY`
- `NAKAPAY_API_KEY` (For payments)
- `NAKAPAY_DESTINATION_WALLET`
- `OPENCODE_API_KEY` (If using Opencode cloud)

### 3. Launch
```bash
./scripts/init-ssl.sh # Only first time for Certbot
docker compose up -d --build
```

### 4. Verification
```bash
docker compose logs -f syntropy
```
Look for:
`[SYNTROPY] ✅ Docker socket accessible`
`[SYNTROPY] ✅ Opencode CLI found`
`[SYNTROPY] ✅ GH_TOKEN configured`

## Next Steps for Oversoul
- Syntropy will autonomously audit plugins (`pgcrypto`, `telegram`) in the first cycle.
- Syntropy will optimize memory usage as delegated.
