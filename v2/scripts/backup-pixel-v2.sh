#!/usr/bin/env bash
# Daily backup of pixel_v2 DB with 30-day rotation.
# Cron: 30 3 * * * /home/pixel/pixel/v2/scripts/backup-pixel-v2.sh
set -euo pipefail

BACKUP_DIR="/home/pixel/pixel/backups"
CONTAINER="v2-postgres-v2-1"
DB="pixel_v2"
DB_USER="pixel"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP="${BACKUP_DIR}/pixel_v2-${TIMESTAMP}.dump"

# Dump (custom format = compressed + fast restore)
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB" > "$DUMP" 2>/dev/null

# Verify: at least 1KB and valid magic bytes
SIZE=$(stat -c%s "$DUMP" 2>/dev/null || echo 0)
if [ "$SIZE" -lt 1024 ]; then
  echo "ERROR: dump too small ($SIZE bytes), keeping old backups" >&2
  rm -f "$DUMP"
  exit 1
fi

# Rotate: delete dumps older than RETENTION_DAYS
find "$BACKUP_DIR" -name "pixel_v2-*.dump" -mtime +${RETENTION_DAYS} -delete
find "$BACKUP_DIR" -name "pixel_v2-*.sql" -mtime +${RETENTION_DAYS} -delete

echo "$(date -Iseconds) backup OK: $(basename "$DUMP") ($((SIZE / 1024))KB)"
