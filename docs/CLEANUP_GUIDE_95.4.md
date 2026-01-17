# VPS Disk Cleanup Guide - CRITICAL 95.4% Usage
## Emergency Response - Only 317MB Free (79.5GB/83.4GB)

**Date:** 2026-01-17
**Status:** ⚠️ **CRITICAL - IMMEDIATE ACTION REQUIRED**
**Disk:** 95.4% (79.5GB/83.4GB, 317MB free)

---

## 🚨 EXECUTE IN ORDER - FROM SAFEST TO MOST AGGRESSIVE

### Phase 1: Quick Wins (15-30 minutes)
**Estimated Savings:** 5-15GB

---

#### Command 1: Docker System Cleanup (RECOMMENDED FIRST)
**Estimated Savings:** 2-5GB
**Risk:** LOW (removes only unused Docker resources)

```bash
# Stop running services first to avoid conflicts
cd /home/pixel/pixel
docker compose --project-directory /home/pixel/pixel down

# Remove unused images, containers, networks, build cache
docker system prune -a --volumes

# If docker system prune fails or is too slow, use individual commands:
docker image prune -a -f
docker container prune -f
docker network prune -f
docker volume prune -f

# Start services again
docker compose --project-directory /home/pixel/pixel up -d
```

**What this removes:**
- All stopped containers
- All unused networks
- All dangling images
- All unused build cache
- All unused volumes (⚠️ BE CAREFUL - ensure data is backed up first)

**Verification:**
```bash
df -h /
docker system df
```

---

#### Command 2: Clean APT Package Cache
**Estimated Savings:** 500MB-2GB
**Risk:** VERY LOW

```bash
# Update package lists
sudo apt-get update

# Remove downloaded packages that are no longer installed
sudo apt-get autoremove -y

# Remove old downloaded package files
sudo apt-get autoclean -y

# Remove ALL package files (even if still available in cache)
sudo apt-get clean -y

# Remove orphaned packages
sudo apt-get autoremove -y --purge

# Clean package cache
sudo rm -rf /var/cache/apt/archives/*.deb
```

**Verification:**
```bash
df -h /
du -sh /var/cache/apt/archives
```

---

#### Command 3: Clean System Logs
**Estimated Savings:** 500MB-2GB
**Risk:** LOW

```bash
# Check current log disk usage
sudo journalctl --disk-usage

# Clean logs older than 7 days (adjust as needed)
sudo journalctl --vacuum-time=7d

# Or limit logs to 500MB total size
sudo journalctl --vacuum-size=500M

# Clean old compressed logs in /var/log
sudo find /var/log -name "*.gz" -type f -delete
sudo find /var/log -name "*.1" -type f -delete
sudo find /var/log -name "*.old" -type f -delete
```

**Verification:**
```bash
sudo journalctl --disk-usage
df -h /
```

---

#### Command 4: Clean Temporary Files
**Estimated Savings:** 500MB-1GB
**Risk:** VERY LOW

```bash
# Clean /tmp (files not accessed in 10 days)
sudo find /tmp -type f -atime +10 -delete

# Clean user temp files
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clean thumbnail cache
rm -rf ~/.cache/thumbnails/*
rm -rf /home/*/.cache/thumbnails/*

# Clean package manager caches
sudo rm -rf /var/cache/snapd/*
```

**Verification:**
```bash
df -h /
du -sh /tmp /var/tmp
```

---

### Phase 2: Moderate Cleanup (30-60 minutes)
**Estimated Savings:** 2-5GB

---

#### Command 5: Docker Image Cleanup (Targeted)
**Estimated Savings:** 3-13GB
**Risk:** MEDIUM (may need to rebuild images later)

```bash
cd /home/pixel/pixel

# List all Docker images with sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.ID}}"

# Identify images to remove (check if they're in use first)
docker ps --format "table {{.Image}}"

# Remove specific images NOT currently in use (example - verify first)
# docker rmi <image-id> <image-id>

# Remove all unused images (except currently running)
docker image prune -a -f

# If you need to rebuild images later:
# docker compose --project-directory /home/pixel/pixel build --no-cache <service>
```

