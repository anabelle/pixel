# Production Operations Guide

This guide covers the procedures for maintaining and recovering the Pixel ecosystem in production.

## 🚀 Deployment (Redeploy)

To update the live environment with the latest code:
```bash
npm run deploy:production
```

## 🛠️ Maintenance Tasks

### Database Backups
Automated backups are handled by `autonomous-backup.sh` and `createBackup()` in `lnpixels/api/src/database.ts`.
- **Manual Backup**: `./autonomous-backup.sh`
- **Location**: `/home/pixel/backups/` (default, configurable via BACKUP_DIR env var)
- **Retention**: Secure permissions (0o600) with timestamp + random suffix filenames

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
1. `pm2 restart <service-name>` (lnpixels-api, lnpixels-app, pixel-agent, pixel-landing, syntropy-core)
2. If memory usage is high: `pm2 reload <service-name>`
3. Complete reset: `pm2 kill && pm2 start ecosystem.config.js`

## 📝 Services

| Service | PM2 Name | Port | Package Manager | Notes |
|---------|-----------|-------|----------------|--------|
| LNPixels API | lnpixels-api | 3000 | npm | Express + Socket.IO |
| LNPixels App | lnpixels-app | 3002 | bun | Next.js 15.2.4 |
| Pixel Agent | pixel-agent | 3002 (internal) | bun | ElizaOS |
| Pixel Landing | pixel-landing | 3001 | npm | Next.js 15.5.2 |
| Syntropy Core | syntropy-core | - | bun | AI SDK 6 |
