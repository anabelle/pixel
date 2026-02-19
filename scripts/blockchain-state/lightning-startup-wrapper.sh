#!/usr/bin/env bash
# Blockchain State Continuity Protocol - Lightning Startup Wrapper
# Implements T083: Validates Bitcoin blockchain continuity before starting Lightning
# Prevents crash loops when Bitcoin restarts from an earlier block height

set -e

LOG_PREFIX="[LIGHTNING-STATE-WRAPPER]"

echo "$LOG_PREFIX Blockchain State Continuity Protocol v1.0"
echo "$LOG_PREFIX Initializing Lightning startup with blockchain validation..."

# Configuration from environment
BITCOIN_RPC_HOST="${BITCOIN_RPC_HOST:-bitcoin}"
BITCOIN_RPC_PORT="${BITCOIN_RPC_PORT:-18332}"
BITCOIN_RPC_USER="${BITCOIN_RPC_USER:-bitcoin}"
BITCOIN_RPC_PASSWORD="${BITCOIN_RPC_PASSWORD:-password123}"
LIGHTNINGD_DATA="${LIGHTNINGD_DATA:-/root/.lightning}"
LIGHTNINGD_NETWORK="${LIGHTNINGD_NETWORK:-testnet}"
STATE_FILE="${LIGHTNINGD_DATA}/.bitcoin_state_checkpoint"

# Function to get current Bitcoin block height via RPC using Python
get_bitcoin_height() {
    python3 -c "
import urllib.request
import json
import base64

credentials = base64.b64encode(b'$BITCOIN_RPC_USER:$BITCOIN_RPC_PASSWORD').decode()
url = 'http://$BITCOIN_RPC_HOST:$BITCOIN_RPC_PORT/'
data = json.dumps({'jsonrpc': '1.0', 'id': 'python', 'method': 'getblockcount', 'params': []}).encode()

req = urllib.request.Request(url, data)
req.add_header('Authorization', f'Basic {credentials}')
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req, timeout=5) as response:
        result = json.loads(response.read())
        print(result.get('result', 0))
except Exception as e:
    print('0')
" 2>/dev/null || echo "0"
}

# Function to get Lightning's expected block height from checkpoint
get_expected_height() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Function to update checkpoint with current block height
update_checkpoint() {
    local height="$1"
    echo "$height" > "$STATE_FILE"
    echo "$LOG_PREFIX Checkpoint updated: block $height"
}

# Function to validate blockchain continuity
validate_blockchain_continuity() {
    local bitcoin_height
    local expected_height
    local height_diff
    local tolerance

    echo "$LOG_PREFIX Checking blockchain continuity..."

    bitcoin_height=$(get_bitcoin_height)
    expected_height=$(get_expected_height)

    # First run or missing checkpoint
    if [ "$expected_height" = "0" ] || [ -z "$expected_height" ]; then
        echo "$LOG_PREFIX First run - no checkpoint found"
        echo "$LOG_PREFIX Current Bitcoin height: $bitcoin_height"
        update_checkpoint "$bitcoin_height"
        return 0
    fi

    height_diff=$((expected_height - bitcoin_height))
    tolerance=1000 # Allow 1000 block difference before warning

    if [ "$height_diff" -gt "$tolerance" ]; then
        echo "$LOG_PREFIX WARNING: Blockchain rewind detected!"
        echo "$LOG_PREFIX Expected block: $expected_height"
        echo "$LOG_PREFIX Current block: $bitcoin_height"
        echo "$LOG_PREFIX Difference: $height_diff blocks"
        echo "$LOG_PREFIX This indicates Bitcoin was restarted from an earlier state"

        # Log this event for diagnostics
        echo "$(date '+%Y-%m-%d %H:%M:%S') BLOCKCHAIN_REWIND: expected=$expected_height current=$bitcoin_height diff=$height_diff" >> "${LIGHTNINGD_DATA}/blockchain_events.log"

        # Decision: Allow Lightning to start but log warning
        # Lightning will wait for Bitcoin to catch up if needed
        echo "$LOG_PREFIX Allowing Lightning to start - it will wait for Bitcoin sync if needed"
        return 0
    elif [ "$bitcoin_height" -gt "$expected_height" ]; then
        echo "$LOG_PREFIX Bitcoin has advanced since last run"
        echo "$LOG_PREFIX Previous height: $expected_height"
        echo "$LOG_PREFIX Current height: $bitcoin_height"
        update_checkpoint "$bitcoin_height"
        return 0
    else
        echo "$LOG_PREFIX Blockchain continuity validated"
        echo "$LOG_PREFIX Height: $bitcoin_height (within tolerance of checkpoint $expected_height)"
        return 0
    fi
}

# Main execution
echo "$LOG_PREFIX ==================================="
echo "$LOG_PREFIX Bitcoin connection check..."

# Wait for Bitcoin to be ready
MAX_RETRIES=180
RETRY_COUNT=0
BITCOIN_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    BITCOIN_HEIGHT=$(get_bitcoin_height)
    if [ "$BITCOIN_HEIGHT" -gt 0 ]; then
        BITCOIN_READY=true
        echo "$LOG_PREFIX Bitcoin ready at block $BITCOIN_HEIGHT"
        break
    fi
    echo "$LOG_PREFIX Waiting for Bitcoin... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ "$BITCOIN_READY" = false ]; then
    echo "$LOG_PREFIX ERROR: Bitcoin not ready after $MAX_RETRIES attempts"
    echo "$LOG_PREFIX Starting Lightning anyway - it will wait for Bitcoin"
fi

# Validate blockchain continuity
validate_blockchain_continuity

# Execute Lightning's original entrypoint
echo "$LOG_PREFIX ==================================="
echo "$LOG_PREFIX Starting Core Lightning..."

# Export environment for Lightning
export EXPOSE_TCP="${EXPOSE_TCP:-false}"

# Run original entrypoint script
exec /entrypoint.sh "$@"
