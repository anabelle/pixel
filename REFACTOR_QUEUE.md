# 🔄 Syntropy Refactor Queue
## *Autonomous Self-Improvement Tasks*

**Purpose**: Atomic tasks for Syntropy to process during runtime cycles.  
**Protocol**: Pick the next `⬜ READY` task, execute via `spawnWorker`, mark complete.  
**Safety**: All tasks are designed to be rollback-safe and testable.

---

## 📊 Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| ⬜ READY | 1 | Available for processing |
| 🟡 IN_PROGRESS | 0 | Currently being worked on |
| ✅ DONE | 2 | Completed successfully |
| ❌ FAILED | 0 | Failed, needs human review |
| ⏸️ BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-01-23T04:20:00Z (T103: Implement Progress-Based Self-Examination)
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

**Total Completed**: 54 tasks (T069 moved to archive, T073 pipeline created, T074 extraction done, T075 patterns analyzed, T076 insights generated, T077 documentation complete, T100 metrics endpoint created, T101 cycle summary tool created, T102 archived failed tasks, T103 progress-based self-examination)

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

## 📋 Phase 6: Action-Oriented Tasks (2026-01-22)

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

