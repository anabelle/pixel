#!/usr/bin/env bash
set -euo pipefail

# Syntropy Autonomous Dispatch
# Reads mailbox messages, selects best model, spawns opencode headlessly.
# ONE worker at a time. ONE session continued. Interactive verification with Pixel.

WORKDIR="/home/pixel/pixel"
OPENCODE="/home/pixel/.opencode/bin/opencode"
MAILBOX="$WORKDIR/v2/data/syntropy-mailbox.jsonl"
LOG="$WORKDIR/v2/data/syntropy-dispatch.log"
PIDFILE="$WORKDIR/v2/data/syntropy-dispatch.pid"
LOCKFILE="$WORKDIR/v2/data/.syntropy-dispatch.lock"
MAX_RUNTIME=900
PERSISTENT_SESSION_ID="ses_3a069e7e2ffe5gbtKNG3WVTLtc"

PIXEL_API="http://127.0.0.1:4000/api/chat"

OPENCODE_OUTPUT=""
EXIT_CODE=0
CLEANUP_ENABLED=false

timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

log() {
  printf "%s [dispatch] %s\n" "$(timestamp)" "$1" >> "$LOG"
}

log_opencode_errors() {
  if [ -n "$OPENCODE_OUTPUT" ] && [ -f "$OPENCODE_OUTPUT" ]; then
    if grep -q '"type":"error"' "$OPENCODE_OUTPUT"; then
      log "ERROR: opencode returned error event"
    fi
  fi
}

cleanup() {
  if [ "$CLEANUP_ENABLED" = true ]; then
    if [ -n "$OPENCODE_OUTPUT" ] && [ -f "$OPENCODE_OUTPUT" ]; then
      rm -f "$OPENCODE_OUTPUT"
    fi
    if [ -n "$OPENCODE_STATUS" ] && [ -f "$OPENCODE_STATUS" ]; then
      rm -f "$OPENCODE_STATUS"
    fi
    rm -f "$PIDFILE"
    rm -f "$LOCKFILE"
  fi
}

trap cleanup EXIT

notify_owner() {
  local msg=$1
  local payload
  payload=$(python3 - <<'PY' "$msg"
import json, sys
message = sys.argv[1]
body = {
  "message": f"use notify_owner to send this to ana: {message}",
  "userId": "syntropy-admin"
}
print(json.dumps(body))
PY
)
  curl -s --max-time 15 -X POST "$PIXEL_API" \
    -H "Content-Type: application/json" \
    -d "$payload" >/dev/null || true
}

# ── Log rotation (>1MB) ────────────────────────────────────────
if [ -f "$LOG" ]; then
  size=$(stat -c %s "$LOG" 2>/dev/null || echo 0)
  if [ "$size" -ge 1048576 ]; then
    mv "$LOG" "$LOG.1" 2>/dev/null || true
  fi
fi

# ── Guard: prevent concurrent runs ─────────────────────────────
if [ -f "$LOCKFILE" ]; then
  if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat "$PIDFILE" 2>/dev/null || echo "")
    if [ -n "$OLD_PID" ] && ! ps -p "$OLD_PID" > /dev/null 2>&1; then
      log "WARNING: stale PID file with no running process, clearing"
      rm -f "$PIDFILE"
      rm -f "$LOCKFILE"
    fi
  fi
fi

if [ -f "$LOCKFILE" ]; then
  lock_age_min=$(( ($(date +%s) - $(stat -c %Y "$LOCKFILE")) / 60 ))
  if [ "$lock_age_min" -lt 20 ]; then
    log "SKIP: another dispatch is running (lock age: ${lock_age_min}m)"
    exit 0
  fi
  log "WARNING: removing stale lock (age: ${lock_age_min}m)"
  if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat "$PIDFILE" 2>/dev/null || echo "")
    if [ -n "$OLD_PID" ] && ps -p "$OLD_PID" > /dev/null 2>&1; then
      log "WARNING: killing stale opencode process (PID $OLD_PID)"
      kill -TERM "$OLD_PID" 2>/dev/null || true
      sleep 3
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
    rm -f "$PIDFILE"
  fi
  rm -f "$LOCKFILE"
fi

# ── Verify mailbox has content ──────────────────────────────────
if [ ! -s "$MAILBOX" ]; then
  exit 0
fi

