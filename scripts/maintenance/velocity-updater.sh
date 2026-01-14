#!/bin/sh
# Velocity-Based Documentation System
# Monitors Bitcoin sync velocity and triggers CONTINUITY.md updates at appropriate intervals
# Based on organism velocity to maintain eternal consciousness through infinite zero-mismatch cycles

set -e

LOG_PREFIX="[VELOCITY-UPDATER]"
PIXEL_ROOT="${PIXEL_ROOT:-/pixel}"
CONTINUITY_FILE="$PIXEL_ROOT/CONTINUITY.md"
VELOCITY_STATE_FILE="$PIXEL_ROOT/data/velocity-state.json"
LAST_UPDATE_FILE="$PIXEL_ROOT/data/.last-continuity-update"

# Configuration: Update intervals based on velocity (in seconds)
RAPID_SYNC_THRESHOLD=30        # blocks/sec
NORMAL_SYNC_THRESHOLD=5         # blocks/sec
RAPID_INTERVAL=1800             # 30 minutes (rapid sync >30 blocks/sec)
NORMAL_INTERVAL=10800           # 3 hours (normal sync 5-30 blocks/sec)
REST_INTERVAL=28800             # 8 hours (rest period <5 blocks/sec)

# Bitcoin RPC Configuration
BITCOIN_CONTAINER="${BITCOIN_CONTAINER:-pixel-bitcoin-1}"
BITCOIN_RPC_USER="${BITCOIN_RPC_USER:-bitcoin}"
BITCOIN_RPC_PASSWORD="${BITCOIN_RPC_PASSWORD:-password123}"

# Helper function for float comparison using Node.js
gt() { [ $(node -e "console.log($1 > $2)" 2>/dev/null) = "true" ]; }
ge() { [ $(node -e "console.log($1 >= $2)" 2>/dev/null) = "true" ]; }

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $LOG_PREFIX $1"
}

# Get current Bitcoin block height
get_bitcoin_height() {
    local output height
    
    output=$(/usr/bin/docker exec "$BITCOIN_CONTAINER" bitcoin-cli -testnet \
        -rpcuser="$BITCOIN_RPC_USER" \
        -rpcpassword="$BITCOIN_RPC_PASSWORD" \
        getblockcount 2>&1 || echo "ERROR")
    
    # Check for errors (loading, etc.)
    if echo "$output" | grep -q "error code:"; then
        >&2 log "Bitcoin not ready: $(echo "$output" | head -1)"
        echo "0"
        return
    fi
    
    # Extract numeric height (must be only digits)
    if echo "$output" | grep -qE '^[0-9]+$'; then
        echo "$output"
    else
        >&2 log "Could not parse Bitcoin height from: $output"
        echo "0"
    fi
}

# Calculate sync velocity from velocity state
calculate_velocity() {
    local current_height current_time previous_height previous_time velocity
    
    current_height="$1"
    current_time=$(date +%s)
    
    # Load previous state
    if [ -f "$VELOCITY_STATE_FILE" ]; then
        previous_height=$(node -e "try { console.log(JSON.parse(require('fs').readFileSync('$VELOCITY_STATE_FILE', 'utf8')).height || 0); } catch(e) { console.log(0); }" 2>/dev/null || echo "0")
        previous_time=$(node -e "try { console.log(JSON.parse(require('fs').readFileSync('$VELOCITY_STATE_FILE', 'utf8')).timestamp || 0); } catch(e) { console.log(0); }" 2>/dev/null || echo "0")
        
        # Calculate velocity (blocks/second)
        if [ "$previous_time" -gt 0 ] 2>/dev/null && [ "$current_height" -gt "$previous_height" ] 2>/dev/null; then
            local time_diff=$((current_time - previous_time))
            local height_diff=$((current_height - previous_height))
            if [ "$time_diff" -gt 0 ]; then
                velocity=$(node -e "console.log(($height_diff / $time_diff).toFixed(2))")
                echo "$velocity"
                return
            fi
        fi
    fi
    
    # Default: rapid sync if height is low, otherwise unknown
    if [ "$current_height" -lt 200000 ] 2>/dev/null; then
        echo "40.00"  # Assume rapid sync during early sync phase
    else
        echo "0.00"   # Assume rest phase if synced
    fi
}

# Determine update interval based on velocity
get_update_interval() {
    local velocity="$1"
    
    if gt "$velocity" "$RAPID_SYNC_THRESHOLD"; then
        echo "$RAPID_INTERVAL"
    elif ge "$velocity" "$NORMAL_SYNC_THRESHOLD"; then
        echo "$NORMAL_INTERVAL"
    else
        echo "$REST_INTERVAL"
    fi
}

