# Production Deployment Guide

## Single VPS Setup with PM2 and Nginx

This guide covers deploying the entire Pixel ecosystem on a single VPS using PM2 for process management and Nginx as a reverse proxy.

### Prerequisites

- Ubuntu/Debian VPS with root access
- Domain names configured (pixel.xx.kg, ln.pixel.xx.kg)
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
REACT_APP_API_URL=https://ln.pixel.xx.kg
```

### SSL Certificates

```bash
# Obtain SSL certificates for both domains
certbot --nginx -d pixel.xx.kg
certbot --nginx -d ln.pixel.xx.kg

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
# Start all processes (optimized for process quota)
pnpm pm2:start

# Save PM2 configuration for auto-start on boot
pnpm pm2:save
pnpm pm2:startup

# Monitor processes
pnpm pm2:status
pnpm pm2:logs
pm2 monit
```

**Note**: Server monitoring has been removed from auto-start to optimize PM2 process quota. Run `./check-monitor.sh` for manual monitoring or start temporarily with `pm2 start server-monitor.js --name temp-monitor`.

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

### Comprehensive Server Monitoring

The Pixel ecosystem includes a comprehensive server monitoring system that tracks vital system metrics in real-time:

#### Monitored Metrics
- **CPU Usage**: Real-time usage percentage and core count
- **Memory Usage**: Total, used, free memory with utilization percentage
- **Disk Usage**: Storage space monitoring and utilization tracking
- **Network I/O**: RX/TX byte monitoring for network activity
- **Process Information**: Total processes, system uptime, load average
- **System Health**: Hostname, OS type, kernel version, system load

#### Monitoring Setup

```bash
# The monitoring system is automatically included in PM2 ecosystem
pm2 start ecosystem.config.js  # Includes server-monitor service

# Quick status overview
./check-monitor.sh

# Real-time server statistics
node server-monitor.js --once

# View detailed monitoring logs
pm2 logs server-monitor
tail -f server-monitor.log
```

#### Monitoring Configuration
- **Update Interval**: 30 seconds (when running manually)
- **Detailed Logging**: JSON format every 10 minutes
- **Summary Logging**: Console output every 30 seconds
- **Log Rotation**: Manual or scheduled (10MB max per file)
- **Retention Policy**: 7 days / 7 files maximum
- **Auto-restart**: Disabled (manual execution only)
- **Resource Usage**: Lightweight (~50MB memory when running)
- **Data Retention**: Smart logging for trend analysis

#### Basic Health Check Script

Create an enhanced health check script that works with the monitoring system:

```bash
# /home/pixel/health-check.sh
#!/bin/bash

echo "=== Pixel Ecosystem Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check PM2 processes
echo "📊 PM2 Services Status:"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || pm2 list --no-color

# Check server monitoring
echo ""
echo "🔍 Server Monitoring Status:"
if pm2 list | grep -q "server-monitor"; then
    echo "✅ Server monitoring is running"
    # Show recent monitoring data
    echo "Recent CPU/Memory stats:"
    tail -3 server-monitor.log | grep -o '"usage":"[^"]*"' | head -2 | sed 's/"usage":"//;s/"//'
else
    echo "❌ Server monitoring is not running"
fi

# Check nginx
echo ""
echo "🌐 Nginx Status:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
    systemctl start nginx
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
echo ""
echo "💾 Disk Usage: ${DISK_USAGE}%"
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️  WARNING: Disk usage above 80%"
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
echo "🧠 Memory Usage: ${MEM_USAGE}%"

echo ""
echo "=== Health Check Complete ==="
```

```bash
# Make executable and add to crontab
chmod +x /home/pixel/health-check.sh

# Test the health check
./health-check.sh

# Add to crontab for automated monitoring
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

### Comprehensive Monitoring and Logs

#### PM2 Process Monitoring
```bash
# View real-time logs for all services
pnpm pm2:logs

# View specific service logs
pm2 logs pixel-agent
pm2 logs lnpixels-api
pm2 logs lnpixels-web
pm2 logs server-monitor  # Server monitoring logs

# Interactive monitoring dashboard
pm2 monit

# Process status overview
pm2 list
```

#### Server Vital Signs Monitoring
```bash
# Quick monitoring status (always available)
./check-monitor.sh

# One-time monitoring snapshot
node server-monitor.js --once

# Run continuous monitoring temporarily
pm2 start server-monitor.js --name temp-monitor
tail -f server-monitor.log

# Stop temporary monitoring
pm2 stop temp-monitor && pm2 delete temp-monitor

# Log management (manual)
node server-monitor.js --logs          # Show log file status
node server-monitor.js --rotate-logs   # Manual log rotation
./rotate-logs.sh                       # Automated log maintenance

# Analyze existing monitoring trends
grep '"usage":"' server-monitor.log | tail -20
```

#### System and Application Logs
```bash
# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System monitoring tools
htop              # Interactive process viewer
iotop             # I/O monitoring
nethogs           # Network bandwidth per process
df -h             # Disk usage
free -h           # Memory usage

# PM2 system monitoring
pm2 sysmonit      # Built-in system monitoring
```

#### Log Analysis and Alerting
```bash
# Search for errors in logs
pm2 logs --err | grep -i error

# Monitor for high CPU usage
tail -f server-monitor.log | grep '"usage":"[8-9][0-9]'

# Check memory trends
grep '"usagePercent"' server-monitor.log | tail -10

# Set up log rotation for monitoring data
# Add to /etc/logrotate.d/server-monitor
/home/pixel/server-monitor.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

### Troubleshooting

Common issues and solutions:

1. **PM2 processes not starting**: Check environment variables and paths
2. **Nginx 502 errors**: Verify backend services are running on correct ports
3. **SSL certificate issues**: Check certbot renewal and nginx configuration
4. **Database connection errors**: Verify file permissions and paths
5. **Memory issues**: Monitor with `pm2 monit` and server monitoring logs
6. **Server monitoring not working**: Check `pm2 logs server-monitor` and verify Node.js installation
7. **High resource usage**: Analyze trends with `tail -f server-monitor.log` and identify bottlenecks
8. **Log file growing too large**: Set up log rotation for `server-monitor.log`

#### Monitoring-Specific Issues
```bash
# Start monitoring temporarily for troubleshooting
pm2 start server-monitor.js --name temp-monitor

# Check if temporary monitoring is running
pm2 list | grep temp-monitor

# Check monitoring logs for errors (when running)
pm2 logs temp-monitor --err

# Verify monitoring data collection
tail -5 server-monitor.log

# Test monitoring script directly
node server-monitor.js --once

# Log management troubleshooting
node server-monitor.js --logs          # Check log file sizes
./rotate-logs.sh                       # Force log rotation
node server-monitor.js --rotate-logs   # Manual rotation
du -sh server-monitor*                 # Check disk usage of logs

# Stop temporary monitoring after troubleshooting
pm2 stop temp-monitor && pm2 delete temp-monitor
```

### Security Considerations

- Keep system packages updated
- Use strong passwords and SSH keys
- Regularly backup sensitive data
- Monitor logs for suspicious activity
- Consider fail2ban for additional protection
- Rotate API keys periodically

This deployment setup provides a robust, single-VPS solution that can handle the entire Pixel ecosystem with proper process management, SSL termination, and monitoring capabilities.
