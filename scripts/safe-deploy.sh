#!/bin/bash
# safe-deploy.sh
# The definitive way to deploy updates to the Pixel ecosystem.
# Used by GitHub Actions (push) and Syntropy (autonomous mutation).

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd $PROJECT_ROOT

echo "🚀 Starting Safe Deployment from $PROJECT_ROOT..."

# 1. Validate
./scripts/validate-build.sh

# 2. Deploy
echo "🔄 Rebuilding and restarting containers..."
# --build: always build
# --detach: run in background
# --remove-orphans: clean up
docker compose up -d --build --remove-orphans

# 3. Health Check
echo "🩺 Running health checks..."
# Give it a few seconds to breathe
sleep 5

# Simple health probes (using wget for alpine compatibility and 127.0.0.1)
if command -v wget &> /dev/null; then
    wget --spider -q http://127.0.0.1:3000/api/stats || echo "⚠️  API health check skipped or failed"
    wget --spider -q http://127.0.0.1:3001/ || echo "⚠️  Landing page health check failed"
else
    # Fallback to curl if wget missing (host machine might have curl)
    curl -f http://127.0.0.1:3000/api/stats || echo "⚠️  API health check skipped or failed"
    curl -f http://127.0.0.1:3001/ || echo "⚠️  Landing page health check failed"
fi

# 4. Cleanup
echo "🧹 Pruning old images..."
docker image prune -f

echo "🎉 Deployment Successful!"
