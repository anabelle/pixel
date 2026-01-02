#!/bin/bash
# Auto-recovery script for ElizaOS PGLite database
# Run via cron every 5 minutes: */5 * * * * /home/ana/Code/pixel/scripts/auto-recover-db.sh

set -e
cd /home/ana/Code/pixel

LOGFILE="/home/ana/Code/pixel/logs/db-recovery.log"
BACKUP_DIR="/home/ana/Code/pixel/data/eliza"
DB_DIR="${BACKUP_DIR}/.elizadb"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOGFILE"
}

# Check if agent is healthy
if curl -sf http://localhost:3003/health > /dev/null 2>&1; then
    # Agent is healthy - create periodic backup (every hour at minute 0)
    if [ "$(date +%M)" = "00" ]; then
        BACKUP_NAME=".elizadb_hourly_$(date +%H)"
        sudo rm -rf "${BACKUP_DIR}/${BACKUP_NAME}" 2>/dev/null || true
        sudo cp -r "$DB_DIR" "${BACKUP_DIR}/${BACKUP_NAME}"
        log "Hourly backup created: ${BACKUP_NAME}"
    fi
    exit 0
fi

log "Agent unhealthy, checking container status..."

# Check if container is running
if ! docker ps | grep -q pixel-agent-1; then
    log "Container not running, starting..."
    docker compose -f /home/ana/Code/pixel/docker-compose.yml up -d agent
    sleep 30
    
    if curl -sf http://localhost:3003/health > /dev/null 2>&1; then
        log "Container started successfully"
        exit 0
    fi
fi

# Check logs for database corruption
if docker logs pixel-agent-1 --tail=50 2>&1 | grep -q "CREATE SCHEMA IF NOT EXISTS migrations"; then
    log "Database corruption detected, attempting recovery..."
    
    # Stop the agent
    docker compose -f /home/ana/Code/pixel/docker-compose.yml down agent
    
    # Find latest valid backup
    LATEST_BACKUP=$(ls -td ${BACKUP_DIR}/.elizadb_hourly_* ${BACKUP_DIR}/.elizadb_fresh_* 2>/dev/null | head -1)
    
    if [ -n "$LATEST_BACKUP" ] && [ -d "$LATEST_BACKUP" ]; then
        log "Restoring from backup: $LATEST_BACKUP"
        sudo rm -rf "$DB_DIR"
        sudo cp -r "$LATEST_BACKUP" "$DB_DIR"
        sudo chown -R root:root "$DB_DIR"
    else
        log "No backup found, starting fresh"
        sudo rm -rf "$DB_DIR"
    fi
    
    # Restart agent
    docker compose -f /home/ana/Code/pixel/docker-compose.yml up -d agent
    sleep 30
    
    if curl -sf http://localhost:3003/health > /dev/null 2>&1; then
        log "Recovery successful"
    else
        log "Recovery failed - manual intervention needed"
        exit 1
    fi
fi

exit 0
