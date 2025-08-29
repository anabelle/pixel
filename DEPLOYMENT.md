# Production Deployment Guide

## Single VPS Setup with PM2 and Nginx

This guide covers deploying the entire Pixel ecosystem on a single VPS using PM2 for process management and Nginx as a reverse proxy.

### Prerequisites

- Ubuntu/Debian VPS with root access
- Domain names configured (pixel.xx.kg, lnpixels.qzz.io)
- Node.js 18+ installed
- Git configured

### Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y nginx certbot python3-certbot-nginx git curl

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Bun for ElizaOS
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Bun for ElizaOS (required)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install PM2 and ElizaOS CLI globally
npm install -g pm2
bun i -g @elizaos/cli

# Install pnpm globally for efficient dependency management
npm install -g pnpm

# Create application directory
mkdir -p /home/pixel
cd /home/pixel
```

### Clone and Setup

```bash
# Clone the repository
git clone --recursive https://github.com/anabelle/pixel.git .

# Install dependencies for all projects (shared when possible)
pnpm install

# Install agent dependencies separately (uses bun)
pnpm install:agent

# Build production assets
pnpm build

# Create logs directory
mkdir -p logs
```

### Environment Configuration

Create environment files for each project:

```bash
# pixel-agent/.env
OPENROUTER_API_KEY=your_openrouter_key
TELEGRAM_BOT_TOKEN=your_telegram_token
DISCORD_APPLICATION_ID=your_discord_app_id
DISCORD_API_TOKEN=your_discord_token
NOSTR_PRIVATE_KEY=your_nostr_private_key

# lnpixels/api/.env
NAKAPAY_API_KEY=your_nakapay_key
DATABASE_URL=./pixels.db

# lnpixels/web/.env
REACT_APP_API_URL=https://lnpixels.qzz.io
```

### SSL Certificates

```bash
# Obtain SSL certificates for both domains
certbot --nginx -d pixel.xx.kg
certbot --nginx -d lnpixels.qzz.io

# Set up auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration

```bash
# Copy nginx configuration
cp nginx.conf /etc/nginx/sites-available/pixel
ln -s /etc/nginx/sites-available/pixel /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl reload nginx
systemctl enable nginx
```

### PM2 Process Management

```bash
# Start all processes
pnpm pm2:start

# Save PM2 configuration for auto-start on boot
pnpm pm2:save
pnpm pm2:startup

# Monitor processes
pnpm pm2:status
pnpm pm2:logs
pnpm pm2:monit
```

### Database Setup

```bash
# Initialize SQLite database for LNPixels
cd lnpixels/api
npm run migrate  # If migration scripts exist
```

### Firewall Configuration

```bash
# Configure UFW firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### Health Monitoring

Create a simple health check script:

```bash
# /home/pixel/health-check.sh
#!/bin/bash

# Check if all PM2 processes are running
pm2 status | grep -q "stopped" && {
    echo "Some PM2 processes are stopped, restarting..."
    pm2 restart all
}

# Check if nginx is running
systemctl is-active --quiet nginx || {
    echo "Nginx is not running, starting..."
    systemctl start nginx
}

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Disk usage is above 80%: $DISK_USAGE%"
fi

echo "Health check completed at $(date)"
```

```bash
# Make executable and add to crontab
chmod +x /home/pixel/health-check.sh
crontab -e
# Add: */5 * * * * /home/pixel/health-check.sh >> /home/pixel/logs/health.log 2>&1
```

### Deployment Workflow

```bash
# For updates, create a deployment script
# /home/pixel/deploy.sh
#!/bin/bash

cd /home/pixel

# Pull latest changes
git pull --recurse-submodules

# Install any new dependencies
pnpm install
pnpm install:agent

# Build updated projects
pnpm build

# Reload PM2 processes gracefully
pnpm pm2:reload

echo "Deployment completed at $(date)"
```

### Backup Strategy

```bash
# Create backup script for databases and configurations
# /home/pixel/backup.sh
#!/bin/bash

BACKUP_DIR="/home/pixel/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup SQLite databases
cp lnpixels/api/*.db $BACKUP_DIR/ 2>/dev/null || true

# Backup environment files
cp pixel-agent/.env $BACKUP_DIR/pixel-agent.env 2>/dev/null || true
cp lnpixels/api/.env $BACKUP_DIR/lnpixels-api.env 2>/dev/null || true

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/

# Keep only last 7 days of backups
find /home/pixel/backups/ -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR"
```

### Monitoring and Logs

```bash
# View real-time logs
pnpm pm2:logs

# View specific service logs
pm2 logs pixel-agent
pm2 logs lnpixels-api
pm2 logs lnpixels-web

# View nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System resource monitoring
htop
iotop
nethogs
```

### Troubleshooting

Common issues and solutions:

1. **PM2 processes not starting**: Check environment variables and paths
2. **Nginx 502 errors**: Verify backend services are running on correct ports
3. **SSL certificate issues**: Check certbot renewal and nginx configuration
4. **Database connection errors**: Verify file permissions and paths
5. **Memory issues**: Monitor with `pm2 monit` and adjust max_memory_restart

### Security Considerations

- Keep system packages updated
- Use strong passwords and SSH keys
- Regularly backup sensitive data
- Monitor logs for suspicious activity
- Consider fail2ban for additional protection
- Rotate API keys periodically

This deployment setup provides a robust, single-VPS solution that can handle the entire Pixel ecosystem with proper process management, SSL termination, and monitoring capabilities.