# ── Verify opencode exists ──────────────────────────────────────
if [ ! -x "$OPENCODE" ]; then
  log "ERROR: opencode not found at $OPENCODE"
  exit 1
fi

# ── Create lock ─────────────────────────────────────────────────
touch "$LOCKFILE"
CLEANUP_ENABLED=true

# ── Model selection helpers ─────────────────────────────────────
probe_zai() {
  local ZAI_KEY
  ZAI_KEY=$(grep "^ZAI_API_KEY=" "$WORKDIR/.env" | cut -d= -f2)
  if [ -z "$ZAI_KEY" ]; then
    return 1
  fi
  local HTTP_CODE
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    "https://api.z.ai/api/coding/paas/v4/chat/completions" \
    -H "Authorization: Bearer $ZAI_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"glm-4.7","messages":[{"role":"user","content":"ping"}],"max_tokens":1}' \
    2>/dev/null || echo "000")
  [ "$HTTP_CODE" = "200" ]
}

model_exists() {
  "$OPENCODE" models | grep -qx "$1"
}

notify_owner_and_retry() {
  log "ERROR: no approved model available"
  notify_owner "syntropy dispatch: no approved model available (zai/coding-plan down, copilot unavailable, free models missing). please check subscriptions/provider auth. will retry on next cron cycle."
  rm -f "$LOCKFILE"
  exit 2
}

select_model() {
  if probe_zai; then
    echo "zai-coding-plan/glm-4.7"
    return 0
  fi

  if model_exists "github-copilot/gpt-5.2-codex"; then
    echo "github-copilot/gpt-5.2-codex"
    return 0
  fi
  if model_exists "github-copilot/claude-opus-4.6"; then
    echo "github-copilot/claude-opus-4.6"
    return 0
  fi

  if model_exists "opencode/kimi-k2.5-free"; then
    echo "opencode/kimi-k2.5-free"
    return 0
  fi
  if model_exists "opencode/minimax-m2.5-free"; then
    echo "opencode/minimax-m2.5-free"
    return 0
  fi

  return 1
}

MODEL=$(select_model) || notify_owner_and_retry
log "INFO: selected model: $MODEL"

