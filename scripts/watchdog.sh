#!/bin/sh
# Watchdog script for ElizaOS agent
# Monitors health and recovers from PGLite database corruption

AGENT_URL="http://agent:3003/health"
DB_DIR="/data/.elizadb"
BACKUP_DIR="/data"
CHECK_INTERVAL=${CHECK_INTERVAL:-60}
CONSECUTIVE_FAILURES=0
MAX_FAILURES=3

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WATCHDOG] $1"
}

backup_db() {
    BACKUP_NAME=".elizadb_backup_$(date +%H)"
    if [ -d "$DB_DIR" ]; then
        rm -rf "${BACKUP_DIR}/${BACKUP_NAME}" 2>/dev/null || true
        cp -r "$DB_DIR" "${BACKUP_DIR}/${BACKUP_NAME}"
        log "Backup created: ${BACKUP_NAME}"
    fi
}

find_latest_backup() {
    ls -td ${BACKUP_DIR}/.elizadb_backup_* ${BACKUP_DIR}/.elizadb_fresh_* 2>/dev/null | head -1
}

restore_db() {
    LATEST=$(find_latest_backup)
    if [ -n "$LATEST" ] && [ -d "$LATEST" ]; then
        log "Restoring from: $LATEST"
        rm -rf "$DB_DIR"
        cp -r "$LATEST" "$DB_DIR"
        return 0
    else
        log "No backup found, will start fresh"
        rm -rf "$DB_DIR"
        return 0
    fi
}

log "Watchdog starting (interval=${CHECK_INTERVAL}s)"

# Initial backup of working state after startup delay
sleep 120
if wget -q -O /dev/null --timeout=10 "$AGENT_URL" 2>/dev/null; then
    backup_db
    log "Initial backup complete"
fi

while true; do
    sleep "$CHECK_INTERVAL"
    
    # Check agent health
    if wget -q -O /dev/null --timeout=10 "$AGENT_URL" 2>/dev/null; then
        if [ "$CONSECUTIVE_FAILURES" -gt 0 ]; then
            log "Agent recovered, resetting failure count"
        fi
        CONSECUTIVE_FAILURES=0
        
        # Hourly backup on minute 0
        MINUTE=$(date +%M)
        if [ "$MINUTE" = "00" ] || [ "$MINUTE" = "01" ]; then
            backup_db
        fi
    else
        CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
        log "Health check failed (${CONSECUTIVE_FAILURES}/${MAX_FAILURES})"
        
        if [ "$CONSECUTIVE_FAILURES" -ge "$MAX_FAILURES" ]; then
            log "Max failures reached, triggering recovery"
            
            # Signal file tells compose to restart with fresh DB
            restore_db
            touch /data/.needs_restart
            
            log "Database restored, signaling for restart"
            CONSECUTIVE_FAILURES=0
            
            # Wait for restart to happen
            sleep 60
        fi
    fi
done
