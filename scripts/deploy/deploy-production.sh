#!/bin/bash
set -e

echo "=== Pixel Production Deployment ==="
echo "Installing dependencies..."
cd /home/pixel

# Install with error handling
pnpm install || echo "Root install had warnings"
cd lnpixels && pnpm install || echo "LNPixels install had warnings"
cd api && npm install --ignore-scripts || npm install 2>/dev/null || true
cd ../lnpixels-app && npm install --legacy-peer-deps --ignore-scripts || npm install --legacy-peer-deps || true
cd ../../pixel-landing && pnpm install || echo "Landing install had warnings"
cd ../pixel-agent && npm install --legacy-peer-deps || true
cd ../syntropy-core && bun install || true

echo "Building projects..."
cd /home/pixel/lnpixels/api && npm run build || echo "API build failed"
cd /home/pixel/lnpixels/lnpixels-app && npm run build || echo "App build failed"
cd /home/pixel/pixel-landing && npm run build || echo "Landing build failed"
cd /home/pixel/pixel-agent && npm run build || echo "Agent build failed"
cd /home/pixel/syntropy-core && bun run build || echo "Syntropy build failed"

echo "Restarting services..."
cd /home/pixel
pm2 restart all
sleep 10
pm2 status

echo "=== Deployment Complete ==="
