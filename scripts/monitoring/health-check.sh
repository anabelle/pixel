#!/bin/bash
# Autonomous health monitoring for Pixel ecosystem
# Run via cron: */5 * * * * /home/pixel/health-check.sh

echo "$(date): Running autonomous health check"

# Check service status
SERVICES=("lnpixels-api" "lnpixels-app" "pixel-agent" "pixel-landing")
for service in "${SERVICES[@]}"; do
    if ! pm2 describe "$service" > /dev/null 2>&1; then
        echo "WARNING: $service is down, attempting restart"
        pm2 restart ecosystem.config.js
        break
    fi
done

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "CRITICAL: Disk usage at ${DISK_USAGE}%, cleaning up"
    # Clean old logs
    find /home/pixel/.pm2/logs -name "*.log" -mtime +7 -delete
    # Clean old backups
    find /home/pixel/backups -name "*.db" -mtime +30 -delete
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEM_USAGE" -gt 85 ]; then
    echo "WARNING: Memory usage at ${MEM_USAGE}%, restarting services"
    pm2 restart ecosystem.config.js
fi

# Check canvas activity (last pixel in 24 hours)
LAST_PIXEL=$(sqlite3 /home/pixel/lnpixels/api/pixels.db "SELECT MAX(timestamp) FROM pixels;" 2>/dev/null)
if [ -n "$LAST_PIXEL" ]; then
    LAST_PIXEL_SECS=$(date -d "$LAST_PIXEL" +%s)
    NOW_SECS=$(date +%s)
    HOURS_SINCE=$(( (NOW_SECS - LAST_PIXEL_SECS) / 3600 ))
    if [ "$HOURS_SINCE" -gt 24 ]; then
        echo "NOTICE: No pixel activity in ${HOURS_SINCE} hours"
    fi
fi

# Check payment system
if curl -s http://localhost:3000/api/ | grep -q "LNPixels API"; then
    echo "OK: API responding"
else
    echo "ERROR: API not responding, restarting"
    pm2 restart ecosystem.config.js
fi

echo "$(date): Health check complete"