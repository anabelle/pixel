# 🔄 Syntropy Refactor Queue
## *Autonomous Self-Improvement Tasks*

**Purpose**: Atomic tasks for Syntropy to process during runtime cycles.  
**Protocol**: Pick the next `⬜ READY` task, execute via `spawnWorker`, mark complete.  
**Safety**: All tasks are designed to be rollback-safe and testable.

---

## 📊 Queue Status

    | Status | Count | Description |
| |--------|-------|-------------|
| | ⬜ READY | 22 | Available for processing |
| | 🟡 IN_PROGRESS | 0 | Currently being worked on |
| | ✅ DONE | 10 | Completed successfully |
| | ❌ FAILED | 0 | Failed, needs human review |
| | ⏸️ BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-01-03T01:00Z (T011)
**Next Priority**: T012

---

## 🚦 Processing Rules for Syntropy

1. **One task per cycle**: Only attempt ONE task from this queue per Syntropy cycle
2. **Spawn Worker**: Use `spawnWorker` with the task's `INSTRUCTIONS` block (workers run Opencode in ephemeral containers)
3. **Verify before marking done**: Run the `VERIFY` command if provided
4. **Update ALL references**: When moving/renaming files:
   - `grep -rn "filename" /pixel --include="*.sh" --include="*.yml" --include="*.md" --include="*.json"`
   - Update every script, config, and doc that references the old path
   - This includes: docker-compose.yml, *.sh scripts, DEPLOYMENT.md, AGENTS.md, README.md, etc.
5. **Documentation is mandatory**: Every file move MUST update related documentation
6. **No breaking changes**: If a reference can't be updated, DON'T move the file
7. **Update status**: After completion, update the task status in this file
8. **Don't skip ahead**: Tasks may have dependencies, process in order unless marked parallel-safe

---

## 📋 Phase 0: Quick Wins (No Dependencies, Safe)

These are parallel-safe and can be done in any order.

### T001: Delete Temporary Output Files ✅ DONE
**Effort**: 5 min | **Risk**: None | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Delete these temporary files from the repo root /pixel/:
- direct_output.txt
- err.txt
- out.txt
- output.txt
- opencode_out.txt
- opencode_test.txt

Use: rm -f /pixel/direct_output.txt /pixel/err.txt /pixel/out.txt /pixel/output.txt /pixel/opencode_out.txt /pixel/opencode_test.txt

VERIFY:
ls -la /pixel/*.txt 2>/dev/null | wc -l  # Should be 0 or only intentional .txt files
```

---

### T002: Create Scripts Directory Structure ✅ DONE
**Effort**: 5 min | **Risk**: None | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create the following directory structure in /pixel/:

mkdir -p /pixel/scripts/backup
mkdir -p /pixel/scripts/deploy
mkdir -p /pixel/scripts/diagnostics
mkdir -p /pixel/scripts/maintenance
mkdir -p /pixel/scripts/monitoring
mkdir -p /pixel/scripts/recovery
mkdir -p /pixel/scripts/setup
mkdir -p /pixel/scripts/utilities
mkdir -p /pixel/scripts/validation

VERIFY:
ls -d /pixel/scripts/*/ | wc -l  # Should be 9
```

---

### T003: Move Backup Scripts ✅ DONE
**Effort**: 5 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T002

```
INSTRUCTIONS:
Move backup-related scripts to /pixel/scripts/backup/:

mv /pixel/autonomous-backup.sh /pixel/scripts/backup/

Update any references if found.

VERIFY:
test -f /pixel/scripts/backup/autonomous-backup.sh && echo "OK"
```

---

### T004: Move Monitoring Scripts ✅ DONE
**Effort**: 5 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T002

```
INSTRUCTIONS:
Move monitoring scripts to /pixel/scripts/monitoring/:

mv /pixel/check-monitor.sh /pixel/scripts/monitoring/
mv /pixel/health-check.sh /pixel/scripts/monitoring/
mv /pixel/server-monitor.js /pixel/scripts/monitoring/
mv /pixel/report-status.js /pixel/scripts/monitoring/

