#!/bin/bash

echo "🔄 Log Rotation Script - $(date)"
echo "================================="

# Rotate server monitor logs
echo "📝 Rotating server monitor logs..."
node scripts/monitoring/server-monitor.js --rotate-logs

# Check PM2 logs size and rotate if needed
echo ""
echo "📊 Checking PM2 log sizes..."
pm2_dir="$HOME/.pm2"
if [ -d "$pm2_dir" ]; then
    # Find log files larger than 50MB
    find "$pm2_dir" -name "*.log" -size +50M -exec ls -lh {} \; | while read line; do
        echo "Large log found: $line"
    done

    # Optional: Compress old PM2 logs (uncomment if needed)
    # find "$pm2_dir" -name "*.log" -mtime +7 -exec gzip {} \;
fi

# Clean up any temporary files
echo ""
echo "🧹 Cleaning up temporary files..."
find /tmp -name "server-monitor*" -mtime +1 -delete 2>/dev/null || true

echo ""
echo "✅ Log rotation complete - $(date)"