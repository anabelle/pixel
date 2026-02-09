# Notifications

*Last cleared: 2026-01-28T19:59 ET after major infrastructure recovery*

---

## Active Items

### [2026-01-28T19:59:00Z] Priority: info ✅
**INFRASTRUCTURE CRISIS RESOLVED**

Human intervention diagnosed and fixed the Bitcoin OOM crash loop that had been blocking the ecosystem for weeks.

**What was fixed:**
- Added 2GB swap to VPS (was running with zero swap)
- Reduced Bitcoin dbcache from 100MB → 50MB
- Bitcoin now syncing at 75% memory (was 96% and OOM-killing)
- 504 restart loop finally broken

**Current status:**
- Bitcoin: SYNCING ✅ (first time in weeks it should complete)
- Lightning: STARTING ⏳ (waiting for Bitcoin RPC)
- Syntropy: HEALTHY ✅ (circuit breaker reset)
- Rate Limit: Resets at 00:00 UTC (~1 hour)

**Lesson learned:** I was reporting symptoms ("Bitcoin not running") without tracing to root causes (OOM at 96% memory, 504 restarts). Added diagnostic checklist to CONTINUITY.md.

---

## Pending Human Action

### Permission Fix Still Needed
REFACTOR_QUEUE.md has EACCES permission error (since Cycle 118).

**Fix command:**
```bash
sudo chown pixel:pixel /home/pixel/pixel/REFACTOR_QUEUE.md
sudo chmod 664 /home/pixel/pixel/REFACTOR_QUEUE.md
```

---

## Archive

<details>
<summary>2026-01-25 to 2026-01-28: Bitcoin/Lightning Infrastructure Crisis (RESOLVED)</summary>

The ecosystem was frozen for weeks due to:
1. Bitcoin OOM crash loop (504 restarts) - root cause never identified until human intervention
2. Lightning couldn't connect because Bitcoin was never stable long enough
3. Treasury stagnant at 81,759 sats
4. Estimated 35,000+ sats opportunity cost

Resolution: Added 2GB swap + reduced dbcache. Bitcoin now syncing properly.

</details>

<details>
<summary>2026-01-24: Permission Errors Blocking Autonomy</summary>

EACCES error on REFACTOR_QUEUE.md prevented all autonomous task creation.
Status: Still needs fix (see Pending Human Action above)

</details>

<details>
<summary>Earlier notifications archived (see git history)</summary>

Hundreds of critical alerts about the same issues were generated from Cycle 118-133.
All related to the Bitcoin OOM loop which has now been fixed.

</details>

## [2026-02-09T17:51:31.084Z] Priority: high
CRITICAL: API database (pixels.db) appears reset (0 pixels). Volume mount may be broken. Also, permission denied on REFACTOR_QUEUE.md. Lightning is crash-looping due to RPC password error. Worker 3c5a9b40 is attempting fixes.

## [2026-02-09T18:02:14.409Z] Priority: critical
DEADLOCK: Worker 3c5a9b40 is stuck on a permission prompt in its container. I have EACCES: permission denied on REFACTOR_QUEUE.md. Lightning is in a crash loop and API database is reset/missing. Swap is 100% full. Manual intervention or 'scheduleSelfRebuild' needed.
