#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/pixel/pixel"
LOG_FILE="/home/pixel/pixel/v2/data/auto-update.log"

timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

log() {
  mkdir -p "$(dirname "$LOG_FILE")"
  printf "%s %s\n" "$(timestamp)" "$1" >> "$LOG_FILE"
}

cd "$REPO_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "SKIP: not a git repo"
  exit 0
fi

# Avoid updates when there are local changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  log "SKIP: working tree has local changes"
  exit 0
fi

# Ensure we have an upstream
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  log "SKIP: no upstream configured"
  exit 0
fi

git fetch --quiet

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse @{u})"

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  log "OK: already up to date"
  exit 0
fi

# Check if remote is ahead of local (we're behind)
# If local is ahead of remote, don't rebuild
if git merge-base --is-ancestor HEAD @{u}; then
  # HEAD is ancestor of upstream, meaning upstream has new commits
  log "UPDATE: origin is ahead, pulling latest changes"
  git pull --ff-only
else
  # Local has commits that remote doesn't (or diverged)
  log "SKIP: local is ahead of origin (commits not pushed)"
  exit 0
fi

log "UPDATE: rebuilding pixel container"
docker compose -f v2/docker-compose.yml up -d --build pixel

log "OK: update complete"
