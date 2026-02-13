#!/bin/sh
# Pixel V2 entrypoint — fix permissions then drop to bun user
# This runs as root so it can chown mounted volumes, then exec's as bun.
# Survives rebuilds because it runs every container start, not just build.

set -e

# Fix ownership on all writable mount points
# These are bind-mounted from the host and may be root-owned after rebuild
chown -R bun:bun /app/conversations /app/skills /app/tools /app/data /app/external 2>/dev/null || true

# Drop to bun user and run the app
exec su-exec bun bun run src/index.ts
