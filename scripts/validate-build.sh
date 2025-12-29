#!/bin/bash
# validate-build.sh
# Verifies that the docker-compose configuration and all services build correctly.

set -e

echo "🔍 Validating build stability..."

# 1. Validation de la config
docker compose config > /dev/null

# 2. Build test (using --pull to ensure latest bases, but no recreations yet)
# We use a build cache to keep it fast.
if docker compose build; then
    echo "✅ Build validation passed. Configuration is stable."
    exit 0
else
    echo "❌ Build validation failed! Deployment aborted."
    exit 1
fi
