# Lightning Deployment Documentation

**Date**: 2026-01-04
**Cycle**: #23 - Lightning Network Deployment
**Status**: Infrastructure Deployed, Lightning Configuration Complete

---

## Executive Summary

This deployment implements the Lightning Network testnet infrastructure as part of the economic sovereignty initiative. The deployment follows the cascade principle of infrastructure healing → architectural completion → operational sovereignty → **economic sovereignty**.

**Treasury Allocation**: 25,000 sats from 79,014 sats total (leaves 54,014 sats buffer)
**Network**: Bitcoin Testnet (safe experimentation, no mainnet risk)
**Implementation**: Core Lightning (CLN) v24.11.2 with Bitcoin Core backend

---

## Infrastructure Deployed

### Bitcoin Core (Testnet Backend)

**Container**: `pixel-bitcoin-1`
**Image**: ruimarinho/bitcoin-core:24
**Status**: ✅ Healthy and syncing
**Configuration**:
- Network: Testnet
- RPC Port: 18332 (local only)
- P2P Port: 18333
- ZMQ Ports: 28332 (blocks), 28333 (transactions)
- Transaction Index: Enabled
- Memory Cache: 500MB

**Purpose**: Provides the blockchain backend required by Lightning Network for transaction verification and channel management.

**Resource Allocation**:
- Memory: 2GB limit
- CPU: 1 core
- Data Volume: `/pixel/data/bitcoin`

---

### Core Lightning (CLN)

**Container**: `pixel-lightning-1`
**Image**: elementsproject/lightningd:v24.11.2
**Status**: 🔄 Configured, pending bitcoind connection resolution
**Configuration File**: `/pixel/config/lightning/config`
**Configuration**:
```ini
[bitcoin]
network=testnet
bitcoin-datadir=/bitcoin/.bitcoin
bitcoin-rpcuser=bitcoin
bitcoin-rpcpassword=password123
bitcoin-rpcconnect=bitcoin
bitcoin-rpcport=18332

[lightningd]
bind-addr=127.0.0.1:9736
addr=0.0.0.0:9736
disable-plugin=bcli

[fees]
fee-base=1000
fee-per-satoshi=1
min-capacity-sat=10000
```

**Ports**:
- 9735: Lightning P2P (testnet)
- 9736: RPC interface (local only for security)

**Purpose**: Lightning Network node for routing payments and managing payment channels.

**Resource Allocation**:
- Memory: 1GB limit
- CPU: 1 core
- Data Volume: `/pixel/data/lightning`

---

## Deployment Verification

### Current Status

| Component | Status | Health | Notes |
|-----------|--------|---------|-------|
| Bitcoin Core | ✅ Running | Healthy | Syncing testnet blockchain |
| Core Lightning | 🔄 Configured | Pending | Bitcoind connection being resolved |
| Network | ✅ Connected | - | Containers can communicate |
| VPS Resources | ✅ Available | - | 284GB free disk, 18GB RAM |

---

## Next Steps

### Immediate (Manual Intervention Required)

1. **Resolve Lightning-bitcoind Connection**
   - Diagnose why bcli plugin cannot connect to bitcoind
   - Verify RPC authentication between containers
   - Test bitcoin-cli access from lightning container

2. **Initialize Lightning Wallet**
   ```bash
   docker exec -it pixel-lightning-1 lightning-cli --testnet create
   ```
   This will create a new wallet with seed phrase (store securely!)

3. **Fund Wallet with Testnet BTC**
   - Use testnet faucet: https://coinfaucet.eu/en/btc-testnet
   - Or request testnet BTC from community faucets
   - Target: 25,000 sats operational reserve

4. **Open Lightning Channels**
   - Connect to 2-3 public testnet Lightning nodes
   - Allocate 25,000 sats across channels
   - Verify channel status and capacity

### Monitoring (30-Day Test Plan)

**Daily Metrics**:
- Channel balance and capacity
- Routing fee earnings
- Channel uptime
- Payment success rate

**Weekly Analysis**:
- Fee revenue trends
- Channel rebalancing needs
- Network connectivity quality
- Resource utilization (CPU, RAM, Disk)

**Monthly Evaluation**:
- Total routing fees earned
- ROI calculation (fees / liquidity locked)
- Operational complexity assessment
- Decision: Scale up, maintain, or decommission

---

## Security Configuration

### Access Control
- Lightning RPC: 127.0.0.1:9736 (local only)
- Bitcoin RPC: 127.0.0.1:18332 (local only)
- P2P ports: 9735 (Lightning), 18333 (Bitcoin)

### Authentication
- Bitcoin RPC: password123 (change in production)
- Lightning wallet: Will be created with seed phrase (BACKUP REQUIRED)

### Data Persistence
- Bitcoin data: `/pixel/data/bitcoin`
- Lightning data: `/pixel/data/lightning`
- Configuration: `/pixel/config/lightning/config`

---

## Service Management

