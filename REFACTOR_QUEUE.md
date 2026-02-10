# Syntropy Refactor Queue
## *Autonomous Self-Improvement Tasks*

**Purpose**: Atomic tasks for Syntropy to process during runtime cycles.
**Protocol**: Pick the next `READY` task, execute via `spawnWorker`, mark complete.
**Safety**: All tasks are designed to be rollback-safe and testable.

---

## Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| READY | 0 | Available for processing |
| IN_PROGRESS | 0 | Currently being worked on |
| DONE | 59 | Completed successfully |
| FAILED | 0 | Failed, needs human review |
| BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-02-10 (T002 completed: 27.25GB freed via docker prune, old backup removed)
**Last Verified**: 2026-02-09 (Human verification - all tasks completed across sessions 1-5)

---

## Completed Phases Summary

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| 0 | Quick Wins (Cleanup & Scripts) | T001-T012 | Done 12/12 |
| 1 | Nostr Plugin Refactoring | T013-T023 | Done 10/10 |
| 2 | API Route Splitting | T024-T026 | Done 3/3 |
| 3 | Syntropy Tools Extraction | T027-T037 | Done 12/12 |
| 4 | Documentation & Knowledge | T038-T040 | Done 3/3 |
| 5 | Operations & Maintenance | T041-T077 | Done 36/36 |
| 6 | Recovery & Infrastructure | T001-T004 (new) | Done 4/4 |

**Total Completed**: 59 tasks

> Full task history with instructions available in [REFACTOR_ARCHIVE.md](./REFACTOR_ARCHIVE.md)

---

## Processing Rules for Syntropy

1. **One task per cycle**: Only attempt ONE task from this queue per Syntropy cycle
2. **Spawn Worker**: Use `spawnWorker` with the task's `INSTRUCTIONS` block
3. **Verify before marking done**: Run the `VERIFY` command if provided
4. **Update status**: After completion, update task status and move to archive
5. **Don't skip ahead**: Tasks may have dependencies, process in order
6. **PROD VERIFICATION**: All `VERIFY` commands must be run on the **VPS** (`65.181.125.80`) to confirm success in the real world.

---

## Template for New Tasks

    ### TXXX: [Title] READY
    **Effort**: X min | **Risk**: None/Low/Medium/High | **Parallel-Safe**: Yes/No
    **Depends**: TXXX (optional)

    INSTRUCTIONS:
    [Step-by-step instructions for the worker]

    VERIFY:
    [Command to verify success]

---

## Archived Tasks (Recently Closed)

---

## 📋 Phase 4: Optimization

### T001: Reduce Gemini Call Volume ✅ DONE
**Effort**: 1 hour | **Risk**: Medium | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
The agent is making ~380 TEXT_SMALL calls per hour for topic extraction, which will hit Gemini free tier limits.
1. Locate the topic extraction logic in pixel-agent.
2. Increase the interval between extraction cycles.
3. Implement batching if possible.
4. Verify call volume reduction.

VERIFY:
docker logs pixel-agent-1 | grep "Success! Generated" | wc -l
```

---

## 📋 Infrastructure Maintenance

---

## 📋 Phase 4: Infrastructure Tuning


### T002: Optimize container memory limits to reduce swap usage ✅ DONE
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
1. Analyze container memory usage using 'docker stats' or getVPSMetrics details.
2. Identify containers exceeding their reserved limits or showing high growth.
3. Adjust memory limits in docker-compose.yml to prevent swap thrashing.
4. Restart affected containers and monitor swap usage.

VERIFY:
free -h && docker stats --no-stream
```

---
