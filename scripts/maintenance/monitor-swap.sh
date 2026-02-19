#!/bin/bash
# Automated Swap Monitoring and Clearing Script
# Checks swap usage and auto-clears if threshold breached
# Run every 5 minutes via cron or systemd timer

LOG_FILE="/var/log/swap-monitor.log"
WARNING_THRESHOLD=50
CRITICAL_THRESHOLD=80

# Function to get swap usage percentage
get_swap_usage() {
    free | awk '/^Swap:/ {
        total=$2
        used=$3
        if (total > 0) {
            printf "%.1f", (used/total)*100
        } else {
            printf "0"
        }
    }'
}

# Function to log with timestamp
log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# Get current swap usage
SWAP_USAGE=$(get_swap_usage)
SWAP_USAGE_INT=${SWAP_USAGE%.*}

log "INFO" "Current swap usage: ${SWAP_USAGE}%"

# Check thresholds
if [ "$SWAP_USAGE_INT" -ge "$CRITICAL_THRESHOLD" ]; then
    log "CRITICAL" "Swap usage at ${SWAP_USAGE}% exceeds threshold ${CRITICAL_THRESHOLD}%"
    log "INFO" "Executing swap clearing protocol..."

    sync
    swapoff -a
    swapon -a

    if [ $? -eq 0 ]; then
        log "SUCCESS" "Swap cleared successfully"
        NEW_USAGE=$(get_swap_usage)
        log "INFO" "New swap usage: ${NEW_USAGE}%"
    else
        log "ERROR" "Failed to clear swap. Manual intervention required."
    fi

elif [ "$SWAP_USAGE_INT" -ge "$WARNING_THRESHOLD" ]; then
    log "WARNING" "Swap usage at ${SWAP_USAGE}% exceeds warning threshold ${WARNING_THRESHOLD}%"
    log "INFO" "Monitoring continues. Will auto-clear at ${CRITICAL_THRESHOLD}%"

else
    log "INFO" "Swap usage within normal limits (<${WARNING_THRESHOLD}%)"
fi
