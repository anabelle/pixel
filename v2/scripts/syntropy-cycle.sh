#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/pixel/pixel"
DATA_DIR="$REPO_DIR/v2/data"
LOG_FILE="$DATA_DIR/syntropy-cycle.log"
NDJSON_FILE="$DATA_DIR/syntropy-cycle.ndjson"
MAILBOX_FILE="$DATA_DIR/syntropy-mailbox.jsonl"
AUDIT_FILE="$DATA_DIR/audit.jsonl"

timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

log() {
  mkdir -p "$DATA_DIR"
  printf "%s %s\n" "$(timestamp)" "$1" >> "$LOG_FILE"
}

rotate_if_large() {
  local file="$1"
  local max_bytes="${2:-1048576}"
  if [ -f "$file" ]; then
    local size
    size=$(stat -c %s "$file" 2>/dev/null || echo 0)
    if [ "$size" -ge "$max_bytes" ]; then
      mv "$file" "$file.1" 2>/dev/null || true
    fi
  fi
}

cd "$REPO_DIR"

mkdir -p "$DATA_DIR"
touch "$MAILBOX_FILE"

rotate_if_large "$LOG_FILE"
rotate_if_large "$NDJSON_FILE" "2097152"

log "START: syntropy cycle"

HEALTH_JSON="$(curl -s --max-time 5 http://127.0.0.1:4000/health || echo "ERROR: health endpoint unreachable")"
STATS_JSON="$(curl -s --max-time 5 http://127.0.0.1:4000/api/stats || echo "ERROR: stats endpoint unreachable")"

AUDIT_TAIL="(missing audit file)"
if [ -f "$AUDIT_FILE" ]; then
  AUDIT_TAIL="$(tail -n 200 "$AUDIT_FILE" 2>/dev/null || true)"
  if [ -z "$AUDIT_TAIL" ]; then
    AUDIT_TAIL="(audit file empty)"
  fi
fi

MAILBOX_TAIL="(empty)"
if [ -s "$MAILBOX_FILE" ]; then
  MAILBOX_TAIL="$(tail -n 200 "$MAILBOX_FILE" 2>/dev/null || true)"
fi

V2_PS="$(docker compose -f v2/docker-compose.yml ps 2>&1 || true)"
V1_PS="$(docker compose ps 2>&1 || true)"
DISK="$(df -h / 2>/dev/null || true)"
MEMORY="$(free -m 2>/dev/null || true)"

PROMPT_FILE="$(mktemp)"
cat > "$PROMPT_FILE" <<'EOF'
You are Syntropy, the oversoul and infrastructure orchestrator for the Pixel ecosystem.

Your job in this cycle is to interpret the context and decide what to do. Be dynamic and intelligent.
If something is broken or degraded, investigate and fix it. If everything looks healthy, send a brief check-in to Pixel.

Rules:
- Use safe, reversible actions. Avoid destructive commands.
- If you need to change code, describe the change and apply it carefully.
- Communicate with Pixel via HTTP: POST http://127.0.0.1:4000/api/chat with userId="syntropy".
- If you respond to the mailbox, summarize what you did and what remains.
- Keep responses concise and operational. Spanish is fine.
EOF

{
  printf "\n## Context: Health (/health)\n%s\n" "$HEALTH_JSON"
  printf "\n## Context: Stats (/api/stats)\n%s\n" "$STATS_JSON"
  printf "\n## Context: Mailbox (Pixel -> Syntropy)\n%s\n" "$MAILBOX_TAIL"
  printf "\n## Context: Recent audit tail (data/audit.jsonl)\n%s\n" "$AUDIT_TAIL"
  printf "\n## Context: V2 containers (docker compose -f v2/docker-compose.yml ps)\n%s\n" "$V2_PS"
  printf "\n## Context: V1 containers (docker compose ps)\n%s\n" "$V1_PS"
  printf "\n## Context: Disk (df -h /)\n%s\n" "$DISK"
  printf "\n## Context: Memory (free -m)\n%s\n" "$MEMORY"
} >> "$PROMPT_FILE"

SESSION_ID=""
if [ -f "$NDJSON_FILE" ]; then
  SESSION_ID=$(python3 - "$NDJSON_FILE" <<'PY'
import json
import sys
path = sys.argv[1]
session = ""
try:
  with open(path, "r", encoding="utf-8") as f:
    for line in f:
      line = line.strip()
      if not line or not line.startswith("{"):
        continue
      try:
        data = json.loads(line)
      except Exception:
        continue
      sid = data.get("sessionID") or data.get("sessionId")
      if isinstance(sid, str) and sid.startswith("ses"):
        session = sid
except Exception:
  session = ""
print(session)
PY
)
fi

SESSION_ARGS=()
if [ -n "$SESSION_ID" ]; then
  SESSION_ARGS=(--session "$SESSION_ID")
fi

if /home/pixel/.opencode/bin/opencode run "$(cat "$PROMPT_FILE")" \
  "${SESSION_ARGS[@]}" \
  --model opencode/kimi-k2.5-free \
  --format json \
  --title "Syntropy cycle" >> "$NDJSON_FILE" 2>&1; then
  : > "$MAILBOX_FILE"
  log "OK: cycle complete"
else
  log "ERROR: opencode run failed"
  exit 1
fi

rm -f "$PROMPT_FILE"
