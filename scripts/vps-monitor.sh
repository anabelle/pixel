#!/bin/sh
set -e

# ============================================
# VPS MONITOR - Host Metrics Collector v2.0
# ============================================
# Collects host-level metrics and writes to JSON file.
# Designed to run in Alpine container with access to:
# - /host/proc (host's /proc, read-only)
# - /host/root (host's /, read-only)
# - /var/run/docker.sock (for container stats)
# - /data (shared volume for output)

METRICS_INTERVAL="${METRICS_INTERVAL:-60}"
METRICS_FILE="${METRICS_FILE:-/data/vps-metrics.json}"

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
  MEM_TOTAL=$(awk '/^MemTotal:/ {print $2}' /host/proc/meminfo 2>/dev/null || echo 0)
  MEM_AVAIL=$(awk '/^MemAvailable:/ {print $2}' /host/proc/meminfo 2>/dev/null || echo 0)
  MEM_FREE=$(awk '/^MemFree:/ {print $2}' /host/proc/meminfo 2>/dev/null || echo 0)
  MEM_BUFFERS=$(awk '/^Buffers:/ {print $2}' /host/proc/meminfo 2>/dev/null || echo 0)
  MEM_CACHED=$(awk '/^Cached:/ {print $2}' /host/proc/meminfo 2>/dev/null || echo 0)
  SWAP_TOTAL=$(awk '/^SwapTotal:/ {print $2}' /host/proc/meminfo 2>/dev/null || echo 0)
  SWAP_FREE=$(awk '/^SwapFree:/ {print $2}' /host/proc/meminfo 2>/dev/null || echo 0)
  
  # Disk from df (on mounted host root, in bytes for precision)
  # Using -P for POSIX format (predictable columns)
  DISK_LINE=$(df -P -B1 /host/root 2>/dev/null | tail -n 1 || echo "0 0 0 0 0%")
  DISK_TOTAL=$(echo "$DISK_LINE" | awk '{print $2}')
  DISK_USED=$(echo "$DISK_LINE" | awk '{print $3}')
  DISK_AVAIL=$(echo "$DISK_LINE" | awk '{print $4}')
  
  # Uptime (seconds since boot, with decimal)
  UPTIME_RAW=$(awk '{print $1}' /host/proc/uptime 2>/dev/null || echo 0)
  UPTIME_SECS=$(echo "$UPTIME_RAW" | awk '{print int($1)}')
  
  # Number of CPU cores (for load average interpretation)
  CPU_CORES=$(grep -c "^processor" /host/proc/cpuinfo 2>/dev/null || echo 1)
  
  # Docker container stats (with 10s timeout to prevent hangs)
  # --no-stream gives a single snapshot
  # Format: JSON per container, then jq -s to make array
  DOCKER_STATS=$(timeout 10s docker stats --no-stream --format '{{json .}}' 2>/dev/null | jq -s '.' 2>/dev/null || echo '[]')
  
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
  mv /data/vps-metrics.tmp "${METRICS_FILE}"
  
  echo "[vps-monitor] $(date -u +%H:%M:%S) Updated (${COLLECT_DURATION}s)"
  
  sleep "${METRICS_INTERVAL}"
done