VERIFY:
ls /pixel/scripts/monitoring/ | wc -l  # Should be 4
```

---

### T005: Move Deploy Scripts ✅ DONE
**Effort**: 5 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T002

```
INSTRUCTIONS:
Move deployment scripts:

mv /pixel/deploy-production.sh /pixel/scripts/deploy/
# safe-deploy.sh is already in scripts/

VERIFY:
test -f /pixel/scripts/deploy/deploy-production.sh && echo "OK"
```

---

### T006: Move Maintenance Scripts ✅ DONE
**Effort**: 5 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T002

```
INSTRUCTIONS:
Move maintenance scripts:

mv /pixel/final-cleanup.sh /pixel/scripts/maintenance/
mv /pixel/fix-build-corruption.sh /pixel/scripts/maintenance/
mv /pixel/rotate-logs.sh /pixel/scripts/maintenance/

VERIFY:
ls /pixel/scripts/maintenance/ | wc -l  # Should be 3

Completed: 2026-01-02T23:08Z
```

---

### T007: Move Setup Scripts ✅ DONE
**Effort**: 5 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T002

```
INSTRUCTIONS:
Move setup scripts:

mv /pixel/docker-setup.sh /pixel/scripts/setup/
mv /pixel/vps-bootstrap.sh /pixel/scripts/setup/

VERIFY:
ls /pixel/scripts/setup/ | wc -l  # Should be 2+ (init-ssl.sh, setup-local-docker.sh may already be there)
```

Completed: 2026-01-02T23:14Z

---

### T008: Move Recovery Scripts ✅ DONE
**Effort**: 5 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T002

```
INSTRUCTIONS:
Move recovery scripts:

mv /pixel/emergency-recovery.sh /pixel/scripts/recovery/

VERIFY:
test -f /pixel/scripts/recovery/emergency-recovery.sh && echo "OK"
```

Completed: 2026-01-02T23:27Z

---

### T009: Move Utility Scripts ✅ DONE
**Effort**: 5 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T002

```
INSTRUCTIONS:
Move utility scripts:

mv /pixel/download_pixels.py /pixel/scripts/utilities/
mv /pixel/query_db.js /pixel/scripts/utilities/
mv /pixel/restore_pixels.js /pixel/scripts/utilities/

VERIFY:
ls /pixel/scripts/utilities/ | wc -l  # Should be 3
```

Completed: 2026-01-02T23:34Z

---

### T010: Move Diagnostics Scripts ✅ DONE
**Effort**: 5 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T002

```
INSTRUCTIONS:
Move diagnostic scripts:

mv /pixel/doctor.js /pixel/scripts/diagnostics/

VERIFY:
test -f /pixel/scripts/diagnostics/doctor.js && echo "OK"
```

Completed: 2026-01-02T23:40Z

---

### T011: Update Package.json Script References ✅ DONE
**Effort**: 10 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T003-T010

```
INSTRUCTIONS:
Update /pixel/package.json to reference new script locations.

Change:
  "doctor": "node doctor.js"
To:
  "doctor": "node scripts/diagnostics/doctor.js"

Verify no other script references are broken.

VERIFY:
npm run doctor 2>&1 | head -5  # Should run without "file not found"
```

Completed: 2026-01-03T01:00Z
Worker: [WORKER_CONTAINER] - task briefing executed

---

### T012: Update .gitignore for Temp Files 🟡 IN_PROGRESS
**Effort**: 5 min | **Risk**: None | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Add these patterns to /pixel/.gitignore if not present:

# Temporary output files
*_output.txt
*_out.txt
out.txt
err.txt

VERIFY:
grep -q "out.txt" /pixel/.gitignore && echo "OK"
```

-

## 📋 Phase 2: API Route Splitting

### T024: Create Routes Directory Structure ⬜ READY
**Effort**: 5 min | **Risk**: None | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
mkdir -p /pixel/lnpixels/api/src/routes
mkdir -p /pixel/lnpixels/api/src/middleware
mkdir -p /pixel/lnpixels/api/src/controllers

