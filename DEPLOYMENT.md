# Deployment & Operations Guide

This guide covers the procedures for deploying and maintaining the Pixel ecosystem in a production environment.

## 🚀 Deployment Checklist

1.  **Environment Hygiene**: Run `npm run doctor` to ensure all `.env` files are correctly configured.
2.  **Build**: Run `npm run build` from the root to compile all TypeScript and Next.js projects.
3.  **Process Management**: Use `pm2 start ecosystem.config.js` to launch all services.
4.  **Verification**: 
    - Check API health: `curl https://your-domain.com/api/`
    - Check logs: `pm2 logs`

## 🛠️ Operational Tasks

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

## 📦 Submodule Updates
To update all components to their latest versions:
```bash
git submodule update --remote --merge
pnpm install
pnpm build
pm2 reload all
```
