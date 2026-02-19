#!/usr/bin/env bash
set -euo pipefail

# Syntropy Mailbox Monitor
# If mailbox is non-empty, spawns autonomous dispatch.
# Runs via cron every 30 minutes.

MAILBOX="/home/pixel/pixel/v2/data/syntropy-mailbox.jsonl"
DISPATCH="/home/pixel/pixel/v2/scripts/syntropy-dispatch.sh"
LOG="/home/pixel/pixel/v2/data/mailbox-monitor.log"

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

# Empty mailbox = exit silently
[ ! -s "$MAILBOX" ] && exit 0

MSG_COUNT=$(wc -l < "$MAILBOX" | tr -d ' ')
log "ALERT: mailbox has $MSG_COUNT message(s), spawning dispatch"

# Dispatch in background (cron shouldn't wait)
"$DISPATCH" >> "$LOG" 2>&1 &
log "INFO: dispatch spawned (PID $!)"
