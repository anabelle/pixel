#!/bin/bash
# Emergency recovery script for Pixel services

echo "🔧 Emergency Pixel Service Recovery"

# 1. Kill all processes
echo "Stopping all processes..."
pkill -f "node|next|bun|pm2" || true
sleep 2

# 2. Clear port conflicts
echo "Checking port usage..."
for port in 3000 3001 3002 5173; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

# 3. Clear build artifacts
echo "Clearing build artifacts..."
cd /home/pixel/pixel/lnpixels/lnpixels-app && rm -rf .next
cd /home/pixel/pixel/pixel-landing && rm -rf .next
cd /home/pixel/pixel/pixel-agent && rm -rf dist

# 4. Clear PM2
echo "Resetting PM2..."
pm2 delete all
pm2 kill

# 5. Start services sequentially
echo "Starting services..."
cd /home/pixel/pixel

# Start API first
echo "Starting lnpixels-api..."
pm2 start ecosystem.config.js --only lnpixels-api
sleep 5

# Start app
echo "Starting lnpixels-app..."
pm2 start ecosystem.config.js --only lnpixels-app  
sleep 5

# Start landing
echo "Starting pixel-landing..."
pm2 start ecosystem.config.js --only pixel-landing
sleep 5

# Start agent
echo "Starting pixel-agent..."
pm2 start ecosystem.config.js --only pixel-agent

echo "✅ Recovery complete"
pm2 list