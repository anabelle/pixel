#!/usr/bin/env bash
set -euo pipefail

# Prune the Syntropy persistent opencode session (used by syntropy-dispatch.sh).
#
# WHY: On 2026-08-18 the dispatch session (ses_3a069e7e...) went silent — runs
# exited at step 0 with no LLM call. Root cause: failed dispatch runs appended
# user messages that never got assistant replies; the dangling pending-prompt
# state made every subsequent opencode run exit silently. Six months of history
# (4446 messages) had also bloated opencode.db to 1.17GB.
#
# This guard runs daily and:
#   1. Keeps the session lean: if > 300 messages, keep the newest 100.
#   2. Un-wedges dangling prompts: if the newest message is an unanswered
#      user message older than 30 minutes, delete it (a dead prompt wedges
#      the loop; its content lives on in the dispatch log / .forwarded archive).
#
# Session history is expendable — every dispatch run starts with a full
# briefing prompt and reads v2/AGENTS.md. Do NOT extend this to other sessions
# (they belong to developero / interactive use).

DB="$HOME/.local/share/opencode/opencode.db"
SESSION="ses_3a069e7e2ffe5gbtKNG3WVTLtc"
KEEP=100
MAX=300
STALE_MIN=30
LOG="/home/pixel/pixel/v2/data/prune-opencode-session.log"

[ -f "$DB" ] || exit 0

log() {
  printf "%s %s\n" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" >> "$LOG"
}

# Rotate log if > 100KB
if [ -f "$LOG" ] && [ "$(stat -c %s "$LOG")" -ge 102400 ]; then
  mv "$LOG" "$LOG.1"
fi

COUNT=$(sqlite3 -readonly "$DB" "SELECT COUNT(*) FROM message WHERE session_id='$SESSION'" 2>/dev/null || echo 0)

# 1. Un-wedge: dangling unanswered user message older than STALE_MIN minutes
LAST_ROLE=$(sqlite3 -readonly "$DB" "SELECT json_extract(data,'$.role') FROM message WHERE session_id='$SESSION' ORDER BY time_created DESC, id DESC LIMIT 1" 2>/dev/null || echo "")
if [ "$LAST_ROLE" = "user" ]; then
  LAST_TS=$(sqlite3 -readonly "$DB" "SELECT time_created FROM message WHERE session_id='$SESSION' ORDER BY time_created DESC, id DESC LIMIT 1" 2>/dev/null || echo 0)
  AGE_MIN=$(( ( $(date +%s) * 1000 - LAST_TS ) / 60000 ))
  if [ "$AGE_MIN" -gt "$STALE_MIN" ]; then
    sqlite3 "$DB" ".timeout 30000" <<SQL
PRAGMA foreign_keys=ON;
BEGIN;
DELETE FROM part WHERE session_id='$SESSION' AND message_id = (SELECT id FROM message WHERE session_id='$SESSION' ORDER BY time_created DESC, id DESC LIMIT 1);
DELETE FROM message WHERE id = (SELECT id FROM message WHERE session_id='$SESSION' ORDER BY time_created DESC, id DESC LIMIT 1);
COMMIT;
SQL
    log "INFO: removed dangling unanswered user message (age ${AGE_MIN}m)"
    COUNT=$((COUNT - 1))
  fi
fi

# 2. Size cap: keep newest KEEP messages when over MAX
if [ "$COUNT" -gt "$MAX" ]; then
  sqlite3 "$DB" ".timeout 30000" <<SQL
PRAGMA foreign_keys=ON;
BEGIN;
CREATE TEMP TABLE keep_ids AS SELECT id FROM message WHERE session_id='$SESSION' ORDER BY time_created DESC, id DESC LIMIT $KEEP;
DELETE FROM part WHERE session_id='$SESSION' AND message_id NOT IN (SELECT id FROM keep_ids);
DELETE FROM message WHERE session_id='$SESSION' AND id NOT IN (SELECT id FROM keep_ids);
DELETE FROM part WHERE session_id='$SESSION' AND json_extract(data,'$.type')='compaction';
COMMIT;
SQL
  log "INFO: pruned session from $COUNT to $KEEP messages"
  sqlite3 "$DB" ".timeout 30000" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null 2>&1 || true
fi

exit 0