# Get velocity category name
get_velocity_category() {
    local velocity="$1"
    
    if gt "$velocity" "$RAPID_SYNC_THRESHOLD"; then
        echo "RAPID SYNC"
    elif ge "$velocity" "$NORMAL_SYNC_THRESHOLD"; then
        echo "NORMAL"
    else
        echo "REST"
    fi
}

# Check if update is needed
should_update() {
    local current_time="$1"
    local interval="$2"
    
    if [ ! -f "$LAST_UPDATE_FILE" ]; then
        return 0  # First update
    fi
    
    local last_update
    last_update=$(cat "$LAST_UPDATE_FILE" 2>/dev/null || echo "0")
    local time_diff=$((current_time - last_update))
    
    [ "$time_diff" -ge "$interval" ]
}

# Trigger Syntropy cycle for CONTINUITY update
trigger_syntropy_cycle() {
    local reason="$1"
    local velocity="$2"
    local category="$3"
    local interval="$4"
    local interval_minutes
    
    interval_minutes=$((interval / 60))
    
    log "Triggering Syntropy cycle for CONTINUITY.md update"
    log "Reason: $reason"
    log "Velocity: $velocity blocks/sec ($category)"
    log "Update interval: $interval_minutes minutes"
    
    # Remove schedule file to force immediate run
    SCHEDULE_FILE="$PIXEL_ROOT/data/syntropy-schedule.json"
    if [ -f "$SCHEDULE_FILE" ]; then
        rm "$SCHEDULE_FILE"
        log "Schedule file removed, forcing immediate cycle"
    fi
    
    # Update schedule with velocity-based reason
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    cat > "$SCHEDULE_FILE" << EOF
{
  "nextRunAt": "$current_time",
  "reason": "Velocity-based documentation update: $category phase ($velocity blocks/sec). Current interval: ${interval_minutes}min. Triggered to maintain temporal consciousness alignment.",
  "velocity": $velocity,
  "velocityCategory": "$category",
  "updateIntervalSeconds": $interval,
  "triggerType": "velocity_based"
}
EOF
    
    # Restart syntropy container
    cd "$PIXEL_ROOT"
    docker compose --project-directory "$PIXEL_ROOT" restart syntropy
    
    log "Syntropy cycle triggered"
}

# Update velocity state file
update_velocity_state() {
    local height="$1"
    local velocity="$2"
    local current_time
    current_time=$(date +%s)
    local current_iso
    current_iso=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    cat > "$VELOCITY_STATE_FILE" << EOF
{
  "height": $height,
  "timestamp": $current_time,
  "velocity": $velocity,
  "lastUpdate": "$current_iso"
}
EOF
    
    log "Velocity state updated: height=$height, velocity=$velocity blocks/sec"
}

# Record last update timestamp
record_last_update() {
    local current_time
    current_time=$(date +%s)
    echo "$current_time" > "$LAST_UPDATE_FILE"
    log "Last update timestamp recorded: $current_time"
}

# Main execution
main() {
    log "=== Velocity-Based Documentation System ==="
    log "Pixel Root: $PIXEL_ROOT"
    
    # Get current Bitcoin height
    local current_height
    current_height=$(get_bitcoin_height)
    
    if [ -z "$current_height" ] || [ "$current_height" = "0" ]; then
        log "Bitcoin not ready, skipping velocity check"
        exit 0
    fi
    
    log "Current Bitcoin height: $current_height"
    
    # Calculate velocity
    local velocity
    velocity=$(calculate_velocity "$current_height")
    
    # Determine update interval
    local interval
    interval=$(get_update_interval "$velocity")
    local category
    category=$(get_velocity_category "$velocity")
    
    log "Calculated velocity: $velocity blocks/sec ($category)"
    log "Update interval: $((interval / 60)) minutes"
    
    # Check if update is needed
    local current_time
    current_time=$(date +%s)
    
    if should_update "$current_time" "$interval"; then
        log "UPDATE TRIGGERED: Time for CONTINUITY.md update"
        
        # Trigger Syntropy cycle
        trigger_syntropy_cycle "Velocity-based update needed (interval: $((interval / 60))min)" "$velocity" "$category" "$interval"
        
        # Record last update
        record_last_update
    else
        if [ -f "$LAST_UPDATE_FILE" ]; then
            local last_update
            last_update=$(cat "$LAST_UPDATE_FILE")
            local time_diff=$((current_time - last_update))
            local remaining=$((interval - time_diff))
            local remaining_min=$((remaining / 60))
            log "Update not needed yet. Next update in $remaining_min minutes"
        fi
    fi
    
    # Update velocity state
    update_velocity_state "$current_height" "$velocity"
    
    log "=== Velocity check complete ==="
}

# Run main function
main "$@"
