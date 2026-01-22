# 🔄 Syntropy Refactor Queue
## *Autonomous Self-Improvement Tasks*

**Purpose**: Atomic tasks for Syntropy to process during runtime cycles.  
**Protocol**: Pick the next `⬜ READY` task, execute via `spawnWorker`, mark complete.  
**Safety**: All tasks are designed to be rollback-safe and testable.

---

## 📊 Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| ⬜ READY | 4 | Available for processing |
| 🟡 IN_PROGRESS | 0 | Currently being worked on |
| ✅ DONE | 23 | Completed successfully |
| ❌ FAILED | 7 | Failed, needs human review |
| ⏸️ BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-01-10T09:00:00Z (T078: Queue state repair - marked FAILED)
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

**Total Completed**: 51 tasks (T069 moved to archive, T073 pipeline created, T074 extraction done, T075 patterns analyzed, T076 insights generated, T077 documentation complete)

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
- Workers run as UID 1000 → permission denied
- Recovery: Infrastructure fixed (log permissions 666), but task itself never executed
- Status: Should be FAILED - task was not completed, queue state was inconsistent
- Resolution: Mark as FAILED, document pattern in archive
```

---

### T065: Archive Stale Queue Tasks ❌ FAILED (obsoleted by T067)
**Effort**: 15 min | **Risk**: None | **Parallel-Safe**: ❌

```
INSTRUCTIONS:
1. Open REFACTOR_QUEUE.md
2. Change these tasks from IN_PROGRESS to DONE:
   - T049: Create test coverage for narrative correlator
   - T060: Fix REFACTOR_QUEUE.md Corruption
   - T062: Fix REFACTOR_QUEUE.md Corruption - T049/T060 Cleanup
   - T064: Resolve Queue Corruption via Organismic Path
3. Add these tasks to REFACTOR_ARCHIVE.md with completion dates based on worker logs (2026-01-07)
4. Update CONTINUITY.md to reflect queue health

VERIFY:
grep "T049\|T060\|T062\|T064" /pixel/REFACTOR_QUEUE.md | grep DONE

FAILURE ANALYSIS (2026-01-08T20:20:00Z):
- Task remained IN_PROGRESS despite no worker activity
- Functionality superseded by T067 (comprehensive archive sync)
- Resolution: Marked as FAILED, archive sync completed via T067
```

---

## 📋 Phase 4: Visibility Tools

## 📋 Phase 4: Infrastructure Debugging

### T078: Implement Docu-Gardener Sync Pipeline ❌ FAILED | 2026-01-10 | b37578d5-0a87-4e11-8640-8018cb80d9ea
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create automated post-processing stage for REFACTOR_QUEUE.md → REFACTOR_ARCHIVE.md synchronization. This addresses the persistent T072-T077 gap observed across cycles 29.54-29.57.

Requirements:
1. Create new service/container: pixel-docu-gardener
2. Poll REFACTOR_QUEUE.md every 5 minutes for status changes
3. When task marked DONE, automatically:
   - Extract task details from queue
   - Append to REFACTOR_ARCHIVE.md with timestamp
   - Mark as archived in queue (or remove)
   - Log sync event
4. Handle edge cases:
   - Duplicate prevention (check archive before adding)
   - Malformed entries (skip and log error)
   - Concurrent modifications (file locking)
5. Health check endpoint at /health

Files to modify/create:
- /services/docu-gardener/src/index.ts (main orchestrator)
- /services/docu-gardener/Dockerfile
- docker-compose.yml entry for pixel-docu-gardener
- /docs/operations/T078-DocuGardener-Implementation.md (documentation)

Verification: Run service, mark a task as DONE in queue, wait 5 min, verify it appears in archive with correct format.

VERIFY:
docker ps | grep docu-gardener && curl -s http://localhost:PORT/health | grep "ok"
```

FAILURE ANALYSIS (2026-01-10T09:00:00Z):
- Exit code: 124 (timeout 2700s/45min)
- Issue: Worker failed to complete docu-gardener implementation due to permission constraints
- Worker ID: b37578d5-0a87-4e11-8640-8018cb80d9ea (original failed)
- Repair worker: a2c1c3d0-576e-4835-ba20-6d7ede20edf7 (completed queue repair)
- Root cause: Workers lack infrastructure permission escalation protocols for /tmp and file operations
- Architectural gap: Boundary violation between worker capabilities and infrastructure requirements
- Impact: Queue state desync (IN_PROGRESS vs FAILED) required manual repair
- Discovery principle: Failure reveals architectural boundaries that success conceals
- Resolution required: Implement worker permission capability or dedicated infra management layer
- Status: Queue repaired, but architectural gap documented for future resolution

---

## 📋 Phase 4: Queue Maintenance

### T045: Implement Worker Visibility Layer for Async Builds ❌ FAILED
**Effort**: 1 hour | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
This task implements visibility tools for detecting async healing processes in worker containers.

PROBLEM SOLVED:
- Workers fail silently (exit code 1) with no logs preserved
- Docker builds take 20-30 minutes in background
- Healing occurs but isn't detectable by monitoring tools
- The "invisible competence" gap from Cycle 26.16-26.23

