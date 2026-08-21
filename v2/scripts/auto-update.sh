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

# Auto-sync arscontexta skills before update checks
if [ -x "/home/pixel/pixel/v2/scripts/auto-commit-skills.sh" ]; then
  /home/pixel/pixel/v2/scripts/auto-commit-skills.sh || true
fi

# Clone discipline: auto-commit local source/content changes so pulls can proceed.
# Scoped policy (AGENTS.md): NEVER auto-commit data, conversations, logs, or secrets.
# Submodule pointer bumps are excluded (committed deliberately by humans/sessions).
if ! git -c diff.ignoreSubmodules=all diff --quiet || ! git diff --cached --quiet; then
  git add -A -- ':!lnpixels' ':!pixel-landing' ':!v2/data' ':!v2/conversations' \
                ':!v2/external' ':!v2/data/.clawstr' ':!*.log' ':!*.env' ':!*.env.*' 2>/dev/null || true
  if git diff --cached --quiet; then
    log "WARN: tree dirty but nothing safe to auto-commit; skipping update"
    exit 0
  fi
  if git commit -m "syntropy: auto-commit local changes (clone discipline)" --no-verify >/dev/null 2>&1; then
    log "OK: auto-committed local changes (clone discipline)"
  else
    log "WARN: auto-commit failed; skipping update"
    exit 0
  fi
fi

# Submodule dirt must not block updates (pointer changes are committed deliberately)
if ! git -c diff.ignoreSubmodules=all diff --quiet || ! git diff --cached --quiet; then
  log "SKIP: working tree has local changes"
  exit 0
fi

# Keep the runtime content clone (arscontexta source) current too — ff-only, no rebuild
EXT_REPO="/home/pixel/pixel/v2/external/pixel"
if [ -d "$EXT_REPO/.git" ]; then
  if git -C "$EXT_REPO" diff --quiet 2>/dev/null; then
    git -C "$EXT_REPO" fetch --quiet 2>/dev/null || true
    if git -C "$EXT_REPO" merge-base --is-ancestor HEAD @{u} 2>/dev/null; then
      git -C "$EXT_REPO" pull --ff-only --quiet 2>/dev/null \
        && log "OK: external pixel clone updated to $(git -C "$EXT_REPO" rev-parse --short HEAD)" \
        || log "WARN: external pixel clone pull failed"
    fi
  else
    log "SKIP: external pixel clone has local changes"
  fi
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
# If local is ahead of remote, push to keep remote synced (discipline)
if git merge-base --is-ancestor HEAD @{u}; then
  # HEAD is ancestor of upstream: origin is ahead — pull and rebuild
  log "UPDATE: origin is ahead, pulling latest changes"
  git pull --ff-only
elif git merge-base --is-ancestor @{u} HEAD; then
  # Local strictly ahead of origin — push our commits
  log "UPDATE: local is ahead of origin, pushing"
  git push origin HEAD --no-verify >/dev/null 2>&1 \
    && log "OK: pushed local commits to origin" \
    || log "WARN: push failed (will retry next cycle)"
  exit 0
else
  # Diverged — needs human/session intervention
  log "SKIP: local and origin have diverged"
  exit 0
fi

log "UPDATE: rebuilding pixel container"
docker compose -f v2/docker-compose.yml up -d --build pixel

# Note: postgres now uses a named volume (not bind mount), so no permission fixes needed

log "OK: update complete"
