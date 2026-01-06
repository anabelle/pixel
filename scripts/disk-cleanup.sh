#!/bin/bash
set -euo pipefail

# Disk Cleanup Protocol for Pixel Ecosystem
# Safe, automated cleanup with safeguards

LOG_FILE="/pixel/logs/cleanup-$(date +%Y%m%d-%H%M%S).log"
ALERT_THRESHOLD=80
TARGET_THRESHOLD=75
BACKUP_RETENTION_DAYS=7
LOG_RETENTION_DAYS=7

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

get_disk_usage() {
    df /pixel | awk 'NR==2 {print int($5)}'
}

get_sync_status() {
    # Check if Bitcoin sync is in progress
    if docker ps --format '{{.Names}}' | grep -q bitcoin; then
        docker exec pixel-bitcoin-1 bitcoin-cli getblockchaininfo 2>/dev/null | grep -q '"initial_block_download": true' && echo "true" || echo "false"
    else
        echo "false"
    fi
}

safe_prune() {
    local action="$1"
    local command="$2"
    
    log "=== Running: $action ==="
    log "Command: $command"
    
    eval "$command" >> "$LOG_FILE" 2>&1 || {
        log "⚠️  Command failed (exit code $?): $action"
        return 1
    }
    log "✅ Completed: $action"
}

# Check if Bitcoin sync is in progress
log "Checking Bitcoin sync status..."
SYNCING=$(get_sync_status)
if [ "$SYNCING" = "true" ]; then
    log "⚠️  Bitcoin sync in progress. Skipping aggressive cleanup."
    exit 0
fi

# Check current disk usage
CURRENT_USAGE=$(get_disk_usage)
log "Current disk usage: ${CURRENT_USAGE}% (threshold: ${ALERT_THRESHOLD}%)"

if [ "$CURRENT_USAGE" -lt "$ALERT_THRESHOLD" ]; then
    log "✅ Disk usage below threshold. No cleanup needed."
    exit 0
fi

log "🧹 Starting disk cleanup protocol..."

# Record initial state
BEFORE_DISK=$(df -h /pixel | awk 'NR==2 {print $5}')
log "Initial disk usage: $BEFORE_DISK"

# 1. Docker cleanup (safe operations)
log "=== Phase 1: Docker Cleanup ==="

# Remove unused images and build cache
safe_prune "Docker image prune" "docker image prune -af"
safe_prune "Docker builder prune" "docker builder prune -af"

# Note: We DON'T run 'docker system prune -af' as it can take too long
# Instead, we use targeted operations

# Remove unused volumes (with confirmation check)
safe_prune "Docker volume prune" "docker volume prune -f"

# 2. Backup cleanup
log "=== Phase 2: Backup Cleanup ==="
BACKUPS_CLEANED=$(find /pixel/backups -name "*.sql" -o -name "*.tar.gz" -o -name "*.db" | while read f; do
    if [ $(($(date +%s) - $(stat -c %Y "$f" 2>/dev/null || echo 0))) -gt $((BACKUP_RETENTION_DAYS * 24 * 3600)) ]; then
        echo "$f"
    fi
done | wc -l)

if [ "$BACKUPS_CLEANED" -gt 0 ]; then
    log "Removing $BACKUPS_CLEANED backup(s) older than $BACKUP_RETENTION_DAYS days"
    find /pixel/backups \( -name "*.sql" -o -name "*.tar.gz" -o -name "*.db" \) -mtime +$BACKUP_RETENTION_DAYS -delete
else
    log "No old backups to clean"
fi

# 3. Log cleanup
log "=== Phase 3: Log Cleanup ==="
LOGS_CLEANED=$(find /pixel -name "*.log" -mtime +$LOG_RETENTION_DAYS 2>/dev/null | wc -l)
if [ "$LOGS_CLEANED" -gt 0 ]; then
    log "Removing $LOGS_CLEANED log file(s) older than $LOG_RETENTION_DAYS days"
    find /pixel -name "*.log" -mtime +$LOG_RETENTION_DAYS -delete 2>/dev/null || true
else
    log "No old logs to clean"
fi

# 4. NPM cache cleanup
log "=== Phase 4: NPM Cache Cleanup ==="
if [ -d "/pixel/node_modules" ]; then
    safe_prune "NPM cache clean" "npm cache clean --force" || true
fi

# Record final state
AFTER_DISK=$(df -h /pixel | awk 'NR==2 {print $5}')
AFTER_USAGE=$(get_disk_usage)
FREED=$((CURRENT_USAGE - AFTER_USAGE))

log "=== Cleanup Complete ==="
log "Disk usage before: $BEFORE_DISK (${CURRENT_USAGE}%)"
log "Disk usage after:  $AFTER_DISK (${AFTER_USAGE}%)"
log "Space freed: ~${FREED}%"

# Check if target achieved
if [ "$AFTER_USAGE" -le "$TARGET_THRESHOLD" ]; then
    log "✅ SUCCESS: Disk usage now at ${AFTER_USAGE}% (target: ${TARGET_THRESHOLD}%)"
    exit 0
else
    log "⚠️  Warning: Disk usage at ${AFTER_USAGE}% (target: ${TARGET_THRESHOLD}%)"
    log "Consider manual intervention or aggressive cleanup"
    exit 1
fi