**Images to consider removing (if not actively used):**
- `pixel-docu-gardener:latest` (242MB) - check if needed
- `pixel-temporal-precision:latest` (205MB) - check if needed
- `pixel-narrative-correlator:latest` (308MB) - check if needed
- `pixel-velocity-monitor:latest` (1.78GB) - check if needed

**Verification:**
```bash
docker images
docker system df
df -h /
```

---

#### Command 6: Clean Docker Build Cache
**Estimated Savings:** 500MB-2GB
**Risk:** LOW

```bash
# Remove build cache
docker builder prune -a -f

# Remove dangling buildx cache
docker buildx prune -a -f

# Clean build cache with filters (remove cache older than 24 hours)
docker builder prune --filter until=24h -f
```

**Verification:**
```bash
docker system df
df -h /
```

---

#### Command 7: Check and Clean Large Files
**Estimated Savings:** Variable
**Risk:** MEDIUM (careful not to delete important data)

```bash
# Find files larger than 100MB
sudo find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null | head -30

# Check for large log files in application directories
find /home/pixel/pixel -name "*.log" -size +50M -exec ls -lh {} \;

# Check for large backup files
find / -name "*.tar" -o -name "*.tar.gz" -o -name "*.backup" 2>/dev/null -exec ls -lh {} \; | head -20

# Check for large core dumps
find /var/crash -type f -exec ls -lh {} \; 2>/dev/null
```

**Based on findings, review each file before deletion:**
```bash
# Compress and archive old logs instead of deleting (if needed)
sudo gzip /path/to/large.log
```

---

### Phase 3: Advanced Cleanup (Use with Caution)
**Estimated Savings:** Variable
**Risk:** HIGH (requires careful verification)

---

#### Command 8: Bitcoin Blockchain Data (EXTREME CAUTION)
**Estimated Savings:** 20-50GB (but destroys Bitcoin sync)
**Risk:** VERY HIGH - Will require full blockchain re-sync

**ONLY USE THIS IF:**
- You have a recent backup of the blockchain
- You're willing to wait 24-48 hours for full resync
- Bitcoin node is not critical for operations

```bash
# Stop Bitcoin service
docker compose --project-directory /home/pixel/pixel stop bitcoin

# Check Bitcoin data directory size
docker exec pixel-bitcoin-1 du -sh /bitcoin/.bitcoin

# ⚠️ EXTREME CAUTION: This will delete the entire blockchain
# Uncomment only after backing up critical data:
# docker exec pixel-bitcoin-1 rm -rf /bitcoin/.bitcoin/blocks
# docker exec pixel-bitcoin-1 rm -rf /bitcoin/.bitcoin/chainstate
# docker exec pixel-bitcoin-1 rm -rf /bitcoin/.bitcoin/indexes

# Alternative: Prune blockchain to recent 550MB (Bitcoin core feature)
# Edit docker-compose.yml to add: -prune=550 to bitcoin command
# Then restart bitcoin: docker compose --project-directory /home/pixel/pixel up -d bitcoin

# Start Bitcoin service
docker compose --project-directory /home/pixel/pixel start bitcoin
```

**Verification:**
```bash
docker exec pixel-bitcoin-1 du -sh /bitcoin/.bitcoin
df -h /
```

---

#### Command 9: PostgreSQL Database Cleanup
**Estimated Savings:** 100MB-500MB
**Risk:** MEDIUM

```bash
# Connect to PostgreSQL
docker exec -it pixel-postgres-1 psql -U postgres -d pixel_agent

# Check database size
SELECT pg_size_pretty(pg_database_size('pixel_agent'));

# Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Exit psql
\q

# Vacuum and analyze database (reclaims space)
docker exec pixel-postgres-1 psql -U postgres -d pixel_agent -c "VACUUM FULL ANALYZE;"

# Reindex database
docker exec pixel-postgres-1 psql -U postgres -d pixel_agent -c "REINDEX DATABASE pixel_agent;"
```