VERIFY:
ls -d /pixel/lnpixels/api/src/*/ | wc -l  # Should be 3+
```

---

### T025: Extract Validation Middleware ⬜ READY
**Effort**: 20 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T024

```
INSTRUCTIONS:
Create /pixel/lnpixels/api/src/middleware/validation.ts

Extract these functions from routes.ts:
- validateCoordinates
- validateColor
- validateLetter
- validateRectangleCoordinates

Export them as middleware and utility functions.

VERIFY:
cd /pixel/lnpixels/api && npx tsc --noEmit 2>&1 | tail -5
```

---

### T026: Extract Stats Routes ⬜ READY
**Effort**: 30 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T025

```
INSTRUCTIONS:
Create /pixel/lnpixels/api/src/routes/stats.routes.ts

Extract /api/stats endpoint from routes.ts to this new file.
Use Express Router pattern.
Import back into main routes.ts using router.use()

VERIFY:
curl http://localhost:3000/api/stats 2>&1 | head -5
```

---

## 📋 Phase 3: Syntropy Tools Splitting

### T027: Create Tools Directory Structure ⬜ READY
**Effort**: 5 min | **Risk**: None | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
mkdir -p /pixel/syntropy-core/src/tools

VERIFY:
test -d /pixel/syntropy-core/src/tools && echo "OK"
```

---

### T028: Extract Continuity Tools ⬜ READY
**Effort**: 20 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T027

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/continuity.ts

Extract from tools.ts:
- readContinuity tool
- updateContinuity tool

Re-export from tools/index.ts
Update main tools.ts to import from tools/continuity.ts

VERIFY:
cd /pixel/syntropy-core && bun run build 2>&1 | tail -5
```

---

### T029: Extract Ecosystem Tools ⬜ READY
**Effort**: 20 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T028

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/ecosystem.ts

Extract:
- getEcosystemStatus tool
- readAgentLogs tool

VERIFY:
cd /pixel/syntropy-core && bun run build 2>&1 | tail -5
```

---

### T030: Extract Memory Tools ⬜ READY
**Effort**: 20 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T029

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/memory.ts

Extract:
- readPixelMemories tool
- getPixelStats tool

VERIFY:
cd /pixel/syntropy-core && bun run build 2>&1 | tail -5
```

---

### T031: Extract Character Tools ⬜ READY
**Effort**: 20 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T030

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/character.ts

Extract:
- readCharacterFile tool
- mutateCharacter tool

VERIFY:
cd /pixel/syntropy-core && bun run build 2>&1 | tail -5
```

---

### T032: Create Tools Index and Finalize ⬜ READY
**Effort**: 15 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T031

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/index.ts that re-exports all tools.

Update main tools.ts to just re-export from ./tools/index.ts

Remaining tools to extract (can be done later):
- checkTreasury -> treasury.ts
- notifyHuman -> notifications.ts
- writeEvolutionReport -> evolution.ts
- readAudit -> audit.ts

(Note: delegateToOpencode has been replaced by spawnWorker in worker-tools.ts)

VERIFY:
cd /pixel/syntropy-core && bun run build && bun run start 2>&1 | head -10
```

---

## 🔧 How Syntropy Should Process This Queue

Add this to CONTINUITY.md under Short-Term Tasks:

```markdown
- [ ] Process one task from REFACTOR_QUEUE.md per cycle (T001 → T032)
```

And add this processing logic to Syntropy's instructions:

```
REFACTORING PROTOCOL:
1. At the END of each successful cycle (after normal operations)
2. Read REFACTOR_QUEUE.md
3. Find the first task marked ⬜ READY
4. If task has unmet "Depends" - skip to next READY task
5. Call spawnWorker with the INSTRUCTIONS block (runs in ephemeral container)
6. Run VERIFY command to confirm success
7. Update task status: ⬜ READY → ✅ DONE (or ❌ FAILED)
8. Update "Last Processed" timestamp
9. Only process ONE task per cycle to maintain stability
```

---

**Total Tasks**: 32  
**Estimated Total Effort**: ~15 hours of automated work  
**At 1 task per Syntropy cycle**: ~32 cycles to complete Phase 0-3

---

*This queue is designed for autonomous processing. Each task is atomic and reversible.*
