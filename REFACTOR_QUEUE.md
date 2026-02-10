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

---

## 📋 Phase 2: Infrastructure Optimization


### T001: T003: Optimize Container Memory Limits to Reduce Swap Usage ✅ DONE
**Effort**: 30 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: None

```
INSTRUCTIONS:
1. Analyze current container memory footprints: 'docker stats --no-stream'.
2. Review 'docker-compose.yml' and identifying containers without 'mem_limit'.
3. Apply conservative 'mem_limit' and 'mem_reservation' to high-usage containers (agent, bitcoin, postgres).
4. For services with low usage (nginx, certbot, monitors), set very tight limits (e.g., 64MB-128MB).
5. Restart services one by one to apply changes.
6. Verify swap usage reduction: 'free -m'.

VERIFY:
free -m | grep Swap | awk '{if ($3/$2 > 0.5) exit 1; else exit 0}'
```

---

## 📋 Infrastructure Swap Fix


### T002: Urgent Swap Mitigation via Memory Limits ⬜ READY
**Effort**: 20 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: None

```
INSTRUCTIONS:
1. Read docker-compose.yml.
2. For each service, add or update 'deploy.resources.limits.memory' and 'reservations.memory'.
3. Suggested limits: 
   - agent: 800M
   - bitcoin: 256M
   - postgres: 256M
   - api: 256M
   - others: 128M
4. Run 'docker-compose up -d' to apply.
5. Check 'docker stats' and 'free -m'.

VERIFY:
free -m | grep Swap | awk '{if ($3/$2 > 0.8) exit 1; else exit 0}'
```

---