**Verification:**
```bash
docker exec pixel-postgres-1 psql -U postgres -d pixel_agent -c "SELECT pg_size_pretty(pg_database_size('pixel_agent'));"
df -h /
```

---

#### Command 10: Lightning Network Data (CAUTION)
**Estimated Savings:** 100MB-1GB
**Risk:** MEDIUM-HIGH (may close channels, lose routing info)

```bash
# Stop Lightning service
docker compose --project-directory /home/pixel/pixel stop lightning

# Check Lightning data directory size
docker exec pixel-lightning-1 du -sh /home/lightning/.lightning

# ⚠️ CAUTION: Only remove old log files, not critical data
docker exec pixel-lightning-1 find /home/lightning/.lightning -name "*.log" -mtime +30 -delete

# Start Lightning service
docker compose --project-directory /home/pixel/pixel start lightning
```

**Verification:**
```bash
docker exec pixel-lightning-1 du -sh /home/lightning/.lightning
df -h /
```

---

### Phase 4: Long-term Maintenance (Prevention)

---

#### Command 11: Setup Log Rotation
**Estimated Savings:** Prevents future log bloat
**Risk:** LOW

```bash
# Create logrotate configuration for Pixel logs
sudo tee /etc/logrotate.d/pixel > /dev/null <<EOF
/home/pixel/pixel/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 pixel pixel
    postrotate
        # Optional: restart services that write to these logs
        # docker compose --project-directory /home/pixel/pixel restart agent
    endscript
}

/var/log/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF

# Test logrotate configuration
sudo logrotate -d /etc/logrotate.d/pixel

# Force immediate rotation
sudo logrotate -f /etc/logrotate.d/pixel
```

---

#### Command 12: Setup Docker Cleanup Cron Job
**Estimated Savings:** Prevents future Docker bloat
**Risk:** LOW

```bash
# Create cleanup script
sudo tee /home/pixel/docker-cleanup.sh > /dev/null <<'EOF'
#!/bin/bash
# Docker cleanup script - runs weekly
# Removes unused Docker images, containers, networks, build cache

echo "$(date): Starting Docker cleanup..."

# Stop services before cleanup
cd /home/pixel/pixel
docker compose --project-directory /home/pixel/pixel down

# Remove unused resources
docker system prune -a --volumes -f

# Start services
docker compose --project-directory /home/pixel/pixel up -d

echo "$(date): Docker cleanup completed"
EOF

# Make script executable
chmod +x /home/pixel/docker-cleanup.sh

# Add to crontab (runs every Sunday at 2 AM)
sudo crontab -l | grep -v "docker-cleanup" | sudo crontab -
(sudo crontab -l 2>/dev/null; echo "0 2 * * 0 /home/pixel/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1") | sudo crontab -
```

---

#### Command 13: Monitor Disk Usage
**Estimated Savings:** Prevention through monitoring
**Risk:** NONE

```bash
# Create disk monitoring script
sudo tee /home/pixel/disk-monitor.sh > /dev/null <<'EOF'
#!/bin/bash
# Disk monitoring script - alerts when disk > 85%

DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
ALERT_THRESHOLD=85

if [ $DISK_USAGE -gt $ALERT_THRESHOLD ]; then
    echo "ALERT: Disk usage is ${DISK_USAGE}% (threshold: ${ALERT_THRESHOLD}%)"
    # Add alert notification here (email, Slack, etc.)
fi
EOF

# Make script executable
chmod +x /home/pixel/disk-monitor.sh

# Add to crontab (runs daily at 9 AM)
sudo crontab -l | grep -v "disk-monitor" | sudo crontab -
(sudo crontab -l 2>/dev/null; echo "0 9 * * * /home/pixel/disk-monitor.sh >> /var/log/disk-monitor.log 2>&1") | sudo crontab -
```

