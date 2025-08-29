#!/bin/bash

echo "🚀 Server Monitoring Status"
echo "=========================="
echo ""

# Check PM2 status
echo "📊 PM2 Services:"
pm2 list
echo ""

# Show current monitoring data
echo "📈 Current Server Stats:"
node server-monitor.js --once
echo ""

# Show log file status
echo ""
echo "📝 Log File Status:"
node server-monitor.js --logs

# Show recent monitoring activity
echo ""
echo "📊 Recent Monitoring Activity:"
echo "Recent console logs:"
pm2 logs server-monitor --lines 3 --nostream | grep -E "(Server Monitor|Changes since)" | tail -5

echo ""
echo "✅ All systems monitoring! Check PM2 dashboard: https://app.pm2.io/#/r/xnhdzq19tfu8sso"