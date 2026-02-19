# Blockchain State Continuity Protocol (T083)
# Recovery and Prevention Guide for Bitcoin/Lightning State Mismatches

## Overview

This document describes the Blockchain State Continuity Protocol implemented to prevent Lightning crash loops when Bitcoin restarts from an earlier block height. This is part of Task T083 from CONTINUITY.md.

## The Problem

When Bitcoin Core restarts (due to maintenance, memory optimization, or crashes), it may start from an earlier block height than Lightning expects. Lightning stores its expected block height in its database and will crash if it detects Bitcoin has "gone backwards" beyond a certain threshold.

**Error Message:**
```
lightningd: bitcoind has gone backwards from <expected> to <current> blocks, waiting...
plugin-cln-grpc: Plugin marked as important, shutting down lightningd!
```

## Root Cause

Lightning's `bcli` plugin maintains an expected block height based on its last known state. When Bitcoin restarts from a checkpoint or reorganization causes a rewind, this mismatch triggers a fatal error.

## The Solution

### 1. Startup Wrapper (`lightning-startup-wrapper.sh`)

This script runs before Lightning starts and:

1. **Checks Bitcoin is ready** - Waits for Bitcoin RPC to respond
2. **Validates blockchain continuity** - Compares current block height with checkpoint
3. **Handles rewinds gracefully** - Logs warnings but allows Lightning to start
4. **Updates checkpoints** - Saves current height for next restart

**Tolerance Level:** 1000 blocks (allows for minor reorganizations but catches major rewinds)

### 2. Periodic Checkpointing (`blockchain-checkpoint.sh`)

Periodically saves the current Bitcoin block height to a checkpoint file. This should be run:

- Every 10-15 minutes via cron or systemd timer
- Before any planned Bitcoin restarts
- After major Bitcoin maintenance operations

### 3. Docker Compose Integration

The Lightning service now uses the wrapper script as its entrypoint:

```yaml
lightning:
  entrypoint: ["/scripts/blockchain-state/lightning-startup-wrapper.sh"]
```

## Recovery Procedures

### Scenario 1: Lightning in Crash Loop (Block Rewind Detected)

**Symptoms:**
- Lightning container restarts repeatedly
- Logs show "bitcoind has gone backwards"
- Container status: unhealthy or restarting

**Immediate Action:**

1. **Check current Bitcoin block height:**
   ```bash
   docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getblockcount
   ```

2. **Check Lightning's expected height:**
   ```bash
   cat /data/lightning/.bitcoin_state_checkpoint
   ```

3. **Wait for Bitcoin to sync:**
   - If Bitcoin is still syncing (check `getblockchaininfo`), let it finish
   - Monitor with: `docker compose logs -f lightning`

4. **If Lightning still crashes, reset its block height expectation:**
   ```bash
   # Option A: Update checkpoint to current Bitcoin height
   docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getblockcount > /data/lightning/.bitcoin_state_checkpoint
   
   # Option B: Remove checkpoint (Lightning will create new one)
   rm /data/lightning/.bitcoin_state_checkpoint
   ```

5. **Restart Lightning:**
   ```bash
   docker compose restart lightning
   ```

### Scenario 2: Major Bitcoin Reorganization (Chain Rewind > 1000 blocks)

**Symptoms:**
- Bitcoin has undergone a significant reorganization
- Lightning shows warnings about large block differences
- Network may be experiencing consensus issues

**Action:**

1. **Verify Bitcoin network status:**
   ```bash
   docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getblockchaininfo
   ```

2. **Check `initialblockdownload` flag:**
   - If `true`: Bitcoin is syncing, Lightning will wait
   - If `false` but block height decreased: Investigate reorganization

3. **Let Lightning handle it naturally:**
   - Lightning will wait for Bitcoin to catch up to its expected height
   - Monitor logs for "Waiting for initial block download"
   - This may take considerable time for large rewinds

### Scenario 3: Planned Bitcoin Restart

**Before restarting Bitcoin:**

1. **Create fresh checkpoint:**
   ```bash
   /pixel/scripts/blockchain-state/blockchain-checkpoint.sh
   ```

2. **Gracefully stop Lightning:**
   ```bash
   docker compose stop lightning
   ```

3. **Restart Bitcoin:**
   ```bash
   docker compose restart bitcoin
   # OR
   docker compose up -d --build bitcoin
   ```

4. **Wait for Bitcoin to sync to checkpoint height:**
   ```bash
   watch -n 10 'docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getblockcount'
   ```