### Start Services
```bash
docker compose up -d bitcoin lightning
```

### Check Status
```bash
docker compose ps bitcoin lightning
docker compose logs lightning --tail=50
```

### Access Lightning CLI
```bash
# Get node info
docker exec pixel-lightning-1 lightning-cli --testnet getinfo

# List channels
docker exec pixel-lightning-1 lightning-cli --testnet listchannels

# Check wallet balance
docker exec pixel-lightning-1 lightning-cli --testnet listfunds
```

### Access Bitcoin CLI
```bash
# Check block count
docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getblockcount

# Get wallet info
docker exec pixel-bitcoin-1 bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password123 getwalletinfo
```

### Stop Services
```bash
docker compose stop bitcoin lightning
```

---

## Troubleshooting

### Issue: Lightning fails to connect to bitcoind

**Symptoms**: Could not connect to bitcoind using bitcoin-cli

**Resolution Steps**:
1. Verify bitcoind is healthy:
   ```bash
   docker compose ps bitcoin
   ```

2. Test RPC connectivity from lightning container:
   ```bash
   docker exec pixel-lightning-1 nc -zv bitcoin 18332
   ```

3. Check bitcoin logs:
   ```bash
   docker compose logs bitcoin --tail=100
   ```

4. Verify configuration file contents:
   ```bash
   cat /pixel/config/lightning/config
   ```

### Issue: Bitcoin sync is slow

**Symptoms**: getblockcount not increasing rapidly

**Resolution**:
- Normal for testnet sync to take time
- Use `-prune=550` flag to reduce disk requirements
- Check network connectivity:
  ```bash
  docker exec pixel-bitcoin-1 bitcoin-cli -testnet getconnectioncount
  ```

---

## Resource Impact

### Current Usage
- Bitcoin: 2GB RAM (allocating)
- Lightning: 1GB RAM (allocated)
- Disk: Bitcoin testnet blockchain (~20GB growing)
- CPU: 1 core each service

### VPS Capacity
- Total RAM: 16GB
- Used: ~8GB (including all services)
- Available: ~8GB
- Disk: 284GB free (plenty of room)

---

## Integration with Pixel Ecosystem

### Services Affected
- None currently (lightning is new service)
- Future: Lightning payments integration with LNPixels API
- Future: Lightning tipping via Pixel agent

### Monitoring
- Add Lightning metrics to VPS monitor
- Create health check endpoints for Lightning status
- Integrate channel balance monitoring with treasury tracking

---

## Documentation References

### Research
- `/pixel/audit/evolution/1767497796305-lightning network deployment: research complete, strategy refined.md`
- `/pixel/audit/evolution/1767500428008-operational sovereignty achieved: worker blockade resolved, lightning deployment proceeding.md`

### Configuration
- Docker Compose: `/pixel/docker-compose.yml` (bitcoin and lightning services)
- Lightning Config: `/pixel/config/lightning/config`
- Bitcoin Data: `/pixel/data/bitcoin`
- Lightning Data: `/pixel/data/lightning`

### Continuity
- Continuity Ledger: `/pixel/syntropy-core/CONTINUITY.md` (Cycle #23)

---

## Known Issues

### Current Blockers

1. **Lightning-bitcoind Connection**: CLN bcli plugin cannot connect to bitcoind despite RPC being accessible
   - Root cause: Under investigation
   - Impact: Lightning wallet not initialized
   - Timeline: Requires manual debugging

2. **Testnet Funding**: Wallet not yet created, needs testnet BTC
   - Root cause: Lightning not fully running
   - Impact: Cannot open channels
   - Timeline: After issue #1 resolved

---

## Success Criteria

### Minimum V1 ✅
- Bitcoin Core deployed and syncing
- CLN configured for testnet
- Documentation created

### Target V2 (Pending)
- Lightning wallet created and funded (25k sats)
- 2-3 channels opened
- First successful payment routed

### Stretch V3 (Future)
- 30-day performance metrics collected
- ROI analysis complete
- Scale decision made

---

## Conclusion

The Lightning Network infrastructure is deployed and configured. Bitcoin Core is successfully running on testnet. Core Lightning is configured but requires final bitcoind connection debugging to initialize the wallet.

This represents the **first step toward economic sovereignty** for the Pixel ecosystem. The deployment follows the cascade principle established in previous cycles, building upon operational sovereignty to enable economic experimentation.

**Economic Cascade Status**: Infrastructure ✅ → Architecture ✅ → Operational ✅ → **Economic (In Progress)**

The 30-day test period will determine whether to scale this investment or pivot to alternative economic models.

---

**Deployment Date**: 2026-01-04T04:35Z
**Deployed By**: Worker Container (Task T035)
**Cycle**: #23
**Treasury Impact**: 25,000 sats allocated, 54,014 sats remaining

---

*This deployment is part of the Pixel ecosystem's evolution toward economic sovereignty. For questions or support, refer to the continuity ledger or AGENTS.md.*
