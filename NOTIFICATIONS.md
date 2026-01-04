# Notifications

*No pending notifications.*

---

## Archive

<details>
<summary>2026-01-02: Worker ghost notification (resolved)</summary>

Worker ef2b4b1b was marked pending but not in ledger. Resolution: spawn fresh worker when ready to tackle diary/Twitter tasks.

</details>

<details>
<summary>2026-01-01: nginx unhealthy (resolved)</summary>

Fixed by infrastructure updates. All containers now healthy.

</details>

## [2026-01-03T00:05:42.267Z] Priority: critical
SWAP CRISIS ALERT - 81.8% usage detected! T010 worker just completed, clearing slot for urgent swap management. Will execute immediate swap clearing (swapoff/swapon) and create automated monitoring to prevent recurrence.

## [2026-01-03T00:06:52.689Z] Priority: critical
SWAP CRISIS - URGENT HUMAN INTERVENTION REQUIRED

**Current State:**
- Swap usage: 81.8% (3.5 GB / 4.3 GB)
- Trend: Escalating rapidly (was 41.7% ~20 min ago)
- Time to crisis threshold (96%): ~20-30 minutes

**Root Cause:**
Worker containers lack sudo privileges to execute: `sync && sudo swapoff -a && sudo swapon -a`

**Immediate Action Required (manual):**
1. SSH into VPS: `ssh root@<vps-ip>`
2. Execute: `sync && sudo swapoff -a && sudo swapon -a`
3. Verify: `swapon --show` (should show 0% or minimal swap)

**OR approve worker with elevated privileges:**
- Grant worker temporary sudo access for swap operations
- Or execute manually via SSH

**Consequences if not addressed:**
- System will reach 96% swap threshold within 30 minutes
- Agent performance degradation likely
- Potential service disruption

**Prevention Ready:**
- I've created monitoring script: `/pixel/scripts/maintenance/monitor-swap.sh`
- Systemd service file drafted but requires root to install
- Can be deployed after swap is cleared

## [2026-01-03T03:56:08.749Z] Priority: critical
SWAP CRISIS ESCALATING: Swap usage increased from 91.1% to 91.6% in 10 minutes. Only 361.7 MB free swap remains. Memory pressure is worsening despite disk cleanup success (7.757GB reclaimed). 

CRITICAL ACTION NEEDED - HOST LEVEL:
Execute: sync && swapoff -a && swapon -a

OR: Reboot VPS immediately

Worker a3d6f2b1 completed disk cleanup successfully but cannot fix host swap (container limitation discovered). System is rapidly approaching swap exhaustion. Performance severely degraded.

## [2026-01-04T06:39:57.869Z] Priority: high
CRITICAL: Swap usage at 88.1% (threshold 50%) - blocking wallet initialization. Bitcoin Core using 1.46GiB/2GiB (73%). 

RECOMMENDED ACTION: Increase VPS RAM allocation to resolve swap pressure and enable wallet initialization (25k sats ready).

Current Status:
- Lightning node: OPERATIONAL ✅
- Treasury: 79,014 sats ✅
- Wallet allocation: 25,000 sats (prepared, blocked) ⏳
- Swap: 88.1% 🔴
- Refactoring: T018-T020 COMPLETE ✅

IMPACT: Cannot proceed with wallet initialization until swap resolved.

## [2026-01-04T08:56:04.673Z] Priority: critical
CRITICAL: Swap usage reached 100% (4.3GB/4.3GB). VPS Status: WARNING. All containers running but system at resource limit. This is blocking wallet initialization and revenue operations. The cascade principle reveals this as Phase 5: Resource Stability requiring infrastructure scaling. RECOMMENDATION: Increase VPS RAM immediately to eliminate swap pressure and enable Phase 6 (Revenue Operations) to begin. Current state: 14/14 containers healthy, Lightning operational 3+ hours, treasury 79,014 sats ready, worker system validated (3/3 successes). All prerequisites for revenue operations complete EXCEPT resource stability. Decision required: Approve RAM increase?

## [2026-01-04T10:58:24.052Z] Priority: critical
INFRASTRUCTURE EMERGENCY - Memory Crisis Escalating

SWAP STATUS: 100% MAXED (no buffer remaining)
BITCOIN CORE: 89.54% memory (1.791GiB/2GiB) - UP from 52.40% 2 hours ago
SYSTEM: WARNING state with 14/14 containers healthy but resource-saturated

CRITICAL: Bitcoin memory usage accelerating. At this rate, OOM risk within 1-2 cycles unless resolved.

ROOT CAUSE: Bitcoin Core operational memory during Lightning uptime (Phase 5: Resource Stability)

IMPACT BLOCKING:
- Wallet initialization (T042) - BLOCKED
- Channel opening - BLOCKED
- Revenue operations (Phase 6) - BLOCKED
- System stability - DEGRADED (no swap buffer)

RECOMMENDATION: IMMEDIATE RAM increase for VPS to eliminate swap pressure. This is a production infrastructure decision requiring human judgment.

All other systems operational. Worker system validated (3/3). Lightning healthy. Treasury ready. This is purely a capacity constraint requiring infrastructure scaling.

Ready to proceed with Phase 6 (Revenue Operations) immediately upon resource resolution.

## [2026-01-04T11:15:34.316Z] Priority: critical
ESCALATION #3: Infrastructure emergency WORSENING. Bitcoin memory now at 95.55% (up from 89.54% in 15 minutes). Swap at 99.7%. OOM risk within 1 cycle. REQUIRES IMMEDIATE INFRASTRUCTURE SCALING DECISION (RAM increase). All systems operational except capacity. Phase 5 (Resource Stability) is production emergency. Phase 6 (Revenue Operations) ready but blocked. Decision needed: Increase VPS RAM immediately to eliminate swap and provide buffer for Bitcoin Core growth.
