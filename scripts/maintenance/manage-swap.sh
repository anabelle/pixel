#!/bin/bash
# Swap Management Script for Pixel Ecosystem
# This script monitors and clears swap when necessary

set -e

LOG_FILE="/var/log/pixel-swap-monitor.log"
SWAP_THRESHOLD=50  # Percentage threshold

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_swap() {
    local swap_total=$(free -m | awk '/Swap:/ {print $2}')
    local swap_used=$(free -m | awk '/Swap:/ {print $3}')
    local swap_percent=$((swap_used * 100 / swap_total))
    
    log "Swap Usage: $swap_used MB / $swap_total MB ($swap_percent%)"
    
    echo "$swap_percent"
}

clear_swap() {
    log "Starting swap clear..."
    
    # Check if user is root
    if [ "$(id -u)" -ne 0 ]; then
        log "ERROR: This script must be run as root"
        return 1
    fi
    
    # Get before stats
    local before=$(check_swap)
    
    # Force pages from swap back to RAM
    sync
    sleep 2
    
    # Disable and re-enable swap
    log "Disabling swap..."
    swapoff -a
    sleep 2
    
    log "Re-enabling swap..."
    swapon -a
    sleep 2
    
    # Get after stats
    local after=$(check_swap)
    
    log "Swap cleared: $before% -> $after%"
    
    # Verify
    if [ "$after" -lt "$before" ]; then
        log "SUCCESS: Swap cleared successfully"
        return 0
    else
        log "WARNING: Swap usage did not decrease"
        return 1
    fi
}

monitor_and_clear() {
    log "=== Swap Monitor Check ==="
    
    local swap_percent=$(check_swap)
    
    if [ "$swap_percent" -gt "$SWAP_THRESHOLD" ]; then
        log "ALERT: Swap usage ($swap_percent%) exceeds threshold ($SWAP_THRESHOLD%)"
        
        # Check if actively swapping (last 1 minute)
        local swap_activity=$(vmstat 1 2 | tail -1 | awk '{print $7 + $8}')
        
        if [ "$swap_activity" -lt 10 ]; then
            log "Swap activity is low ($swap_activity pages/sec), safe to clear"
            clear_swap
        else
            log "WARNING: High swap activity detected ($swap_activity pages/sec), NOT clearing swap"
        fi
    else
        log "Swap usage ($swap_percent%) is within threshold ($SWAP_THRESHOLD%)"
    fi
}

# Main execution
case "${1:-monitor}" in
    monitor)
        monitor_and_clear
        ;;
    clear)
        clear_swap
        ;;
    check)
        check_swap
        ;;
    *)
        echo "Usage: $0 {monitor|clear|check}"
        echo "  monitor  - Check swap and clear if above threshold (default)"
        echo "  clear    - Force clear swap (requires root)"
        echo "  check    - Only check and report swap usage"
        exit 1
        ;;
esac
