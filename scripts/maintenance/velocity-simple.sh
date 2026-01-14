#!/bin/sh
# Minimal Velocity Monitor - Just checks and logs Bitcoin sync velocity
PIXEL_ROOT="${PIXEL_ROOT:-/pixel}"
VELOCITY_STATE_FILE="$PIXEL_ROOT/data/velocity-state.json"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CURRENT_TIME=$(date +%s)

# Get Bitcoin block height
BITCOIN_CONTAINER="${BITCOIN_CONTAINER:-pixel-bitcoin-1}"
BITCOIN_RPC_USER="${BITCOIN_RPC_USER:-bitcoin}"
BITCOIN_RPC_PASSWORD="${BITCOIN_RPC_PASSWORD:-password123}"

OUTPUT=$(docker exec "$BITCOIN_CONTAINER" bitcoin-cli -testnet \
    -rpcuser="$BITCOIN_RPC_USER" \
    -rpcpassword="$BITCOIN_RPC_PASSWORD" \
    getblockcount 2>&1 || echo "ERROR")

# Check for errors
if echo "$OUTPUT" | grep -q "error code:"; then
    echo "$TIMESTAMP ERROR: Bitcoin not ready" >> /pixel/data/velocity.log
    exit 0
fi

CURRENT_HEIGHT="$OUTPUT"

# Validate height is numeric
if ! echo "$CURRENT_HEIGHT" | grep -qE '^[0-9]+$'; then
    echo "$TIMESTAMP ERROR: Could not parse height: $CURRENT_HEIGHT" >> /pixel/data/velocity.log
    exit 0
fi

# Calculate velocity
VELOCITY="0.00"
if [ -f "$VELOCITY_STATE_FILE" ]; then
    PREV_HEIGHT=$(cat "$VELOCITY_STATE_FILE" 2>/dev/null | node -e "try { console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).height || 0); } catch(e) { console.log(0); }" 2>/dev/null || echo "0")
    PREV_TIME=$(cat "$VELOCITY_STATE_FILE" 2>/dev/null | node -e "try { console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).timestamp || 0); } catch(e) { console.log(0); }" 2>/dev/null || echo "0")
    
    if [ "$PREV_TIME" -gt 0 ] 2>/dev/null && [ "$CURRENT_HEIGHT" -gt "$PREV_HEIGHT" ] 2>/dev/null; then
        TIME_DIFF=$((CURRENT_TIME - PREV_TIME))
        HEIGHT_DIFF=$((CURRENT_HEIGHT - PREV_HEIGHT))
        if [ "$TIME_DIFF" -gt 0 ]; then
            VELOCITY=$(node -e "console.log(($HEIGHT_DIFF / $TIME_DIFF).toFixed(2))")
        fi
    fi
fi

# Log velocity
echo "$TIMESTAMP $VELOCITY blocks/sec (height: $CURRENT_HEIGHT)" >> /pixel/data/velocity.log

# Update state file
echo "{\"height\": $CURRENT_HEIGHT, \"timestamp\": $CURRENT_TIME, \"velocity\": $VELOCITY}" > "$VELOCITY_STATE_FILE"

# Alert if velocity exceeds threshold
if node -e "console.log(parseFloat('$VELOCITY') > 30)" 2>/dev/null | grep -q "true"; then
    echo "ALERT: Velocity threshold exceeded ($VELOCITY blocks/sec)" >> /pixel/data/velocity-alerts.log
fi
