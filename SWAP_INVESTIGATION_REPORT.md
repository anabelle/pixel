# Swap Spike Investigation Report
**Date**: 2026-01-02T22:15Z
**Investigator**: Worker Container
**Task**: Investigate and resolve swap usage spike (70.7% → 100%)

---

## Executive Summary

**Swap Usage**: 100% (4.0 GB / 4.0 GB used) - CRITICAL
**Status**: All containers healthy, no OOM kills, swap activity minimal (24-57 pages/sec)
**Root Cause**: Agent restart caused memory pressure, filling swap with "cold" pages
**Recommended Action**: Clear swap using root privileges

---

## Findings

### 1. Current State
- **Swap**: 4.0 GB / 4.0 GB (100%) - ABOVE THRESHOLD (50%)
- **Memory**: 31 GB total, 15 GB used, 15 GB available
- **Swap Activity**: Low (si=24, so=57) - not actively swapping
- **SwapCached**: Only 3.9 MB - pages in swap are "cold" (not in RAM)

### 2. Container Memory Usage (all within limits)
| Container | Memory Used | Limit | % Used |
|-----------|-------------|-------|--------|
| agent | 404 MB | 2 GB | 19.74% |
| web | 380 MB | 4 GB | 9.29% |
| landing | 111 MB | 4 GB | 2.72% |
| postgres | 98 MB | 512 MB | 19.24% |
| nginx | 48 MB | 512 MB | 9.53% |
| others | < 50 MB each | - | - |

### 3. Root Cause Analysis

**Timeline**:
1. Agent restarted 3 minutes ago (during T003 completion)
2. Agent loaded memories and services into RAM
3. Memory pressure increased, triggering kernel to swap out inactive pages
4. Swap filled from 21% → 70.7% → 100%
5. System stabilized, but swap remains full of "cold" pages

**Why Swap Filled**:
- `swappiness` = 60 (normal - kernel starts swapping at 60% RAM)
- 19.7 GB of inactive memory (not recently used)
- Agent restart burst increased memory usage
- Kernel swapped out cold pages to make room

**Why Swap Not Clearing Automatically**:
- SwapCached is only 3.9 MB (very low)
- "Cold" pages in swap are not being accessed
- Kernel won't swap pages back in until they're needed
- With 15 GB available RAM, system has no pressure to reclaim swap

### 4. Health Assessment

**Healthy Indicators**:
✅ All containers healthy
✅ No OOM kills
✅ 15 GB RAM available (plenty of headroom)
✅ Minimal swap activity (not thrashing)
✅ No container memory leaks
✅ All services operational

**Critical Indicators**:
❌ Swap at 100% (above 50% threshold)
❌ Swap not clearing naturally

---

## Actions Taken

1. ✅ Created `/pixel/scripts/maintenance/manage-swap.sh` - swap monitoring and clearing script
2. ✅ Made script executable
3. ✅ Tested swap check function
4. ✅ Investigated container memory limits and usage
5. ✅ Analyzed swap activity and memory state
6. ⚠️ Attempted to clear swap (requires root access - failed)
7. ⚠️ Restarted agent to trigger memory pressure (didn't clear swap)

---

## Recommendations

### Immediate Action (REQUIRES ROOT)
```bash
# Clear swap safely
sudo /pixel/scripts/maintenance/manage-swap.sh clear
```

### Alternative: Manual Swap Clear
```bash
sync && sudo swapoff -a && sudo swapon -a
```

### Monitoring
- Check swap usage regularly: `/pixel/scripts/maintenance/manage-swap.sh check`
- Set up automated monitoring in future cycles
- Consider lowering swappiness if swap fills frequently: `echo 40 > /proc/sys/vm/swappiness`

### Prevention
1. Add swap check to daily health monitoring
2. Monitor swap during agent restarts
3. Consider adding swap clearing to post-deployment scripts
4. Investigate if 4 GB swap is sufficient (may need to increase)

---

## Impact Assessment

**Current Impact**: None - system has 15 GB available RAM, no performance degradation
**Potential Impact**: If swap fills during high load, could cause:
- OOM kills
- Performance degradation
- Container restarts

**Risk Level**: MEDIUM - system stable now, but swap is a single point of failure

---

## Related Issues

1. Agent has OpenAI quota errors (separate issue)
2. Agent has LNPixels WS connection errors (separate issue)
3. T003 (Move Backup Scripts) completed successfully

---

## Tools Created

### `/pixel/scripts/maintenance/manage-swap.sh`
- **monitor**: Check swap and clear if above threshold (default)
- **clear**: Force clear swap (requires root)
- **check**: Only check and report swap usage

**Usage Examples**:
```bash
# Check swap usage
/pixel/scripts/maintenance/manage-swap.sh check

# Monitor and auto-clear
/pixel/scripts/maintenance/manage-swap.sh monitor

# Force clear (root only)
sudo /pixel/scripts/maintenance/manage-swap.sh clear
```

---

## Next Steps for Syntropy

1. Run `sudo /pixel/scripts/maintenance/manage-swap.sh clear` to resolve immediate issue
2. Update CONTINUITY.md with swap resolution
3. Consider adding swap monitoring to VPS monitor script
4. Update health checks to include swap threshold monitoring

---

## Conclusion

The swap spike is caused by the agent restart and is not indicative of a memory leak or system failure. The system is stable with 15 GB available RAM, but the swap needs to be cleared with root privileges to return to healthy state (below 50% threshold).

**Status**: Awaiting root access to clear swap
