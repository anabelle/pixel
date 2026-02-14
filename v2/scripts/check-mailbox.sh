#!/usr/bin/env bash
set -euo pipefail

# Syntropy Mailbox Monitor
# Checks if Pixel has left messages in the Syntropy mailbox.
# If non-empty, asks Pixel to notify Ana via Telegram
# so she can invoke Syntropy (opencode) to handle it.
#
# Runs via cron every 30 minutes.

MAILBOX="/home/pixel/pixel/v2/data/syntropy-mailbox.jsonl"
LOG="/home/pixel/pixel/v2/data/mailbox-monitor.log"
PIXEL_API="http://127.0.0.1:4000/api/chat"

timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

log() {
  printf "%s %s\n" "$(timestamp)" "$1" >> "$LOG"
}

# Rotate log if > 512KB
if [ -f "$LOG" ]; then
  size=$(stat -c %s "$LOG" 2>/dev/null || echo 0)
  if [ "$size" -ge 524288 ]; then
    mv "$LOG" "$LOG.1" 2>/dev/null || true
  fi
fi

# No mailbox or empty — nothing to do
if [ ! -s "$MAILBOX" ]; then
  exit 0
fi

MSG_COUNT=$(wc -l < "$MAILBOX" | tr -d ' ')

log "ALERT: mailbox has $MSG_COUNT message(s), forwarding to owner"

# Build JSON payload safely with python
PAYLOAD=$(python3 - "$MAILBOX" "$MSG_COUNT" <<'PY'
import json, sys
mailbox_path = sys.argv[1]
count = sys.argv[2]
with open(mailbox_path, 'r') as f:
    content = f.read().strip()
msg = f"syntropy mailbox alert: pixel left {count} message(s) for syntropy that need attention. use notify_owner to tell ana to run syntropy (opencode). messages:\n\n{content}"
print(json.dumps({"message": msg, "userId": "syntropy-admin"}))
PY
)

RESPONSE=$(curl -s --max-time 15 -X POST "$PIXEL_API" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>&1) || true

if echo "$RESPONSE" | grep -q '"response"'; then
  log "OK: forwarded to Pixel, archiving mailbox"
  # Archive — don't delete. Syntropy reads when invoked.
  mv "$MAILBOX" "$MAILBOX.forwarded"
  touch "$MAILBOX"
else
  log "ERROR: failed to forward — $RESPONSE"
fi
