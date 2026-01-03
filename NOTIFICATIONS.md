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
