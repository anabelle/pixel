#!/bin/bash
# setup-local-docker.sh
# Sets up a local Docker environment "like prod" with self-signed SSL certs.

set -e

echo "🛠️ Setting up local Docker environment..."

# 1. Create cert directories
mkdir -p ./certbot/conf/live/pixel.xx.kg
mkdir -p ./certbot/conf/live/ln.pixel.xx.kg

# 2. Generate self-signed certs if they don't exist
if [ ! -f ./certbot/conf/live/pixel.xx.kg/fullchain.pem ]; then
    echo "🔐 Generating self-signed certificate for pixel.xx.kg..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ./certbot/conf/live/pixel.xx.kg/privkey.pem \
        -out ./certbot/conf/live/pixel.xx.kg/fullchain.pem \
        -subj "/CN=pixel.xx.kg"
fi

if [ ! -f ./certbot/conf/live/ln.pixel.xx.kg/fullchain.pem ]; then
    echo "🔐 Generating self-signed certificate for ln.pixel.xx.kg..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ./certbot/conf/live/ln.pixel.xx.kg/privkey.pem \
        -out ./certbot/conf/live/ln.pixel.xx.kg/fullchain.pem \
        -subj "/CN=ln.pixel.xx.kg"
fi

# 3. Ensure data directories exist
mkdir -p ./data ./backups ./logs

# 4. Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️ Please edit .env with your actual API keys!"
fi

echo "✅ Local Docker environment ready."
echo ""
echo "🚀 To start EVERYTHING in Docker:"
echo "docker-compose up -d --build"
echo ""
echo "📌 IMPORTANT: Add these to your /etc/hosts file:"
echo "127.0.0.1  pixel.xx.kg"
echo "127.0.0.1  ln.pixel.xx.kg"
