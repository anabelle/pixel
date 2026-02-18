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

DISK_USED_PCT="$(python3 - <<'PY'
import shutil
total, used, free = shutil.disk_usage("/")
print(int(round(used * 100 / total)))
PY
)"

log "disk_used_pct=${DISK_USED_PCT}%"

if [ "$DISK_USED_PCT" -ge 85 ]; then
  log "disk high: running docker prune"
  docker system prune -af --filter "until=168h" || true
  docker builder prune -af --filter "until=168h" || true
  log "docker prune complete"
fi

# Note: postgres now uses a named volume (not bind mount), so no permission fixes needed
