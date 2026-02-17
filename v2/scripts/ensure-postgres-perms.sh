#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/home/pixel/pixel/v2/data/host-health.log"

timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

log() {
  mkdir -p "$(dirname "$LOG_FILE")"
  printf "%s %s\n" "$(timestamp)" "$1" >> "$LOG_FILE"
}

if ! command -v docker >/dev/null 2>&1; then
  log "postgres perms: docker not available, skip"
  exit 0
fi

if ! docker ps --format '{{.Names}}' | grep -q '^v2-postgres-v2-1$'; then
  log "postgres perms: container not running, skip"
  exit 0
fi

owner_uid=$(docker exec v2-postgres-v2-1 stat -c %u /var/lib/postgresql/data 2>/dev/null || echo "")
owner_gid=$(docker exec v2-postgres-v2-1 stat -c %g /var/lib/postgresql/data 2>/dev/null || echo "")

if [ "$owner_uid" != "999" ] || [ "$owner_gid" != "999" ]; then
  log "postgres perms: fixing inside container (uid=${owner_uid:-unknown} gid=${owner_gid:-unknown})"
  docker exec v2-postgres-v2-1 chown -R 999:999 /var/lib/postgresql/data || log "postgres perms: container fix failed"
  log "postgres perms: container fix complete"
else
  log "postgres perms: container OK (uid=$owner_uid gid=$owner_gid)"
fi
