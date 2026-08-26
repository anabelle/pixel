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

# ── Route [for-developero] messages to the developero queue ──
DEV_MAILBOX="/home/pixel/pixel/v2/data/developero-mailbox.jsonl"
if grep -q '\[for-developero\]' "$MAILBOX" 2>/dev/null; then
  grep '\[for-developero\]' "$MAILBOX" >> "$DEV_MAILBOX" || true
  grep -v '\[for-developero\]' "$MAILBOX" > "$MAILBOX.tmp" || true
  mv "$MAILBOX.tmp" "$MAILBOX"
  log "INFO: routed message(s) to developero queue"
  /home/pixel/pixel/v2/scripts/developero-dispatch.sh >> /home/pixel/pixel/v2/data/developero-dispatch.log 2>&1 &
  log "INFO: developero dispatch spawned (PID $!)"
fi

# Remaining mailbox empty = exit (syntropy dispatch has nothing)
[ ! -s "$MAILBOX" ] && exit 0

MSG_COUNT=$(wc -l < "$MAILBOX" | tr -d ' ')
log "ALERT: mailbox has $MSG_COUNT message(s), spawning dispatch"

# Dispatch in background (cron shouldn't wait)
"$DISPATCH" >> "$LOG" 2>&1 &
log "INFO: dispatch spawned (PID $!)"