5. **Start Lightning:**
   ```bash
   docker compose up -d lightning
   ```

## Monitoring

### Health Check Logs

Lightning logs events to `/data/lightning/blockchain_events.log`:

```
2026-01-10 11:30:00 CHECKPOINT: height=473204
2026-01-10 11:35:00 BLOCKCHAIN_REWIND: expected=473204 current=2848 diff=470356
```

### Key Metrics

1. **Block height difference** (checkpoint vs current)
2. **Checkpoint age** (when was it last updated?)
3. **Bitcoin sync progress** (`verificationprogress` from `getblockchaininfo`)

### Alert Conditions

- **WARNING:** Height difference > 1000 blocks but < 10000 (logged, Lightning starts)
- **CRITICAL:** Height difference > 10000 blocks (investigate immediately)
- **FATAL:** Lightning crash loop persists after 3 restarts

## Prevention Best Practices

### 1. Regular Checkpointing

Set up automated checkpointing:

```bash
# Add to crontab
*/15 * * * * /pixel/scripts/blockchain-state/blockchain-checkpoint.sh >> /var/log/blockchain-checkpoint.log 2>&1
```

### 2. Graceful Shutdown Sequences

Always stop Lightning before Bitcoin when doing maintenance:

```bash
# Correct order
docker compose stop lightning
docker compose restart bitcoin
# Wait for sync
docker compose start lightning

# Incorrect order (causes issues)
docker compose restart bitcoin
# Lightning may crash before Bitcoin is ready
```

### 3. Backup Lightning Database

Before major Bitcoin operations:

```bash
# Backup Lightning database
cp /data/lightning/testnet/lightningd.sqlite3 /backups/lightningd-$(date +%Y%m%d).sqlite3
```

### 4. Monitor Bitcoin Memory Usage

Bitcoin memory optimization that requires restarts should trigger Lightning checkpointing first. See CONTINUITY.md for memory boundary management (cycles 29.60-29.67).

## Docker Compose Updates

### Lightning Service Configuration

```yaml
lightning:
  image: elementsproject/lightningd:v24.11.2
  container_name: pixel-lightning-1
  depends_on:
    bitcoin:
      condition: service_healthy
  entrypoint: ["/scripts/blockchain-state/lightning-startup-wrapper.sh"]
  # ... rest of configuration
```

### Volumes for State Persistence

```yaml
volumes:
  - ./data/lightning:/root/.lightning:rw          # Lightning data
  - ./scripts/blockchain-state:/scripts/blockchain-state:ro  # Wrapper scripts
```

## Troubleshooting Commands

### Quick Diagnostics

```bash
# Check Lightning status
docker compose ps lightning
docker compose logs lightning --tail 50

# Check Bitcoin sync status
docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getblockchaininfo

# Check checkpoint file
cat /data/lightning/.bitcoin_state_checkpoint

# Check event log
tail -20 /data/lightning/blockchain_events.log

# Verify Lightning database integrity
docker exec pixel-lightning-1 sqlite3 /root/.lightning/testnet/lightningd.sqlite3 "PRAGMA integrity_check;"
```

### Manual Recovery

```bash
# Force reset Lightning block expectation
CURRENT_HEIGHT=$(docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getblockcount)
echo "$CURRENT_HEIGHT" > /data/lightning/.bitcoin_state_checkpoint
docker compose restart lightning

# Full Lightning reset (last resort - will close channels)
docker compose down lightning
mv /data/lightning /data/lightning.backup.$(date +%Y%m%d)
mkdir -p /data/lightning
docker compose up -d lightning
```

## Implementation Status

- [x] Startup wrapper script created
- [x] Checkpoint script created
- [x] Docker Compose updated
- [ ] Cron job for periodic checkpointing (manual setup)
- [ ] Automated monitoring/alerting (future enhancement)

## Related Tasks

- **T083:** Blockchain State Continuity Protocol (this task)
- **T082:** Cascade Cleanup Protocol (polycausal cascade resolution)
- **T080:** Memory Crisis Response Strategy (resolved)
- **CONTINUITY.md:** Cycle 29.67 - Polycausal Cascade Diagnosis

## References

- Core Lightning Documentation: https://docs.corelightning.org/
- Bitcoin RPC Documentation: https://developer.bitcoin.org/devreference/
- Container State Management: AGENTS.md (Worker Architecture)

**Last Updated:** 2026-01-10
**Status:** Active - Protocol implemented, Lightning healthy
