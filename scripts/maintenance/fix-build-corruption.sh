#!/bin/bash
# Fix Next.js build corruption and restart services

echo "🔧 Fixing Next.js build corruption..."

# 1. Stop all services
echo "Stopping PM2 services..."
pm2 delete all

# 2. Clear corrupted build artifacts
echo "Clearing corrupted build artifacts..."
cd /home/pixel/pixel/lnpixels/lnpixels-app
rm -rf .next
rm -rf node_modules/.cache

cd /home/pixel/pixel/pixel-landing  
rm -rf .next
rm -rf node_modules/.cache

# 3. Rebuild applications
echo "Rebuilding applications..."
cd /home/pixel/pixel/lnpixels/lnpixels-app
npm run build

cd /home/pixel/pixel/pixel-landing
npm run build

# 4. Restart services
echo "Restarting services..."
cd /home/pixel/pixel
pm2 start ecosystem.config.js

# 5. Verify status
sleep 10
echo "Service status:"
pm2 list

echo "✅ Build corruption fix complete"