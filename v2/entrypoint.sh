#!/bin/sh
# Pixel V2 entrypoint — fix permissions then drop to bun user
# This runs as root so it can chown mounted volumes, then exec's as bun.
# Survives rebuilds because it runs every container start, not just build.

set -e

# Fix ownership on all writable mount points
# These are bind-mounted from the host and may be root-owned after rebuild
chown -R bun:bun /app/conversations /app/skills /app/tools /app/external /app/.pi 2>/dev/null || true

# Chown /app/data (postgres now uses named volume, so no conflict)
chown -R bun:bun /app/data 2>/dev/null || true

# Ensure OpenViking runtime directories exist and are writable by bun
mkdir -p /app/data/openviking /app/data/log 2>/dev/null || true
chown -R bun:bun /app/data/openviking /app/data/log 2>/dev/null || true

# Generate OpenViking runtime config at boot in writable data dir
OPENVIKING_BOOT_CONFIG=/app/data/openviking/openviking-ov.conf
cat > "$OPENVIKING_BOOT_CONFIG" <<EOF
{
  "server": {
    "host": "127.0.0.1",
    "port": 1933,
    "workers": 1,
    "cors_origins": ["*"]
  },
  "storage": {
    "workspace": "/app/data/openviking",
    "agfs": {
      "mode": "http-client",
      "backend": "local",
      "port": 1833,
      "log_level": "warn",
      "timeout": 10
    },
    "vectordb": {
      "backend": "local"
    }
  },
  "log": {
    "level": "INFO",
    "output": "stdout"
  },
  "embedding": {
    "dense": {
      "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
      "api_key": "${GOOGLE_GENERATIVE_AI_API_KEY:-${GEMINI_API_KEY:-}}",
      "provider": "openai",
      "dimension": 3072,
      "model": "gemini-embedding-001"
    },
    "max_concurrent": 4
  },
  "vlm": {
    "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "api_key": "${GOOGLE_GENERATIVE_AI_API_KEY:-${GEMINI_API_KEY:-}}",
    "provider": "openai",
    "model": "gemini-2.5-flash",
    "max_concurrent": 8
  }
}
EOF

chown bun:bun "$OPENVIKING_BOOT_CONFIG" 2>/dev/null || true

export OPENVIKING_CONFIG_FILE="$OPENVIKING_BOOT_CONFIG"

# Start OpenViking server in background if runtime is available
if [ -x /opt/openviking-venv/bin/openviking-server ]; then
  su-exec bun sh -lc 'if [ -f "$OPENVIKING_CONFIG_FILE" ]; then nohup /opt/openviking-venv/bin/openviking-server --host 127.0.0.1 --port 1933 --config "$OPENVIKING_CONFIG_FILE" </dev/null > /app/data/log/openviking.log 2>&1 & fi' || true
fi

# Some pi docs and extensions expect /external to exist.
# Keep it pointed at Pixel's canonical bind mount.
if [ ! -e /external ]; then
  ln -s /app/external /external 2>/dev/null || true
fi

# Add bun user to docker group (GID from group_add) so it can use docker.sock
DOCKER_GID=$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo "")
if [ -n "$DOCKER_GID" ] && [ "$DOCKER_GID" != "0" ]; then
  addgroup -g "$DOCKER_GID" docker 2>/dev/null || true
  addgroup bun docker 2>/dev/null || true
fi

# Patch Baileys v6 LID bug for group messaging
# Bug: relayMessage uses isLid (derived from destination @g.us) to encode participant JIDs,
# but group participants use @lid format. This causes "No sessions" errors because
# LID numbers get encoded as @s.whatsapp.net (invalid).
# Fix: Node.js script does exact string replacements — no sed escaping issues.
# Idempotent: checks for PIXEL_LID_PATCH marker before applying.
if [ -f /app/scripts/patch-baileys-lid.js ]; then
  bun /app/scripts/patch-baileys-lid.js
fi

# Drop to bun user and run the app
# Note: server registry loads from /app/servers.json at runtime via server-registry.ts
exec su-exec bun bun run src/index.ts
