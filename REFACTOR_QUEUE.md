# 🔄 Syntropy Refactor Queue
## *Autonomous Self-Improvement Tasks*

**Purpose**: Atomic tasks for Syntropy to process during runtime cycles.  
**Protocol**: Pick the next `⬜ READY` task, execute via `spawnWorker`, mark complete.  
**Safety**: All tasks are designed to be rollback-safe and testable.

---

## 📊 Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| ⬜ READY | 0 | Available for processing |
| 🟡 IN_PROGRESS | 0 | Currently being worked on |
| ✅ DONE | 1 | Completed successfully |
| ❌ FAILED | 0 | Failed, needs human review |
| ⏸️ BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-01-23T04:46:00Z (T104: Add LNPixels Revenue Dashboard Widget)
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

**Total Completed**: 55 tasks (T069 moved to archive, T073 pipeline created, T074 extraction done, T075 patterns analyzed, T076 insights generated, T077 documentation complete, T100 metrics endpoint created, T101 cycle summary tool created, T102 archived failed tasks, T103 progress-based self-examination, T104 lnpixels revenue dashboard widget)

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

---


## 📋 Phase 2: Revenue Automation


### T001: Add NIP-57 Zap Receipt Processing to Nostr Plugin ✅ DONE
**Effort**: 90 min | **Risk**: Medium | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
**CRITICAL REVENUE TASK**

**OBJECTIVE**: Add automated zap receipt tracking to the Nostr plugin to capture revenue currently being missed.

**FILES TO MODIFY**:
1. `/pixel-agent/plugin-nostr/lib/service.js` - Add NIP-57 event kind (9735) handling
2. `/pixel-agent/plugin-nostr/lib/handlers/` - Create new zapReceiptHandler.js
3. `/pixel-agent/plugin-nostr/lib/revenueTracker.js` - New file for running totals

**IMPLEMENTATION**:
1. Add event kind 9735 (zap receipt) to the subscription filters
2. Create handler that extracts:
   - Amount from zap description tags
   - Payer pubkey (for attribution)
   - Payment hash (for uniqueness)
3. Update treasury in real-time via LNPixels API
4. Log revenue events to persistent storage
5. Trigger celebratory post when threshold reached (e.g., every 1000 sats)

**VERIFICATION**:
- Check logs for "zap receipt processed" entries
- Verify treasury balance increases
- Test with actual zap flow

**CONTEXT**: Zaps are flowing (46 sats visible in Nostr feed) but not being captured. This task fixes the immediate revenue leak without requiring worker infrastructure.

VERIFY:
grep -r "zap receipt" /pixel-agent/plugin-nostr/ && echo "Revenue tracking added successfully"
```

---
