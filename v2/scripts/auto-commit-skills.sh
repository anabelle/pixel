#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/pixel/pixel"
SRC="$REPO_DIR/v2/external/pixel/skills/arscontexta"
DEST="$REPO_DIR/v2/skills"
LOG="$REPO_DIR/v2/data/auto-commit-skills.log"

timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

log() {
  mkdir -p "$(dirname "$LOG")"
  printf "%s %s\n" "$(timestamp)" "$1" >> "$LOG"
}

if [ ! -d "$SRC" ]; then
  log "SKIP: arscontexta source missing"
  exit 0
fi

python3 - <<'PY' "$SRC" "$DEST"
import os
import shutil
import sys

src = sys.argv[1]
dest = sys.argv[2]

for root, dirs, files in os.walk(src):
    rel = os.path.relpath(root, src)
    target_dir = dest if rel == "." else os.path.join(dest, rel)
    os.makedirs(target_dir, exist_ok=True)
    for name in files:
        if not name.endswith(".md"):
            continue
        src_path = os.path.join(root, name)
        dest_path = os.path.join(target_dir, name)
        if not os.path.exists(dest_path):
            shutil.copy2(src_path, dest_path)
            continue
        src_stat = os.stat(src_path)
        dest_stat = os.stat(dest_path)
        if src_stat.st_mtime > dest_stat.st_mtime or src_stat.st_size != dest_stat.st_size:
            shutil.copy2(src_path, dest_path)
PY

cd "$REPO_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "SKIP: not a git repo"
  exit 0
fi

if git diff --quiet -- "$DEST"; then
  log "OK: no arscontexta changes"
  exit 0
fi

git add "$DEST"

if git diff --cached --quiet; then
  log "OK: nothing staged"
  exit 0
fi

if git commit -m "syntropy: sync arscontexta skills and observations" >/dev/null 2>&1; then
  log "OK: committed arscontexta sync"
else
  log "WARN: git commit failed"
fi
