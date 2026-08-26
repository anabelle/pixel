#!/usr/bin/env bash
set -euo pipefail

# Developero Relay Dispatch — answers [for-developero] questions from Pixel.
# Triggered by check-mailbox.sh when the developero queue is non-empty.
# Pattern modeled on syntropy-dispatch.sh (proven). One worker at a time.

WORKDIR="/home/pixel/developero"
OPENCODE="/home/pixel/.opencode/bin/opencode"
MAILBOX="/home/pixel/pixel/v2/data/developero-mailbox.jsonl"
LOG="/home/pixel/pixel/v2/data/developero-dispatch.log"
PIDFILE="/home/pixel/pixel/v2/data/developero-dispatch.pid"
LOCKFILE="/home/pixel/pixel/v2/data/.developero-dispatch.lock"
MAX_RUNTIME=600

timestamp() { date -u "+%Y-%m-%dT%H:%M:%SZ"; }
log() { printf "%s [dev-dispatch] %s\n" "$(timestamp)" "$1" >> "$LOG"; }

# Log rotation
if [ -f "$LOG" ] && [ "$(stat -c %s "$LOG" 2>/dev/null || echo 0)" -ge 524288 ]; then
  mv "$LOG" "$LOG.1" 2>/dev/null || true
fi

# Stale lock guard (10 min)
if [ -f "$LOCKFILE" ]; then
  lock_age=$(( ($(date +%s) - $(stat -c %Y "$LOCKFILE")) / 60 ))
  if [ "$lock_age" -lt 10 ]; then
    log "SKIP: another developero dispatch is running (lock age: ${lock_age}m)"
    exit 0
  fi
  log "WARNING: removing stale lock (age: ${lock_age}m)"
  rm -f "$LOCKFILE" "$PIDFILE"
fi

[ ! -s "$MAILBOX" ] && exit 0
[ ! -x "$OPENCODE" ] && { log "ERROR: opencode not found"; exit 1; }

touch "$LOCKFILE"
echo $$ > "$PIDFILE"
trap 'rm -f "$LOCKFILE" "$PIDFILE"' EXIT

# Model: same probe as syntropy dispatch (zai coding plan → fallbacks)
probe_zai() {
  ZAI_KEY=$(grep "^ZAI_API_KEY=" /home/pixel/pixel/.env 2>/dev/null | cut -d= -f2 || true)
  [ -z "$ZAI_KEY" ] && return 1
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    "https://api.z.ai/api/coding/paas/v4/chat/completions" \
    -H "Authorization: Bearer $ZAI_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"glm-5","messages":[{"role":"user","content":"ping"}],"max_tokens":1}' 2>/dev/null || echo "000")
  [ "$HTTP_CODE" = "200" ]
}

if probe_zai; then
  MODEL="zai-coding-plan/glm-5.3"
else
  MODEL="opencode/glm-5-free"
fi
log "INFO: model $MODEL, messages: $(wc -l < "$MAILBOX")"

# Archive before running
cp "$MAILBOX" "$MAILBOX.forwarded"
: > "$MAILBOX"

MESSAGES=$(cat "$MAILBOX.forwarded")

PROMPT="AUTONOMOUS DEVELOPERO RELAY — Pixel forwarded client question(s) she couldn't answer:

$MESSAGES

INSTRUCTIONS:
1. Full messages archived at /home/pixel/pixel/v2/data/developero-mailbox.forwarded (also above).
2. Each message includes the client question and the WhatsApp jid/number to reply to.
3. Investigate with your tools: repos/8servidores/AGENTS.md (hosting sunset), bin/uapi.py + .env (WHM/UAPI), VPS access. The answer must be real data, never invented.
4. Credentials the client legitimately owns (their FTP, their dates, their domains) CAN be relayed — they are theirs. Never expose secrets of OTHER accounts.
5. Deliver the answer to Pixel: curl -s -X POST http://localhost:4000/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"...\",\"userId\":\"developero\"}' — include explicit instruction 'retransmitilo por WhatsApp a <jid>'. She relays to the client.
6. Safety: read-only by default. Additive config ops (e.g. Ftp::add_ftp) OK. NO container restarts, NO rm, NO git push, NO touching /home/pixel/pixel beyond reads.
7. Scoped: answer the question(s), nothing else. No audits, no proactive fixes.
8. Log a one-line summary to $LOG when done (append with >> from your shell)."

OPENCODE_OUTPUT=$(mktemp)
timeout "$MAX_RUNTIME" "$OPENCODE" run \
  --agent=developero \
  --model="$MODEL" \
  --format=json \
  "$PROMPT" \
  > "$OPENCODE_OUTPUT" 2>&1 || true

EXIT_CODE=$?
if grep -q '"type":"step_finish"' "$OPENCODE_OUTPUT" 2>/dev/null; then
  log "SUCCESS: dispatch completed"
else
  log "WARNING: dispatch ended without step_finish (exit $EXIT_CODE) — check $OPENCODE_OUTPUT"
fi
rm -f "$OPENCODE_OUTPUT"
exit 0
