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
The monorepo includes tools for both system-level and ecosystem-wide monitoring.
- **Full Status Report**: `./report-status.js` (Recommended for a complete overview)
- **System Vitals**: `node server-monitor.js --once`
- **Continuous Monitor**: `pm2 start server-monitor.js --name monitor`

## 🚨 Emergency Recovery
If a service is behaving erratically:
1. `pm2 restart <service-name>`
2. If memory usage is high: `pm2 reload <service-name>`
3. Complete reset: `pm2 kill && pm2 start ecosystem.config.js`
