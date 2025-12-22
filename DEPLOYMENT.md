# Production Operations Guide

This guide covers the procedures for maintaining and recovering the Pixel ecosystem in production.

## 🚀 Deployment (Redeploy)

To update the live environment with the latest code:
```bash
npm run deploy:production
```

## 🛠️ Maintenance Tasks

### Database Backups
Automated backups are handled by `autonomous-backup.sh`.
- **Manual Backup**: `./autonomous-backup.sh`
- **Location**: `/home/pixel/backups/`

### Log Rotation
To keep disk usage in check, run the log rotation script:
```bash
./rotate-logs.sh
```

### Health Monitoring
The `server-monitor.js` tracks CPU, RAM, and Disk.
- **Start Monitor**: `pm2 start server-monitor.js --name monitor`
- **Check Stats**: `node server-monitor.js --once`

## 🚨 Emergency Recovery
If a service is behaving erratically:
1. `pm2 restart <service-name>`
2. If memory usage is high: `pm2 reload <service-name>`
3. Complete reset: `pm2 kill && pm2 start ecosystem.config.js`
