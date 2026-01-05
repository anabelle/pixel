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
| ✅ DONE | 39 | Completed successfully |
| ❌ FAILED | 0 | Failed, needs human review |
| ⏸️ BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-01-04T18:11Z (T036)  
**Last Verified**: 2026-01-04 (Queue/Archive sync)  
**Next Priority**: T039 - Closing the Identity Loop

---

## 📋 Active Tasks

### T039: Implement Identity Evolution Tools ✅ DONE
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T038

```
INSTRUCTIONS:
1. Update `syntropy-core/src/tools/continuity.ts`.
2. Implement `evolveIdentity` tool:
   - Input: `content` (full string), `reason` (string).
   - Action: Writes to `PIXEL_ROOT/AGENTS.md`.
   - Rationale: Allows Syntropy to rewrite its own "Soul" based on evolutionary data.
3. Implement `updateVision` tool:
   - Input: `content` (full string), `reason` (string).
   - Action: Writes to `PIXEL_ROOT/VISION.md`.
   - Rationale: Allows Syntropy to update its "North Star" goals.
4. Ensure both tools use `logAudit` and `syncAll` (Git push) to persist the change.

VERIFY:
Checked by running a dry run or verifying file existence after execution.
```

Use `addRefactorTask` to add new tasks, or `analyzeForRefactoring` to discover opportunities.

---

## ✅ Completed Phases Summary

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| 0 | Quick Wins (Cleanup & Scripts) | T001-T012 | ✅ 12/12 |
| 1 | Nostr Plugin Refactoring | T013-T023 | ✅ 10/10 |
| 2 | API Route Splitting | T024-T026 | ✅ 3/3 |
| 3 | Syntropy Tools Extraction | T027-T037 | ✅ 12/12 |

**Total Completed**: 37 tasks

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

## 📋 Phase 4: Documentation & Knowledge


### T040: Create Plan C Optimization Playbook Module ⬜ READY
**Effort**: 45 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create a new module at /pixel/syntropy-core/src/optimization/plan-c-playbook.ts that documents the Bitcoin memory optimization techniques used in the Plan C execution.

This module should include:
1. The optimization workflow used (analyze, tune, validate)
2. Specific techniques applied to reduce Bitcoin memory from 1.722GiB to 1.061GiB
3. Validation methodology (swap sustainability testing)
4. Metrics and thresholds used for decision-making
5. Reusable patterns for future container optimizations
6. Export functions that other optimization tasks can import

Include JSDoc comments explaining each optimization technique and when to apply it. This becomes the reusable playbook for future optimization work.

VERIFY:
cd /pixel/syntropy-core && npm run build
```

---

---

*This queue is designed for autonomous processing. Each task is atomic and reversible.*
*For completed task details, see REFACTOR_ARCHIVE.md*
