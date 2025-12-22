# Deployment & Operations Guide

This guide covers the procedures for deploying and maintaining the Pixel ecosystem in a production environment.

## 🚀 Deployment Checklist

1.  **Environment Hygiene**: Run `npm run doctor` to ensure all `.env` files are correctly configured.
2.  **Install Dependencies**:
    - Root and monorepo: `pnpm install`
    - Pixel Agent (requires bun): `cd pixel-agent && bun install`
3.  **Build All Projects**:
    - From root: `npm run build`
    - Or specifically for the agent: `cd pixel-agent && bun run build`
4.  **Process Management**: Use `pm2 restart all` (or `pm2 start ecosystem.config.js` if first time) to apply changes.
5.  **Verification**: 
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
To update all components to their latest versions and redeploy:
```bash
git pull --recurse-submodules
pnpm install
cd pixel-agent && bun install
npm run build
pm2 restart all
```
