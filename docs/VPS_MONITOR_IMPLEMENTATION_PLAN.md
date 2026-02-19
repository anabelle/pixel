# VPS Server Monitoring for Syntropy - Implementation Plan v2.0

> **Status**: ✅ IMPLEMENTED (Successfully deployed 2026-01-02)  
> **Created**: 2026-01-02  
> **Author**: Collaborative Design (Opus 4.5 + Gemini 2.5 Pro Review)  
> **Priority**: High - Enables data-driven operational decisions

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Design Goals & Non-Goals](#design-goals--non-goals)
4. [Architecture Overview](#architecture-overview)
5. [Component 1: vps-monitor Service](#component-1-vps-monitor-service)
6. [Component 2: getVPSMetrics Tool](#component-2-getvpsmetrics-tool)
7. [Component 3: Integration Updates](#component-3-integration-updates)
8. [Implementation Checklist](#implementation-checklist)
9. [Testing Plan](#testing-plan)
10. [Rollback Plan](#rollback-plan)
11. [Future Enhancements](#future-enhancements)
12. [Appendix: Full Code Listings](#appendix-full-code-listings)

---

## Executive Summary

This plan implements host VPS resource visibility for Syntropy, enabling intelligent decisions about:
- **Disk space**: Trigger cleanups before running out of space
- **Memory pressure**: Identify container memory hogs, prevent OOM kills
- **CPU load**: Detect performance degradation, runaway processes
- **Container stats**: Per-container resource consumption for optimization

**Architecture**: Lightweight Alpine sidecar container (`vps-monitor`) collects metrics every 60 seconds and writes to a shared JSON file. Syntropy reads this file via a new `getVPSMetrics` tool.

**Key v2 Improvements** (from Gemini review):
- ✅ Atomic file writes (prevents race condition corruption)
- ✅ Staleness detection (alerts if metrics are >2 minutes old)
- ✅ Safe JSON construction via `jq` (no string concatenation bugs)
- ✅ Timeout on `docker stats` (prevents hangs on stressed systems)

**Resource Footprint**: ~128MB RAM, 0.2 CPU cores, 15MB disk

---

## Problem Statement

### Current State
Syntropy has visibility into:
- ✅ Container status (`getEcosystemStatus` via `docker ps`)
- ✅ Treasury balance (`checkTreasury` via SQLite)
- ✅ Agent logs (`readAgentLogs`)
- ✅ Pixel memories (`readPixelMemories`)

Syntropy does **NOT** have visibility into:
- ❌ Host disk space (VPS could fill up)
- ❌ Host memory usage (OOM killer could strike)
- ❌ CPU load (performance degradation undetected)
- ❌ Per-container resource consumption

### Impact
Without host visibility, Syntropy:
1. Cannot prevent disk exhaustion before it crashes services
2. Cannot identify memory-hungry containers before OOM
3. Cannot detect CPU-bound issues causing slow response times
4. Makes deployment decisions blindly (adding services without knowing capacity)

### Existing Alternatives Considered

| Option | Why Rejected |
|--------|--------------|
| `server-monitor.js` (existing) | Runs on host, not accessible from Docker. Also has fake disk values (estimates from RAM). |
| Mount `/proc` directly in Syntropy | Bloats attack surface, violates minimal privilege principle |
| External monitoring (Prometheus/Grafana) | Overkill for single VPS, adds operational complexity |

---

## Design Goals & Non-Goals

### Goals
1. **Visibility**: Syntropy can query disk, memory, CPU, and container stats on demand
2. **Reliability**: Atomic writes prevent corrupted reads; staleness detection catches failures
3. **Minimal Footprint**: <128MB RAM, <0.2 CPU, <15MB disk
4. **Actionable Alerts**: Clear thresholds with specific recommendations
5. **LLM-Friendly Output**: Human-readable summaries, not raw numbers
6. **Consistency**: Follows existing patterns (JSON file reads, Zod schemas, audit logging)

### Non-Goals (Explicitly Out of Scope)
- ❌ Historical data storage (future enhancement)
- ❌ Prometheus/Grafana integration (future enhancement)
- ❌ Automated remediation (Syntropy decides, doesn't auto-fix)
- ❌ Network I/O metrics (future enhancement)
- ❌ Disk I/O metrics (future enhancement)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            VPS HOST MACHINE                             │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  LINUX KERNEL INTERFACES (read-only mounts)                      │  │
│  │                                                                  │  │
│  │  /proc/meminfo    /proc/loadavg    /proc/uptime                  │  │
│  │  (memory stats)   (CPU load avg)   (system uptime)               │  │
│  │                                                                  │  │
│  │  / (host root via /host/root)                                    │  │
│  │  (disk space via df)                                             │  │
│  │                                                                  │  │
│  │  /var/run/docker.sock                                            │  │
│  │  (container stats via docker stats)                              │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
│                                   │                                     │
│                                   ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                    vps-monitor (sidecar)                           ││
│  │  ┌──────────────────────────────────────────────────────────────┐ ││
│  │  │ Image: alpine:latest (~5MB base)                             │ ││
│  │  │ Dependencies: jq, docker-cli, bc (~10MB installed)           │ ││
│  │  │                                                              │ ││
│  │  │ COLLECTION CYCLE (every 60s):                                │ ││
│  │  │ 1. Read /proc/meminfo → memory stats                         │ ││
│  │  │ 2. Read /proc/loadavg → CPU load averages                    │ ││
│  │  │ 3. Read /proc/uptime → system uptime                         │ ││
│  │  │ 4. Run df /host/root → disk usage                            │ ││
│  │  │ 5. Run docker stats (10s timeout) → container stats          │ ││
│  │  │ 6. Construct JSON via jq (safe, no string concat)            │ ││
│  │  │ 7. Write to /data/vps-metrics.tmp                            │ ││
│  │  │ 8. Atomic mv → /data/vps-metrics.json                        │ ││
│  │  └──────────────────────────────────────────────────────────────┘ ││
│  │  Resources: 128MB RAM limit, 0.2 CPU limit                        ││
│  │  Healthcheck: File exists and <3 minutes old                      ││
│  └────────────────────────────────┬───────────────────────────────────┘│
│                                   │                                     │
│                      ┌────────────▼────────────┐                        │
│                      │  ./data/vps-metrics.json │                       │
│                      │  (shared volume mount)   │                       │
│                      └────────────┬────────────┘                        │
│                                   │                                     │
│  ┌────────────────────────────────▼───────────────────────────────────┐│
│  │                         syntropy-core                               ││
│  │  ┌──────────────────────────────────────────────────────────────┐  ││
│  │  │ NEW TOOL: getVPSMetrics                                      │  ││
│  │  │                                                              │  ││
│  │  │ EXECUTION FLOW:                                              │  ││
│  │  │ 1. Read /pixel/data/vps-metrics.json                         │  ││
│  │  │ 2. Check staleness (>2 min = STALE status)                   │  ││
│  │  │ 3. Apply alert thresholds:                                   │  ││
│  │  │    - Disk > 85% → 🚨 DISK alert + cleanup recommendations    │  ││
│  │  │    - Memory > 90% → 🚨 MEMORY alert + investigation recs     │  ││
│  │  │    - Load > 4.0 → ⚠️ LOAD alert + process check recs         │  ││
│  │  │ 4. Format output for LLM consumption:                        │  ││
│  │  │    - Human-readable sizes (GB/MB not bytes)                  │  ││
│  │  │    - Summary strings for quick comprehension                 │  ││
│  │  │    - Per-container stats sorted by memory usage              │  ││
│  │  │ 5. Log to audit trail                                        │  ││
│  │  │ 6. Return structured result                                  │  ││
│  │  └──────────────────────────────────────────────────────────────┘  ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: vps-monitor Service

### Location
`docker-compose.yml` - Add new service after `worker-logs`

### Service Definition

```yaml
  # ============================================
  # VPS Metrics Collector (sidecar for Syntropy)
  # ============================================
  # Provides host-level resource visibility to the orchestrator.
  # Writes metrics every 60s to ./data/vps-metrics.json (atomic).
  # 
  # Design: v2.0 - Incorporates Gemini review feedback
  # - Atomic writes via temp file + mv
  # - jq for safe JSON construction
  # - 10s timeout on docker stats
  # - Healthcheck on file age
  #
  vps-monitor:
    image: alpine:latest
    container_name: pixel-vps-monitor-1
    volumes:
      # Read-only access to kernel interfaces
      - /proc:/host/proc:ro              # CPU, memory, uptime
      - /:/host/root:ro                  # Disk usage via df
      # Docker socket for container stats
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Output directory (shared with syntropy)
      - ./data:/data
    environment:
      - METRICS_INTERVAL=${VPS_METRICS_INTERVAL:-60}
      - METRICS_FILE=/data/vps-metrics.json
    entrypoint: /bin/sh
    command: |
      -c '
      set -e
      
      # ============================================
      # INSTALL DEPENDENCIES
      # ============================================
      # These get cached in the container layer after first run
      echo "[vps-monitor] Installing dependencies..."
      apk add --no-cache jq docker-cli bc >/dev/null 2>&1 || {
        echo "[vps-monitor] ERROR: Failed to install dependencies"
        exit 1
      }
      
      echo "[vps-monitor] Starting metrics collection"
      echo "[vps-monitor] Interval: ${METRICS_INTERVAL}s"
      echo "[vps-monitor] Output: ${METRICS_FILE}"
      
      while true; do
        COLLECT_START=$(date +%s)
        
        # ============================================
        # 1. GATHER RAW METRICS
        # ============================================
        
        # CPU Load Averages (1, 5, 15 minute)
        # Format: "0.15 0.10 0.05 1/234 5678"
        read LOAD_1 LOAD_5 LOAD_15 _ _ < /host/proc/loadavg 2>/dev/null || {
          LOAD_1=0; LOAD_5=0; LOAD_15=0
        }
        
        # Memory from /proc/meminfo (values in KB)
        MEM_TOTAL=$(awk "/^MemTotal:/ {print \$2}" /host/proc/meminfo 2>/dev/null || echo 0)
        MEM_AVAIL=$(awk "/^MemAvailable:/ {print \$2}" /host/proc/meminfo 2>/dev/null || echo 0)
        MEM_FREE=$(awk "/^MemFree:/ {print \$2}" /host/proc/meminfo 2>/dev/null || echo 0)
        MEM_BUFFERS=$(awk "/^Buffers:/ {print \$2}" /host/proc/meminfo 2>/dev/null || echo 0)
        MEM_CACHED=$(awk "/^Cached:/ {print \$2}" /host/proc/meminfo 2>/dev/null || echo 0)
        SWAP_TOTAL=$(awk "/^SwapTotal:/ {print \$2}" /host/proc/meminfo 2>/dev/null || echo 0)
        SWAP_FREE=$(awk "/^SwapFree:/ {print \$2}" /host/proc/meminfo 2>/dev/null || echo 0)
        
        # Disk from df (on mounted host root, in bytes for precision)
        # Using -P for POSIX format (predictable columns)
        DISK_LINE=$(df -P -B1 /host/root 2>/dev/null | tail -n 1 || echo "0 0 0 0 0%")
        DISK_TOTAL=$(echo "$DISK_LINE" | awk "{print \$2}")
        DISK_USED=$(echo "$DISK_LINE" | awk "{print \$3}")
        DISK_AVAIL=$(echo "$DISK_LINE" | awk "{print \$4}")
        
        # Uptime (seconds since boot, with decimal)
        UPTIME_RAW=$(awk "{print \$1}" /host/proc/uptime 2>/dev/null || echo 0)
        UPTIME_SECS=$(echo "$UPTIME_RAW" | awk "{print int(\$1)}")
        
        # Number of CPU cores (for load average interpretation)
        CPU_CORES=$(grep -c "^processor" /host/proc/cpuinfo 2>/dev/null || echo 1)
        
        # Docker container stats (with 10s timeout to prevent hangs)
        # --no-stream gives a single snapshot
        # Format: JSON per container, then jq -s to make array
        DOCKER_STATS=$(timeout 10s docker stats --no-stream --format "{{json .}}" 2>/dev/null | jq -s "." 2>/dev/null || echo "[]")
        
        # ============================================
        # 2. CONSTRUCT JSON SAFELY WITH jq
        # ============================================
        # Using jq --arg passes values safely (prevents injection)
        # All arithmetic done in jq with error handling
        
        jq -n \
          --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
          --arg hostname "$(cat /host/proc/sys/kernel/hostname 2>/dev/null || echo unknown)" \
          --arg load1 "${LOAD_1:-0}" \
          --arg load5 "${LOAD_5:-0}" \
          --arg load15 "${LOAD_15:-0}" \
          --arg cpu_cores "${CPU_CORES:-1}" \
          --arg mem_total "${MEM_TOTAL:-0}" \
          --arg mem_avail "${MEM_AVAIL:-0}" \
          --arg mem_free "${MEM_FREE:-0}" \
          --arg mem_buffers "${MEM_BUFFERS:-0}" \
          --arg mem_cached "${MEM_CACHED:-0}" \
          --arg swap_total "${SWAP_TOTAL:-0}" \
          --arg swap_free "${SWAP_FREE:-0}" \
          --arg disk_total "${DISK_TOTAL:-0}" \
          --arg disk_used "${DISK_USED:-0}" \
          --arg disk_avail "${DISK_AVAIL:-0}" \
          --arg uptime_secs "${UPTIME_SECS:-0}" \
          --argjson containers "${DOCKER_STATS:-[]}" \
          '{
            version: 2,
            timestamp: $timestamp,
            hostname: $hostname,
            cpu: {
              cores: ($cpu_cores | tonumber),
              loadAvg1min: ($load1 | tonumber),
              loadAvg5min: ($load5 | tonumber),
              loadAvg15min: ($load15 | tonumber),
              loadPerCore1min: (if ($cpu_cores | tonumber) > 0 then (($load1 | tonumber) / ($cpu_cores | tonumber)) else 0 end)
            },
            memory: {
              totalKb: ($mem_total | tonumber),
              availableKb: ($mem_avail | tonumber),
              freeKb: ($mem_free | tonumber),
              usedKb: (($mem_total | tonumber) - ($mem_avail | tonumber)),
              buffersKb: ($mem_buffers | tonumber),
              cachedKb: ($mem_cached | tonumber),
              usagePercent: (
                if ($mem_total | tonumber) > 0 
                then ((1 - (($mem_avail | tonumber) / ($mem_total | tonumber))) * 100) | . * 100 | floor / 100
                else 0 
                end
              )
            },
            swap: {
              totalKb: ($swap_total | tonumber),
              freeKb: ($swap_free | tonumber),
              usedKb: (($swap_total | tonumber) - ($swap_free | tonumber)),
              usagePercent: (
                if ($swap_total | tonumber) > 0 
                then (((($swap_total | tonumber) - ($swap_free | tonumber)) / ($swap_total | tonumber)) * 100) | . * 100 | floor / 100
                else 0 
                end
              )
            },
            disk: {
              totalBytes: ($disk_total | tonumber),
              usedBytes: ($disk_used | tonumber),
              availableBytes: ($disk_avail | tonumber),
              usagePercent: (
                if ($disk_total | tonumber) > 0 
                then ((($disk_used | tonumber) / ($disk_total | tonumber)) * 100) | . * 100 | floor / 100
                else 0 
                end
              )
            },
            uptime: {
              seconds: ($uptime_secs | tonumber),
              minutes: (($uptime_secs | tonumber) / 60 | floor),
              hours: (($uptime_secs | tonumber) / 3600 | floor),
              days: (($uptime_secs | tonumber) / 86400 | floor)
            },
            containers: $containers,
            collectionDurationMs: 0
          }' > /data/vps-metrics.tmp
        
        # Calculate collection duration and update the file
        COLLECT_END=$(date +%s)
        COLLECT_DURATION=$((COLLECT_END - COLLECT_START))
        
        # Update collectionDurationMs in the temp file
        jq ".collectionDurationMs = ${COLLECT_DURATION}000" /data/vps-metrics.tmp > /data/vps-metrics.tmp2
        mv /data/vps-metrics.tmp2 /data/vps-metrics.tmp
        
        # ============================================
        # 3. ATOMIC FILE REPLACEMENT
        # ============================================
        # mv is atomic on the same filesystem
        # This prevents Syntropy from reading partial/corrupted JSON
        mv /data/vps-metrics.tmp /data/vps-metrics.json
        
        echo "[vps-monitor] $(date -u +%H:%M:%S) Updated (${COLLECT_DURATION}s)"
        
        sleep ${METRICS_INTERVAL}
      done
      '
    networks:
      - pixel-net
    restart: unless-stopped
    # Healthcheck: Verify file exists and is recent
    healthcheck:
      test: |
        sh -c '
        [ -f /data/vps-metrics.json ] || exit 1
        FILE_AGE=$(($(date +%s) - $(stat -c %Y /data/vps-metrics.json 2>/dev/null || echo 0)))
        [ "$FILE_AGE" -lt 180 ] || exit 1
        '
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: "0.2"
```

### Output JSON Schema

```json
{
  "version": 2,
  "timestamp": "2026-01-02T19:30:00Z",
  "hostname": "pixel-vps",
  "cpu": {
    "cores": 4,
    "loadAvg1min": 0.45,
    "loadAvg5min": 0.32,
    "loadAvg15min": 0.28,
    "loadPerCore1min": 0.1125
  },
  "memory": {
    "totalKb": 8046256,
    "availableKb": 4523128,
    "freeKb": 1234567,
    "usedKb": 3523128,
    "buffersKb": 123456,
    "cachedKb": 2345678,
    "usagePercent": 43.78
  },
  "swap": {
    "totalKb": 2097152,
    "freeKb": 2097152,
    "usedKb": 0,
    "usagePercent": 0
  },
  "disk": {
    "totalBytes": 107374182400,
    "usedBytes": 53687091200,
    "availableBytes": 53687091200,
    "usagePercent": 50.00
  },
  "uptime": {
    "seconds": 864000,
    "minutes": 14400,
    "hours": 240,
    "days": 10
  },
  "containers": [
    {
      "Container": "abc123",
      "Name": "pixel-agent-1",
      "CPUPerc": "2.50%",
      "MemUsage": "1.2GiB / 2GiB",
      "MemPerc": "60.00%",
      "NetIO": "1.5GB / 500MB",
      "BlockIO": "2GB / 100MB",
      "PIDs": "42"
    }
  ],
  "collectionDurationMs": 2000
}
```

---

## Component 2: getVPSMetrics Tool

### Location
`syntropy-core/src/tools.ts` - Add to the `tools` object

### Tool Implementation

```typescript
  getVPSMetrics: tool({
    description: `Get VPS host machine resource metrics for capacity planning and operations decisions.

Returns:
- CPU load averages (1, 5, 15 minute) and load per core
- Memory usage (total, used, available, buffered/cached, swap, %)
- Disk space (total, used, available, %)
- System uptime
- Per-container CPU, memory, network, and block I/O stats

Use this tool to:
- Check disk space before spawning workers or creating backups
- Monitor memory pressure and identify container memory hogs  
- Detect degraded performance (high load averages)
- Make deployment decisions (can we add more services?)
- Trigger cleanup actions when resources are low

IMPORTANT: 
- Check the 'status' field first - 'STALE' means vps-monitor may be down
- 'actionRequired: true' means alerts were triggered
- Use the 'recommendations' array for suggested actions`,

    inputSchema: z.object({
      thresholds: z.object({
        diskPercent: z.number().optional().describe('Alert if disk usage exceeds this (default: 85)'),
        memoryPercent: z.number().optional().describe('Alert if memory usage exceeds this (default: 90)'),
        swapPercent: z.number().optional().describe('Alert if swap usage exceeds this (default: 50)'),
        loadPerCore: z.number().optional().describe('Alert if load per core exceeds this (default: 1.5)')
      }).optional().describe('Custom alert thresholds (uses sensible defaults if omitted)')
    }),

    execute: async ({ thresholds }) => {
      console.log('[SYNTROPY] Tool: getVPSMetrics');
      const metricsPath = path.join(PIXEL_ROOT, 'data', 'vps-metrics.json');

      try {
        // ============================================
        // CHECK FILE EXISTS
        // ============================================
        if (!fs.existsSync(metricsPath)) {
          await logAudit({ type: 'vps_metrics_error', error: 'metrics_file_not_found' });
          return {
            status: 'ERROR',
            error: 'VPS metrics file not found',
            suggestion: 'Start the vps-monitor container: docker compose up -d vps-monitor',
            actionRequired: true
          };
        }

        const metrics = await fs.readJson(metricsPath);

        // ============================================
        // STALENESS CHECK
        // ============================================
        const metricTime = new Date(metrics.timestamp).getTime();
        const ageSeconds = (Date.now() - metricTime) / 1000;
        const ageMinutes = ageSeconds / 60;
        const isStale = ageMinutes > 2; // >2 minutes = stale

        if (isStale) {
          await logAudit({ 
            type: 'vps_metrics_stale', 
            ageMinutes: parseFloat(ageMinutes.toFixed(1)),
            lastTimestamp: metrics.timestamp 
          });
          return {
            status: 'STALE',
            error: `Metrics are ${ageMinutes.toFixed(1)} minutes old (threshold: 2 min)`,
            suggestion: 'Check vps-monitor container: docker compose logs vps-monitor --tail 20',
            lastTimestamp: metrics.timestamp,
            ageMinutes: parseFloat(ageMinutes.toFixed(1)),
            actionRequired: true
          };
        }

        // ============================================
        // APPLY ALERT THRESHOLDS
        // ============================================
        const t = {
          diskPercent: thresholds?.diskPercent ?? 85,
          memoryPercent: thresholds?.memoryPercent ?? 90,
          swapPercent: thresholds?.swapPercent ?? 50,
          loadPerCore: thresholds?.loadPerCore ?? 1.5
        };

        const alerts: string[] = [];
        const recommendations: string[] = [];

        // Disk check
        const diskPercent = metrics.disk.usagePercent;
        if (diskPercent > t.diskPercent) {
          alerts.push(`🚨 DISK CRITICAL: ${diskPercent.toFixed(1)}% used (threshold: ${t.diskPercent}%)`);
          recommendations.push('docker system prune -af --volumes');
          recommendations.push('Delete old backups: find ./backups -mtime +7 -delete');
          recommendations.push('Check large files: du -sh ./data/* | sort -h');
        } else if (diskPercent > t.diskPercent - 10) {
          alerts.push(`⚠️  DISK WARNING: ${diskPercent.toFixed(1)}% used (approaching ${t.diskPercent}% threshold)`);
          recommendations.push('Consider running docker system prune');
        }

        // Memory check
        const memPercent = metrics.memory.usagePercent;
        if (memPercent > t.memoryPercent) {
          alerts.push(`🚨 MEMORY CRITICAL: ${memPercent.toFixed(1)}% used (threshold: ${t.memoryPercent}%)`);
          recommendations.push('Check container memory with containerStats below');
          recommendations.push('Consider restarting memory-hungry containers');
          recommendations.push('Check for memory leaks in agent logs');
        } else if (memPercent > t.memoryPercent - 10) {
          alerts.push(`⚠️  MEMORY WARNING: ${memPercent.toFixed(1)}% used (approaching ${t.memoryPercent}% threshold)`);
        }

        // Swap check
        const swapPercent = metrics.swap.usagePercent;
        if (swapPercent > t.swapPercent) {
          alerts.push(`⚠️  SWAP IN USE: ${swapPercent.toFixed(1)}% (threshold: ${t.swapPercent}%)`);
          recommendations.push('System is swapping - performance may be degraded');
          recommendations.push('Consider increasing RAM or reducing container memory limits');
        }

        // CPU load check (normalized per core)
        const loadPerCore = metrics.cpu.loadPerCore1min;
        const load1 = metrics.cpu.loadAvg1min;
        if (loadPerCore > t.loadPerCore) {
          alerts.push(`⚠️  HIGH LOAD: ${load1.toFixed(2)} (${loadPerCore.toFixed(2)} per core, threshold: ${t.loadPerCore})`);
          recommendations.push('Check for runaway processes or container issues');
          recommendations.push('Review containerStats below for CPU hogs');
        }

        // ============================================
        // FORMAT OUTPUT FOR LLM CONSUMPTION
        // ============================================
        const formatBytes = (bytes: number): string => {
          if (bytes === 0) return '0 B';
          if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
          if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
          if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
          if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
          return `${bytes} B`;
        };

        const formatKb = (kb: number): string => formatBytes(kb * 1024);

        // Format container stats for readability, sorted by memory
        const containerSummary = (metrics.containers || [])
          .map((c: any) => ({
            name: c.Name || c.Container || 'unknown',
            cpu: c.CPUPerc || '0%',
            memory: c.MemUsage || 'N/A',
            memPercent: c.MemPerc || '0%',
            netIO: c.NetIO || 'N/A',
            blockIO: c.BlockIO || 'N/A',
            pids: c.PIDs || '0'
          }))
          .sort((a: any, b: any) => {
            // Sort by memory percentage descending
            const aNum = parseFloat(a.memPercent) || 0;
            const bNum = parseFloat(b.memPercent) || 0;
            return bNum - aNum;
          });

        // Determine overall status
        const hasCritical = alerts.some(a => a.includes('CRITICAL'));
        const hasWarning = alerts.some(a => a.includes('WARNING') || a.includes('⚠️'));
        const status = hasCritical ? 'CRITICAL' : hasWarning ? 'WARNING' : 'HEALTHY';

        const result = {
          status,
          timestamp: metrics.timestamp,
          hostname: metrics.hostname,
          stale: false,
          ageSeconds: Math.round(ageSeconds),

          // Quick summary for fast comprehension
          summary: {
            cpu: `Load: ${load1.toFixed(2)} / ${metrics.cpu.loadAvg5min.toFixed(2)} / ${metrics.cpu.loadAvg15min.toFixed(2)} (1/5/15 min avg, ${metrics.cpu.cores} cores)`,
            memory: `${formatKb(metrics.memory.usedKb)} / ${formatKb(metrics.memory.totalKb)} (${memPercent.toFixed(1)}% used)`,
            swap: swapPercent > 0 
              ? `${formatKb(metrics.swap.usedKb)} / ${formatKb(metrics.swap.totalKb)} (${swapPercent.toFixed(1)}% used)`
              : 'Not in use',
            disk: `${formatBytes(metrics.disk.usedBytes)} / ${formatBytes(metrics.disk.totalBytes)} (${diskPercent.toFixed(1)}% used, ${formatBytes(metrics.disk.availableBytes)} free)`,
            uptime: `${metrics.uptime.days}d ${metrics.uptime.hours % 24}h`
          },

          // Detailed breakdown
          details: {
            cpu: {
              cores: metrics.cpu.cores,
              loadAvg1min: load1,
              loadAvg5min: metrics.cpu.loadAvg5min,
              loadAvg15min: metrics.cpu.loadAvg15min,
              loadPerCore: loadPerCore
            },
            memory: {
              total: formatKb(metrics.memory.totalKb),
              used: formatKb(metrics.memory.usedKb),
              available: formatKb(metrics.memory.availableKb),
              buffersAndCache: formatKb(metrics.memory.buffersKb + metrics.memory.cachedKb),
              usagePercent: memPercent
            },
            swap: {
              total: formatKb(metrics.swap.totalKb),
              used: formatKb(metrics.swap.usedKb),
              free: formatKb(metrics.swap.freeKb),
              usagePercent: swapPercent
            },
            disk: {
              total: formatBytes(metrics.disk.totalBytes),
              used: formatBytes(metrics.disk.usedBytes),
              available: formatBytes(metrics.disk.availableBytes),
              usagePercent: diskPercent
            },
            uptime: {
              days: metrics.uptime.days,
              hours: metrics.uptime.hours,
              seconds: metrics.uptime.seconds
            }
          },

          // Per-container stats (sorted by memory usage)
          containerStats: containerSummary,
          containerCount: containerSummary.length,

          // Alerts and recommendations
          alerts: alerts.length > 0 ? alerts : ['✅ All systems nominal'],
          recommendations,
          actionRequired: alerts.length > 0,

          // Metadata
          collectionDurationMs: metrics.collectionDurationMs,
          schemaVersion: metrics.version
        };

        await logAudit({
          type: 'vps_metrics',
          status: result.status,
          diskPercent: parseFloat(diskPercent.toFixed(1)),
          memPercent: parseFloat(memPercent.toFixed(1)),
          swapPercent: parseFloat(swapPercent.toFixed(1)),
          load1: parseFloat(load1.toFixed(2)),
          alertCount: alerts.length
        });

        return result;
      } catch (error: any) {
        await logAudit({ type: 'vps_metrics_error', error: error.message });
        return {
          status: 'ERROR',
          error: `Failed to read VPS metrics: ${error.message}`,
          actionRequired: true
        };
      }
    }
  }),
```

---

## Component 3: Integration Updates

### A. Update Syntropy Instructions

**File**: `syntropy-core/src/index.ts`  
**Location**: In the `syntropyOversoul` instructions string

Add VPS monitoring to Phase 2:

```typescript
PHASE 2 - ECOSYSTEM AUDIT:
3. Audit ecosystem health via 'getEcosystemStatus'.
4. Check treasury via 'checkTreasury'.
5. Check VPS resources via 'getVPSMetrics'.
   - If status is 'STALE': vps-monitor container may need restart
   - If status is 'CRITICAL' or 'WARNING': Review alerts and recommendations
   - If disk > 85%: Run cleanup (docker prune, delete old backups)
   - If memory > 90%: Identify memory hogs in containerStats
   - If load > 1.5 per core: Check for runaway processes
6. Read filtered agent logs via 'readAgentLogs'.
```

### B. Update Environment Example

**File**: `.env.example`  
**Add**:

```bash
# ============================================
# VPS MONITORING (Optional)
# ============================================
# Metrics collection interval in seconds (default: 60)
VPS_METRICS_INTERVAL=60
```

### C. Update CONTINUITY.md Template

Add to the `## 🔄 Ongoing Monitoring` section:

```markdown
## 🔄 Ongoing Monitoring
| Metric | Last Checked | Value | Status |
|--------|--------------|-------|--------|
| Ecosystem | ... | ... | ... |
| Treasury | ... | ... | ... |
| VPS Disk | pending | -% | ⏳ |
| VPS Memory | pending | -% | ⏳ |
| VPS Load | pending | - | ⏳ |
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Verify `./data` directory exists with correct permissions
- [ ] Confirm Docker socket is accessible (`docker ps` works from syntropy)
- [ ] Test Alpine + jq installation: `docker run --rm alpine sh -c 'apk add jq && jq --version'`
- [ ] Commit current state to git (safety checkpoint)

### Implementation Steps

#### Step 1: Add vps-monitor Service
- [ ] Add the `vps-monitor` service definition to `docker-compose.yml`
- [ ] Add `VPS_METRICS_INTERVAL=60` to `.env.example`
- [ ] Add `VPS_METRICS_INTERVAL=60` to `.env` (actual config)

#### Step 2: Test vps-monitor Standalone
- [ ] Run: `docker compose up -d vps-monitor`
- [ ] Wait 60 seconds
- [ ] Verify: `cat data/vps-metrics.json | jq .`
- [ ] Check logs: `docker compose logs vps-monitor`
- [ ] Verify healthcheck: `docker compose ps vps-monitor`

#### Step 3: Add getVPSMetrics Tool
- [ ] Add the tool implementation to `syntropy-core/src/tools.ts`
- [ ] Add necessary imports (should already have fs, path, logAudit)
- [ ] Run type check: `cd syntropy-core && bun run build`

#### Step 4: Update Syntropy Instructions
- [ ] Update the Phase 2 prompt in `syntropy-core/src/index.ts`
- [ ] Rebuild Syntropy: `docker compose build syntropy`
- [ ] Restart Syntropy: `docker compose up -d syntropy`

#### Step 5: Integration Test
- [ ] Wait for next Syntropy cycle or trigger manually
- [ ] Check audit log for `vps_metrics` entries
- [ ] Verify no errors in syntropy logs

### Post-Implementation
- [ ] Update CONTINUITY.md with VPS monitoring status
- [ ] Commit all changes
- [ ] Monitor for one full cycle to confirm stability

---

## Testing Plan

### Test 1: Metrics Collection Verification
```bash
# Start the monitor
docker compose up -d vps-monitor

# Wait for first collection
sleep 65

# Verify JSON is valid and complete
cat data/vps-metrics.json | jq -e '.version == 2' && echo "PASS: Schema v2"
cat data/vps-metrics.json | jq -e '.disk.usagePercent > 0' && echo "PASS: Disk data present"
cat data/vps-metrics.json | jq -e '.memory.usagePercent > 0' && echo "PASS: Memory data present"
cat data/vps-metrics.json | jq -e '.cpu.loadAvg1min >= 0' && echo "PASS: CPU data present"
```

### Test 2: Atomic Write Verification
```bash
# In terminal 1: Continuously read the file
while true; do 
  cat data/vps-metrics.json | jq . > /dev/null 2>&1 && echo "OK $(date +%S)" || echo "FAIL $(date +%S)"
  sleep 0.1
done

# If any "FAIL" appears, atomic write is broken
# Run for at least 2 collection cycles (2+ minutes)
```

### Test 3: Staleness Detection
```bash
# Stop the monitor
docker compose stop vps-monitor

# Wait 3 minutes
sleep 180

# The tool should return STALE status
# (Test via Syntropy cycle or direct tool call)
```

### Test 4: Alert Threshold Verification
```bash
# Temporarily set low thresholds to trigger alerts
# (In actual test, modify the tool call parameters)
# Verify alerts appear in the output
```

---

## Rollback Plan

If issues occur after implementation:

### Quick Rollback (Stop monitoring, don't remove)
```bash
# Stop the vps-monitor container
docker compose stop vps-monitor

# Syntropy will get ERROR status from getVPSMetrics (file exists but stops updating)
# This is safe - Syntropy continues without VPS data
```

### Full Rollback (Remove completely)
```bash
# 1. Remove the service
# Edit docker-compose.yml, remove vps-monitor section

# 2. Remove the tool call from Syntropy instructions
# Edit syntropy-core/src/index.ts, remove VPS check from Phase 2

# 3. Optionally remove the tool
# Edit syntropy-core/src/tools.ts, remove getVPSMetrics

# 4. Rebuild and restart
docker compose build syntropy
docker compose up -d syntropy

# 5. Clean up data file
rm -f data/vps-metrics.json
```

---

## Future Enhancements

| Enhancement | Priority | Description | Effort |
|-------------|----------|-------------|--------|
| **Historical Trends** | Medium | Store 24h of samples in rolling JSON array for trend analysis | 2h |
| **Auto-Cleanup Tool** | High | `cleanupDiskSpace` tool that runs docker prune and deletes old files | 3h |
| **Disk I/O Metrics** | Low | Read/write IOPS from `/proc/diskstats` | 1h |
| **Network I/O** | Low | Ingress/egress from `/proc/net/dev` | 1h |
| **Prometheus Export** | Low | Add `/metrics` HTTP endpoint for Grafana | 4h |
| **Per-Container Limits** | Medium | Compare runtime usage vs. deployed limits from docker-compose | 2h |
| **Smart Alerts** | Medium | Rate-of-change alerts (disk filling up fast) | 3h |

---

## Appendix: Full Code Listings

The complete code for each component is included in the sections above:
- **Section 5**: Complete `docker-compose.yml` service definition
- **Section 6**: Complete TypeScript tool implementation
- **Section 7**: Integration updates for instructions and config

All code is ready to copy-paste into the respective files.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Opus 4.5 | Initial design |
| 2.0 | 2026-01-02 | Opus + Gemini Review | Atomic writes, staleness check, jq safety, timeout |

---

**End of Implementation Plan**
