#!/bin/bash
# Certbot renewal via docker — run weekly
# Renews LE certs for pixel ecosystem (nostr.acars.pub, nostr.pixel.xx.kg, pixel.xx.kg)
set -euo pipefail

CERTBOT_CONF=/home/pixel/pixel/certbot/conf
CERTBOT_WWW=/home/pixel/pixel/certbot/www
LOG=/home/pixel/pixel/logs/certbot-renew.log

mkdir -p "$(dirname "$LOG")"

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LOG"

if docker run --rm \
  -v "$CERTBOT_CONF:/etc/letsencrypt" \
  -v "$CERTBOT_WWW:/var/www/certbot" \
  certbot/certbot renew --no-random-sleep-on-renew >> "$LOG" 2>&1; then

  # Reload nginx if any cert changed (certbot exit 0 = renewed or not)
  docker exec pixel-nginx-1 nginx -s reload >> "$LOG" 2>&1 && echo "nginx reloaded" >> "$LOG"
else
  echo "ERROR: certbot renewal failed" >> "$LOG"
fi
