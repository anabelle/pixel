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
| DONE | 58 | Completed successfully |
| FAILED | 0 | Failed, needs human review |
| BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-02-09 (T001-T003 closed: infrastructure stabilized, Gemini migrated, disk cleanup done via human sessions)
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
| 6 | Recovery & Infrastructure | T001-T003 (new) | Done 3/3 |

**Total Completed**: 58 tasks

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

### T004: Perform critical disk cleanup and prune ecosystem entropy ⬜ READY
**Effort**: 10 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
1. Run 'docker system prune -af --volumes' to clear unused images, containers, and volumes.
2. Search for and remove old backups (>7 days) in the /pixel/backups or relevant directories.
3. Check for large log files and rotate/truncate if necessary.
4. Verify disk space using 'df -h'.

VERIFY:
df -h / | awk 'NR==2 {print $5}' | sed 's/%//' | xargs -I {} [ {} -lt 85 ] && echo "Success" || echo "Failed"
```

---
