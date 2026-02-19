#!/usr/bin/env bash
set -euo pipefail

POSTGRES_DIR="/home/pixel/pixel/v2/data/postgres"
LOG_FILE="/home/pixel/pixel/v2/data/host-health.log"
EXPECTED_UID=999
EXPECTED_GID=999

timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

log() {
  mkdir -p "$(dirname "$LOG_FILE")"
  printf "%s %s\n" "$(timestamp)" "$1" >> "$LOG_FILE"
}

if [ ! -d "$POSTGRES_DIR" ]; then
  log "postgres perms: directory missing, skip"
  exit 0
fi

owner_uid=$(stat -c %u "$POSTGRES_DIR" 2>/dev/null || echo "")
owner_gid=$(stat -c %g "$POSTGRES_DIR" 2>/dev/null || echo "")

needs_fix=false
if [ "$owner_uid" != "$EXPECTED_UID" ] || [ "$owner_gid" != "$EXPECTED_GID" ]; then
  needs_fix=true
fi

if [ "$needs_fix" = false ]; then
  mismatch=$(docker run --rm -v "$POSTGRES_DIR:/data" alpine sh -lc "find /data -not -user $EXPECTED_UID -o -not -group $EXPECTED_GID -print -quit" 2>/dev/null || true)
  if [ -n "$mismatch" ]; then
    needs_fix=true
  fi
fi

if [ "$needs_fix" = true ]; then
  log "postgres perms: mismatch detected (uid=${owner_uid:-unknown} gid=${owner_gid:-unknown}), fixing"
  docker run --rm -v "$POSTGRES_DIR:/data" alpine sh -lc "chown -R $EXPECTED_UID:$EXPECTED_GID /data" || log "postgres perms: fix failed"
  log "postgres perms: fix complete"
else
  log "postgres perms: OK (uid=$owner_uid gid=$owner_gid)"
fi