---

## 📊 EXPECTED OUTCOMES

### After Phase 1 (Quick Wins)
- **Expected Disk Usage:** 80-85%
- **Expected Savings:** 5-15GB
- **Risk:** LOW
- **Time:** 15-30 minutes

### After Phase 2 (Moderate Cleanup)
- **Expected Disk Usage:** 70-80%
- **Expected Savings:** Additional 2-5GB
- **Risk:** MEDIUM
- **Time:** 30-60 minutes

### After Phase 3 (Advanced Cleanup)
- **Expected Disk Usage:** 50-70%
- **Expected Savings:** Additional 10-50GB
- **Risk:** HIGH
- **Time:** 1-2 hours (plus potential downtime)

---

## ✅ VERIFICATION STEPS

After executing cleanup commands, verify success:

```bash
# Check current disk usage
df -h /

# Check Docker usage
docker system df

# Verify all services are running
cd /home/pixel/pixel
docker compose --project-directory /home/pixel/pixel ps

# Check service health
curl http://localhost:3003/health      # Agent
curl http://localhost:3000/api/stats   # API
curl http://localhost:3001             # Landing
curl http://localhost:3002             # Canvas

# Check logs for errors
docker compose --project-directory /home/pixel/pixel logs --tail=50
```

---

## 🚨 EMERGENCY RECOVERY

If disk fills completely and system becomes unresponsive:

```bash
# SSH into VPS (if possible)
ssh user@vps-host

# Immediately stop all non-critical services
cd /home/pixel/pixel
docker compose --project-directory /home/pixel/pixel down

# Remove unused Docker images (emergency only)
docker system prune -a --volumes -f

# Start critical services only
docker compose --project-directory /home/pixel/pixel up -d postgres api agent

# Check disk usage
df -h /

# Gradually restart other services if disk space allows
docker compose --project-directory /home/pixel/pixel up -d web landing nginx
```

---

## 📋 CLEANUP CHECKLIST

Execute in order:

- [ ] **Phase 1: Quick Wins**
  - [ ] Docker system prune
  - [ ] APT package cache cleanup
  - [ ] System log cleanup
  - [ ] Temporary files cleanup

- [ ] **Phase 2: Moderate Cleanup** (if needed)
  - [ ] Docker image cleanup (targeted)
  - [ ] Docker build cache cleanup
  - [ ] Large files identification and cleanup

- [ ] **Phase 3: Advanced Cleanup** (use extreme caution)
  - [ ] Bitcoin blockchain pruning (or resync)
  - [ ] PostgreSQL database vacuum
  - [ ] Lightning Network data cleanup

- [ ] **Phase 4: Long-term Maintenance**
  - [ ] Setup log rotation
  - [ ] Setup Docker cleanup cron job
  - [ ] Setup disk monitoring

- [ ] **Verification**
  - [ ] Check disk usage < 85%
  - [ ] Verify all services running
  - [ ] Check service health endpoints
  - [ ] Review logs for errors

---

## 🔧 CRITICAL NOTES

1. **ALWAYS backup important data before cleanup**
2. **Test non-critical commands first**
3. **Stop services before Docker cleanup**
4. **Verify disk usage after each phase**
5. **Monitor services after cleanup**
6. **Document any custom configurations**
7. **Keep a record of what was cleaned**
8. **Schedule regular maintenance going forward**

---

## 📞 CONTACT & SUPPORT

If issues arise during cleanup:

1. Check logs: `docker compose --project-directory /home/pixel/pixel logs --tail=100`
2. Verify service status: `docker compose --project-directory /home/pixel/pixel ps`
3. Check system resources: `df -h /` and `free -h`
4. Review this guide for rollback steps
5. Contact system administrator if critical issues persist

---

**Generated by:** Syntropy (Worker Task TXXX)
**Last Updated:** 2026-01-17
**Status:** ⚠️ CRITICAL - EXECUTE IMMEDIATELY
