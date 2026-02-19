#!/bin/bash
# init-ssl.sh
# Obtains initial SSL certificates from Let's Encrypt.
# Run this ONCE after the first deployment when containers are up.

set -e

DOMAINS="-d pixel.xx.kg -d ln.pixel.xx.kg"
EMAIL="admin@pixel.xx.kg" # Change this to your email
STAGING="" # Use "--staging" for testing to avoid rate limits

echo "🔐 Initializing SSL Certificates..."

# 1. Create required directories
mkdir -p ./certbot/conf ./certbot/www

# 2. Start nginx temporarily to serve ACME challenge
# First, create a temporary nginx config that doesn't require SSL
cat > ./nginx/nginx-init.conf << 'EOF'
server {
    listen 80;
    server_name pixel.xx.kg ln.pixel.xx.kg;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Waiting for SSL...';
        add_header Content-Type text/plain;
    }
}
EOF

echo "📦 Starting temporary Nginx for ACME challenge..."
docker run -d --name nginx-init \
    -p 80:80 \
    -v $(pwd)/nginx/nginx-init.conf:/etc/nginx/conf.d/default.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot \
    nginx:alpine

# 3. Request certificates
echo "🌐 Requesting certificates from Let's Encrypt..."
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly --webroot \
    -w /var/www/certbot \
    $STAGING \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $DOMAINS

# 4. Cleanup
echo "🧹 Cleaning up temporary container..."
docker stop nginx-init && docker rm nginx-init
rm ./nginx/nginx-init.conf

echo "✅ SSL Certificates obtained successfully!"
echo "Now run: docker compose up -d"
