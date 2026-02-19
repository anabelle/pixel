#!/usr/bin/env bash
# Blockchain State Checkpoint Script - Periodic Block Height Backup
# Saves current Bitcoin block height for Lightning state continuity
# Run periodically to maintain accurate state checkpoints
# This script runs on HOST and writes into Lightning container

set -e

LOG_PREFIX="[BLOCKCHAIN-CHECKPOINT]"

echo "$LOG_PREFIX Creating blockchain checkpoint..."

# Get current Bitcoin block height
BITCOIN_HEIGHT=$(docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getblockcount 2>/dev/null || echo "0")

if [ "$BITCOIN_HEIGHT" = "0" ]; then
    echo "$LOG_PREFIX ERROR: Could not get Bitcoin block height"
    exit 1
fi

# Write checkpoint into Lightning container
docker exec pixel-lightning-1 sh -c "echo '$BITCOIN_HEIGHT' > /root/.lightning/.bitcoin_state_checkpoint"

echo "$LOG_PREFIX Checkpoint saved: block $BITCOIN_HEIGHT"

# Log event in container
docker exec pixel-lightning-1 sh -c "echo \"\$(date '+%Y-%m-%d %H:%M:%S') CHECKPOINT: height=$BITCOIN_HEIGHT\" >> /root/.lightning/blockchain_events.log"

echo "$LOG_PREFIX Checkpoint complete"
