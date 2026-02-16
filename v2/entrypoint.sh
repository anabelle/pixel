#!/bin/sh
# Pixel V2 entrypoint — fix permissions then drop to bun user
# This runs as root so it can chown mounted volumes, then exec's as bun.
# Survives rebuilds because it runs every container start, not just build.

set -e

# Fix ownership on all writable mount points
# These are bind-mounted from the host and may be root-owned after rebuild
# IMPORTANT: /app/data/postgres is mounted by the postgres container (UID 70)
# — we must NOT chown it to bun or postgres breaks
chown -R bun:bun /app/conversations /app/skills /app/tools /app/external 2>/dev/null || true

# Chown /app/data but skip the postgres subdirectory
find /app/data -maxdepth 0 -exec chown bun:bun {} \; 2>/dev/null || true
find /app/data -mindepth 1 -maxdepth 1 ! -name postgres -exec chown -R bun:bun {} \; 2>/dev/null || true

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
exec su-exec bun bun run src/index.ts
