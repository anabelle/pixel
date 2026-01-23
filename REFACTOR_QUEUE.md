# 🔄 Syntropy Refactor Queue
## *Autonomous Self-Improvement Tasks*

**Purpose**: Atomic tasks for Syntropy to process during runtime cycles.  
**Protocol**: Pick the next `⬜ READY` task, execute via `spawnWorker`, mark complete.  
**Safety**: All tasks are designed to be rollback-safe and testable.

---

## 📊 Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| ⬜ READY | 8 | Available for processing |
| 🟡 IN_PROGRESS | 0 | Currently being worked on |
| ✅ DONE | 25 | Completed successfully |
| ❌ FAILED | 7 | Failed, needs human review |
| ⏸️ BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-01-23T02:30:00Z (T101: Create Cycle Summary Tool)
**Last Verified**: 2026-01-10 (Human-readable documentation generated, pipeline complete)

---

## ✅ Completed Phases Summary

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| 0 | Quick Wins (Cleanup & Scripts) | T001-T012 | ✅ 12/12 |
| 1 | Nostr Plugin Refactoring | T013-T023 | ✅ 10/10 |
| 2 | API Route Splitting | T024-T026 | ✅ 3/3 |
| 3 | Syntropy Tools Extraction | T027-T037 | ✅ 12/12 |
| 4 | Documentation & Knowledge | T038-T040 | ✅ 3/3 |
| 5 | Operations & Maintenance | T041-T077 | ✅ 36/36 |

**Total Completed**: 53 tasks (T069 moved to archive, T073 pipeline created, T074 extraction done, T075 patterns analyzed, T076 insights generated, T077 documentation complete, T100 metrics endpoint created, T101 cycle summary tool created)

> 📦 Full task history with instructions available in [REFACTOR_ARCHIVE.md](./REFACTOR_ARCHIVE.md)

---

## 🔧 Processing Rules for Syntropy

1. **One task per cycle**: Only attempt ONE task from this queue per Syntropy cycle
2. **Spawn Worker**: Use `spawnWorker` with the task's `INSTRUCTIONS` block
3. **Verify before marking done**: Run the `VERIFY` command if provided
4. **Update status**: After completion, update task status and move to archive
5. **Don't skip ahead**: Tasks may have dependencies, process in order

---

## 📝 Template for New Tasks

```markdown
### TXXX: [Title] ⬜ READY
**Effort**: X min | **Risk**: None/Low/Medium/High | **Parallel-Safe**: ✅/❌
**Depends**: TXXX (optional)

\`\`\`
INSTRUCTIONS:
[Step-by-step instructions for the worker]

VERIFY:
[Command to verify success]
\`\`\`

---
```

## 📋 Phase 5: Operations & Maintenance

### T041: Implement Disk Cleanup Protocol ❌ FAILED
**Effort**: 30 min | **Risk**: Medium | **Parallel-Safe**: ❌

```
INSTRUCTIONS:
Execute disk cleanup to address 76.9% usage:
1. Run docker system prune -af (remove unused containers, networks, images, build cache)
2. Clean up old log files in /pixel/data/logs older than 7 days
3. Remove old backups in /pixel/backups older than 14 days
4. Clean NOSTR message cache if > 100MB
5. Check /tmp and /var/log for temp files
6. Verify critical data is backed up before cleanup
7. Document freed space and new usage percentage

VERIFY:
df -h | grep /dev/vda1 && docker system df

FAILURE ANALYSIS (2026-01-05T16:40:59Z):
- Exit code: 124 (timeout)
- Issue: docker system prune -af exceeded 120s timeout
- Partial success: Docker cleanup ran and freed ~17GB before timeout
- Impact: Cleanup was partially effective but process didn't complete cleanly
- Resolution required: Retry with longer timeout or split into smaller cleanup steps
```

### T043: Fix Worker Silent Failure Logging ❌ FAILED
**Effort**: 45 min | **Risk**: Medium | **Parallel-Safe**: ❌

```
INSTRUCTIONS:
The worker containers are failing silently with exit code 1 and no log output. This prevents debugging and makes the "healing detection" feature impossible to build because we can't see what workers are doing.

Current state:
- Workers spawn with task instruction
- Container exits with code 1
- No logs in /pixel/data/worker-output-{taskId}.txt
- Syntropy can't see what went wrong

What to fix:
1. In worker spawning logic (/pixel/syntropy-core/src/worker/manager.ts), ensure worker container ALWAYS captures stdout/stderr
2. Add log streaming to persistent file BEFORE container starts execution
3. Include environment context (task, context, timestamp) in first lines of log
4. Ensure log file exists even if container fails immediately
5. Add try-catch around worker initialization to capture early failures

Test:
- Spawn a worker that echoes debug info
- Verify logs exist at /pixel/data/worker-output-{taskId}.txt
- Check that exit code is preserved but logs remain

This is blocking multiple visibility enhancements and needs to be fixed before we can observe healing processes.

VERIFY:
docker logs pixel-worker-test 2>&1 | head -20 && test -f /pixel/data/worker-output-*.txt

FAILURE ANALYSIS (2026-01-06T16:45Z):
- Task marked DONE during infrastructure crisis
- Root cause: Worker infrastructure broken (exit code 1, no logs)
- Log permissions: /pixel/logs/opencode_live.log owned by root (0644)

## 📋 Phase 6: Action-Oriented Tasks (2026-01-22)

### T102: Archive Failed Queue Tasks 🟡 IN_PROGRESS
**Effort**: 15 min | **Risk**: None | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Clean up the REFACTOR_QUEUE by archiving all FAILED tasks.
1. Move T041 T043 T045 T065 T078 to REFACTOR_ARCHIVE.md
2. Add failure summary and date for each
3. Remove the FAILED tasks from REFACTOR_QUEUE.md
4. Update CONTINUITY.md to reflect clean queue

VERIFY:
grep -c FAILED /pixel/REFACTOR_QUEUE.md
```

---

### T103: Implement Progress-Based Self-Examination ⬜ READY
**Effort**: 45 min | **Risk**: Medium | **Parallel-Safe**: ❌

```
INSTRUCTIONS:
Modify self-examination to measure PROGRESS not just EXISTENCE.
1. Modify syntropy-core/src/self-examination.ts
2. Add progress tracking fields tasksCompletedThisCycle and tasksAttempted
3. Change health calculation to require actual progress
4. HEALTHY means made progress, IDLE means no work attempted, BLOCKED means work failed

VERIFY:
grep -c tasksCompleted /pixel/syntropy-core/src/self-examination.ts
```

---

### T104: Add LNPixels Revenue Dashboard Widget ⬜ READY
**Effort**: 45 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Display real-time LNPixels activity on pixel.xx.kg.
1. Query lnpixels database or API for today activity
2. Create dashboard component showing pixels placed and revenue in sats
3. Add to landing page at pixel-landing/src/app/[locale]/dashboard/page.tsx
4. Create API route at pixel-landing/src/app/api/lnpixels-stats/route.ts

VERIFY:
curl https://pixel.xx.kg/api/lnpixels-stats
```

---

