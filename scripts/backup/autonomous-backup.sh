#!/bin/bash
# Autonomous backup system
# Run daily via cron: 0 2 * * * /home/pixel/scripts/backup/autonomous-backup.sh

BACKUP_DIR="/home/pixel/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "$(date): Starting autonomous backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
if [ -f "lnpixels/api/pixels.db" ]; then
    sqlite3 lnpixels/api/pixels.db ".backup $BACKUP_DIR/pixels_$DATE.db"
    echo "Database backup created: pixels_$DATE.db"
fi

# Backup configurations
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    /home/pixel/lnpixels/api/.env \
    /home/pixel/pixel-agent/.env \
    /home/pixel/ecosystem.config.js \
    2>/dev/null

echo "Configuration backup created: config_$DATE.tar.gz"

# Backup logs (last 7 days)
find /home/pixel/.pm2/logs -name "*.log" -mtime -7 -exec tar -rf "$BACKUP_DIR/logs_$DATE.tar" {} \;
gzip "$BACKUP_DIR/logs_$DATE.tar"
echo "Log backup created: logs_$DATE.tar.gz"

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

# Verify backup integrity
if [ -f "$BACKUP_DIR/pixels_$DATE.db" ]; then
    PIXEL_COUNT=$(sqlite3 "$BACKUP_DIR/pixels_$DATE.db" "SELECT COUNT(*) FROM pixels;" 2>/dev/null)
    echo "Backup verification: $PIXEL_COUNT pixels backed up"
fi

echo "$(date): Autonomous backup complete"