SOLUTION REQUIRED:
1. Create worker log capture mechanism in /pixel/data/worker-logs/
2. Modify worker spawn process to persist stdout/stderr to timestamped files
3. Add health check endpoint that reports worker status and last output
4. Build detection script to identify "healing in progress" vs "permanent failure"

DELIVERABLES:
- /pixel/src/workers/visibility-monitor.ts (log capture)
- /pixel/src/workers/health-check.ts (status reporting)
- /pixel/docs/async-healing-pattern.md (documentation)
- /pixel/data/worker-logs/ directory structure

VERIFICATION:
- Run: npm run test:worker-visibility
- Verify: Worker failures write logs to /pixel/data/worker-logs/
- Verify: Health endpoint shows worker states
- Verify: 20-30 minute healing windows are detectable

CONTEXT:
- Discovered in Cycles 26.16-26.23
- Pattern: Docker restart policies + background builds = autonomous recovery
- Mission: Make invisible competence visible

VERIFY:
npm run test:worker-visibility

FAILURE ANALYSIS (2026-01-06T16:45Z):
- Task marked DONE during infrastructure crisis
- Root cause: Worker infrastructure broken (exit code 1, no logs)
- Log permissions: /pixel/logs/opencode_live.log owned by root (0644)
- Workers run as UID 1000 → permission denied
- Recovery: Infrastructure fixed (log permissions 666), but task itself never executed
- Status: Should be FAILED - task was not completed, queue state was inconsistent
- Resolution: Mark as FAILED, document pattern in archive
```

---

---

## 📋 Phase 6: Action-Oriented Tasks (2026-01-22)

### T100: Add Nostr Engagement Metrics Endpoint ⬜ READY
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅

```
GOAL: Create an API endpoint that returns real engagement metrics.

INSTRUCTIONS:
1. Add /api/metrics endpoint to pixel-landing
2. Query PostgreSQL for Nostr interaction data from agent logs
3. Return JSON with posts_today, replies_received, zaps_received, unique_interactions
4. Cache results for 5 minutes to reduce DB load

FILES TO MODIFY:
- pixel-landing/src/app/api/metrics/route.ts (create new)

VERIFY:
curl https://pixel.xx.kg/api/metrics
```

---

### T101: Create Cycle Summary Tool ⬜ READY
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅

```
GOAL: Replace verbose diary entries with concise cycle summaries.

INSTRUCTIONS:
1. Create new tool writeCycleSummary in syntropy-core
2. Summary format max 100 words - Tasks completed, Metrics, Actions, Status
3. Only write diary for NOTABLE events like feature shipped or error fixed
4. Update system prompt to use writeCycleSummary instead of writeDiary

EXPECTED OUTPUT:
Cycle 93: 1 task completed T100. Memory 45 percent. Posted to Nostr. Status: Productive.

VERIFY:
Check audit.json for new writeCycleSummary entries
```

---

### T102: Archive Failed Queue Tasks ⬜ READY
**Effort**: 15 min | **Risk**: None | **Parallel-Safe**: ✅

```
GOAL: Clean up the REFACTOR_QUEUE by archiving all FAILED tasks.

INSTRUCTIONS:
1. Move T041 T043 T045 T065 T078 to REFACTOR_ARCHIVE.md
2. Add failure summary for each
3. Leave only READY tasks in REFACTOR_QUEUE.md
4. Update CONTINUITY.md to reflect clean queue

VERIFY:
Count of FAILED in REFACTOR_QUEUE should be 0
T041 should exist in REFACTOR_ARCHIVE.md
```

---

### T103: Implement Progress-Based Self-Examination ⬜ READY
**Effort**: 45 min | **Risk**: Medium | **Parallel-Safe**: ❌

```
GOAL: Modify self-examination to measure PROGRESS not just EXISTENCE.

CURRENT BEHAVIOR:
- Checks if containers are running
- Reports healthy if things exist
- Validates nothing meaningful

NEW BEHAVIOR:
- Track tasks completed this cycle
- Track tasks blocked with reasons
- Compare metrics to previous cycle
- Report healthy only if PROGRESS was made

INSTRUCTIONS:
1. Modify syntropy-core/src/self-examination.ts
2. Add progress tracking fields tasksCompletedThisCycle and tasksAttempted
3. Change health calculation to require actual progress

VERIFY:
Run a cycle and check audit.json for new examination format
```

---

### T104: Add LNPixels Revenue Dashboard Widget ⬜ READY
**Effort**: 45 min | **Risk**: Low | **Parallel-Safe**: ✅

```
GOAL: Display real-time LNPixels activity on pixel.xx.kg.

INSTRUCTIONS:
1. Query lnpixels API for today activity
2. Create dashboard component showing pixels placed, revenue in sats, active sessions
3. Add to landing page or create /dashboard route

FILES:
- pixel-landing/src/app/locale/dashboard/page.tsx new
- pixel-landing/src/app/api/lnpixels-stats/route.ts new

VERIFY:
Visit https://pixel.xx.kg/en/dashboard and see live data
```

---