FREE_MODEL=false
case "$MODEL" in
  opencode/*-free) FREE_MODEL=true ;;
esac

# ── Verify Pixel is healthy ────────────────────────────────────
PIXEL_HEALTH="healthy"
HEALTH=$(curl -s --max-time 5 http://127.0.0.1:4000/health 2>/dev/null || echo "")
if [ -z "$HEALTH" ]; then
  PIXEL_HEALTH="unhealthy"
  log "WARNING: Pixel health check failed — proceeding (cannot debrief or verify interactively)"
fi

# ── Read all messages and build a single prompt ─────────────────
MSG_COUNT=$(wc -l < "$MAILBOX" | tr -d ' ')
log "ALERT: $MSG_COUNT message(s) in mailbox, building prompt"

MESSAGES=""
while IFS= read -r line; do
  msg=$(echo "$line" | jq -r '.message // empty' 2>/dev/null)
  priority=$(echo "$line" | jq -r '.priority // "normal"' 2>/dev/null)
  ts=$(echo "$line" | jq -r '.timestamp // "unknown"' 2>/dev/null)
  if [ -n "$msg" ]; then
    MESSAGES="${MESSAGES}[${ts}] (priority: ${priority}) ${msg}\n"
  fi
done < "$MAILBOX"

PROMPT="AUTONOMOUS SYNTROPY SESSION — Pixel sent ${MSG_COUNT} mailbox message(s):

${MESSAGES}

INSTRUCTIONS:
1. Read the mailbox at v2/data/syntropy-mailbox.jsonl to confirm these messages.
2. For each message: investigate, diagnose, and act.
3. Stay scoped — only handle what the messages ask about. Do NOT proactively audit infrastructure unless asked.
4. After fixing something, VERIFY it works by chatting with Pixel interactively:
   curl -s -X POST http://127.0.0.1:4000/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"<test prompt>\",\"userId\":\"syntropy-admin\"}'
   Read the response. If the fix didn't work, iterate until it does (max 3 attempts).
5. If you are forced onto a free model (opencode/*-free), be conservative, verify outputs explicitly, and note any uncertainty.
6. When done and verified, send a final debrief to Pixel summarizing what you did.
7. After the debrief, notify the owner on Telegram with a concise summary. Use the notify_owner tool explicitly (do NOT set reminders). This is mandatory for audit.
8. Clear the mailbox: echo -n '' > v2/data/syntropy-mailbox.jsonl
9. Do NOT make git commits unless you actually changed source code files.
10. Do NOT run periodic checks, self-examinations, or ecosystem scans.
11. When using docker exec against v2-pixel-1, ALWAYS use '-u bun' to avoid root-owned files.
12. Pixel is ${PIXEL_HEALTH} right now."

# ── Determine session continuation ──────────────────────────────
SESSION_ARGS="--session=$PERSISTENT_SESSION_ID"
log "INFO: continuing fixed session $PERSISTENT_SESSION_ID"

# ── Archive mailbox BEFORE running ──────────────────────────────
ARCHIVE="$MAILBOX.forwarded"
cp "$MAILBOX" "$ARCHIVE"
: > "$MAILBOX"

if [ "$FREE_MODEL" = true ]; then
  notify_owner "syntropy dispatch: using opencode *free* model as last resort. outputs will be verified and flagged if uncertain."
fi

# ── Spawn opencode ──────────────────────────────────────────────
log "INFO: spawning opencode (model: $MODEL, max runtime: ${MAX_RUNTIME}s)"

# ── Write model to a file Syntropy can read ────────────────────
MODEL_FILE="$WORKDIR/v2/data/syntropy-dispatch-model.txt"
echo "$MODEL" > "$MODEL_FILE"

PROMPT="${PROMPT}

MODEL VERIFICATION:
- Dispatch selected model: ${MODEL}
- This is also written to v2/data/syntropy-dispatch-model.txt for reliable reading.
- Host banner may show a different model name. Treat banner as authoritative for *this* session's actual model.
- If banner != dispatch model, note the mismatch in the debrief.
- Always include the model used in the owner audit notification.
"

OPENCODE_OUTPUT=$(mktemp)
OPENCODE_STATUS="$OPENCODE_OUTPUT.status"

SYNTROPY_DISPATCH_MODEL="$MODEL" timeout "$MAX_RUNTIME" "$OPENCODE" run \
  --agent=syntropy-admin \
  --model="$MODEL" \
  $SESSION_ARGS \
  --format=json \
  "$PROMPT" \
  > "$OPENCODE_OUTPUT" 2>&1

OPENCODE_EXIT=$?
echo "$OPENCODE_EXIT" > "$OPENCODE_STATUS"

EXIT_CODE=$OPENCODE_EXIT

log "INFO: opencode completed (exit $EXIT_CODE)"

# ── Fixed session ID (no persistence needed) ────────────────────

# ── Post-run ownership audit ────────────────────────────────────
ROOT_FILES=$(find "$WORKDIR/v2" -user root \
  -not -path "*/data/postgres/*" \
  -not -path "*/node_modules/*" \
  -type f 2>/dev/null | head -5 || true)
if [ -n "$ROOT_FILES" ]; then
  log "WARNING: root-owned files detected after dispatch, fixing ownership"
  docker run --rm -v "$WORKDIR:/data" alpine \
    chown -R 1000:1000 /data/v2/data /data/v2/conversations /data/v2/skills 2>/dev/null || true
fi

# ── Normalize exit code when opencode completed ─────────────────
if [ "$EXIT_CODE" -ne 0 ] && [ -f "$OPENCODE_OUTPUT" ]; then
  if grep -q '"type":"step_finish"' "$OPENCODE_OUTPUT"; then
    EXIT_CODE=0
  fi
fi

# ── Log result ──────────────────────────────────────────────────
case "$EXIT_CODE" in
  0)   log "SUCCESS: dispatch completed normally" ;;
  124) log "WARNING: dispatch timed out after ${MAX_RUNTIME}s" ;;
  *)   log "ERROR: dispatch failed with exit code $EXIT_CODE" ;;
esac

# Disable cleanup error log now that status is recorded
EXIT_CODE=0

log_opencode_errors

# ── FYI notification to owner ───────────────────────────────────
notify_owner "syntropy dispatch completed. messages: ${MSG_COUNT}, model: ${MODEL}, exit: ${EXIT_CODE}. please check pixel debrief for details."

exit 0
