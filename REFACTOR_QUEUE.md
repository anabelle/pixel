# 🔄 Syntropy Refactor Queue
## *Autonomous Self-Improvement Tasks*

**Purpose**: Atomic tasks for Syntropy to process during runtime cycles.  
**Protocol**: Pick the next `⬜ READY` task, execute via `spawnWorker`, mark complete.  
**Safety**: All tasks are designed to be rollback-safe and testable.

---

## 📊 Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| ⬜ READY | 18 | Available for processing |
| 🟡 IN_PROGRESS | 0 | Currently being worked on |
| ✅ DONE | 15 | Completed successfully |
| ❌ FAILED | 0 | Failed, needs human review |
| ⏸️ BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-01-03T02:15Z (T013)
**Last Verified**: 2026-01-02 (Phase 1 accuracy check)
**Next Priority**: T014

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

### T012: Update .gitignore for Temp Files ✅ DONE
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

Completed: 2026-01-03T01:52Z
Worker: [WORKER_CONTAINER] - task briefing executed

---

## 📋 Phase 1: Nostr Plugin - Thread Context Extraction

**service.js current size**: 7740 lines  
**Target**: Extract ~300 lines of thread context logic to threadContext.js

### T013: Create threadContext.js Skeleton ✅ DONE
**Effort**: 15 min | **Risk**: Low | **Parallel-Safe**: ✅

**Note**: `context.js` already exists but handles Nostr room/world context, NOT thread resolution.
This new file handles reply thread fetching and engagement decisions.

```
INSTRUCTIONS:
Create /pixel/pixel-agent/plugin-nostr/lib/threadContext.js with this skeleton:

"use strict";

const { poolList } = require('./poolList');

/**
 * Thread Context Resolver
 * Extracted from service.js (lines 4223-4530) for better separation of concerns.
 * Handles fetching thread history and determining engagement quality.
 */

class ThreadContextResolver {
  constructor({ pool, relays, selfPubkey, maxEvents, maxRounds, batchSize, list, logger }) {
    this.pool = pool;
    this.relays = relays;
    this.selfPubkey = selfPubkey;
    this.maxEvents = maxEvents || 80;
    this.maxRounds = maxRounds || 4;
    this.batchSize = batchSize || 3;
    this._list = list || ((relays, filters) => poolList(pool, relays, filters));
    this.logger = logger || console;
  }

  // Placeholder - will be filled in T014
  async getThreadContext(evt) {
    throw new Error('Not implemented - see T014');
  }

  // Placeholder - will be filled in T015
  assessThreadContextQuality(threadEvents) {
    throw new Error('Not implemented - see T015');
  }

  // Placeholder - will be filled in T016
  shouldEngageWithThread(evt, threadContext) {
    throw new Error('Not implemented - see T016');
  }
}

module.exports = { ThreadContextResolver };

VERIFY:
node -e "require('/pixel/pixel-agent/plugin-nostr/lib/threadContext.js')" && echo "OK"
```

Completed: 2026-01-03T02:15Z
Worker: Created skeleton file, verification passed

---

### T014: Extract _getThreadContext to threadContext.js 🟡 IN_PROGRESS
**Effort**: 30 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T013

**Current location**: service.js lines 4223-4433 (~210 lines)

```
INSTRUCTIONS:
1. Open /pixel/pixel-agent/plugin-nostr/lib/service.js
2. Find the _getThreadContext method (lines 4223-4433)
3. Copy the method body to ThreadContextResolver.getThreadContext in threadContext.js
4. Adapt 'this.' references to use constructor-injected dependencies:
   - this.pool -> this.pool
   - this.relays -> this.relays  
   - this._list -> this._list
   - this.maxThreadContextEvents -> this.maxEvents
   - this.threadContextFetchRounds -> this.maxRounds
   - this.threadContextFetchBatch -> this.batchSize
   - this._assessThreadContextQuality -> this.assessThreadContextQuality
5. Keep the original method in service.js but make it call the new class:
   
   async _getThreadContext(evt) {
     return this.threadResolver.getThreadContext(evt);
   }

6. In the service.js constructor (after pool/relays are set), add:
   const { ThreadContextResolver } = require('./threadContext');
   this.threadResolver = new ThreadContextResolver({
     pool: this.pool,
     relays: this.relays,
     selfPubkey: this.pk,
     maxEvents: this.maxThreadContextEvents,
     maxRounds: this.threadContextFetchRounds,
     batchSize: this.threadContextFetchBatch,
     list: this._list.bind(this),
     logger: this.logger
   });

VERIFY:
cd /pixel/pixel-agent/plugin-nostr && npm test 2>&1 | tail -10
```

---

### T015: Extract _assessThreadContextQuality ⬜ READY
**Effort**: 20 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T014

**Current location**: service.js lines 4435-4461 (~27 lines)

```
INSTRUCTIONS:
1. Find _assessThreadContextQuality in service.js (lines 4435-4461)
2. Move implementation to ThreadContextResolver.assessThreadContextQuality
3. This is a pure function - no 'this.' references to adapt
4. Create wrapper in service.js:
   
   _assessThreadContextQuality(threadEvents) {
     return this.threadResolver.assessThreadContextQuality(threadEvents);
   }

VERIFY:
cd /pixel/pixel-agent/plugin-nostr && npm test 2>&1 | tail -10
```

---

### T016: Extract _shouldEngageWithThread ⬜ READY
**Effort**: 20 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T015

**Current location**: service.js lines 4463-4530 (~68 lines)

```
INSTRUCTIONS:
1. Find _shouldEngageWithThread in service.js (lines 4463-4530)
2. Move implementation to ThreadContextResolver.shouldEngageWithThread
3. Adapt the logger reference - pass logger into constructor
4. Create wrapper in service.js:
   
   _shouldEngageWithThread(evt, threadContext) {
     return this.threadResolver.shouldEngageWithThread(evt, threadContext);
   }

VERIFY:
cd /pixel/pixel-agent/plugin-nostr && npm test 2>&1 | tail -10
```

---

### T017: Create threadContext Unit Tests ⬜ READY
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅
**Depends**: T016

**Note**: test/service.threadContext.test.js already exists with some thread context tests.
This task adds unit tests for the extracted ThreadContextResolver class.

```
INSTRUCTIONS:
Create /pixel/pixel-agent/plugin-nostr/test/threadContext.test.js with unit tests:

1. Test ThreadContextResolver constructor
2. Test getThreadContext with mocked pool (returning various thread structures)
3. Test assessThreadContextQuality with sample data:
   - Empty array -> 0
   - Single short event -> low score
   - Multiple events with varied content -> high score
4. Test shouldEngageWithThread with various scenarios:
   - Root post with high quality -> true
   - Deep thread (>5 events) -> false
   - Low context quality -> false
   - Relevant keywords present -> true
   - Bot patterns -> false

Use vitest (already configured in vitest.config.mjs).

VERIFY:
cd /pixel/pixel-agent/plugin-nostr && npx vitest run threadContext 2>&1 | tail -15
```

---

## 📋 Phase 1: Nostr Plugin - Connection Manager Extraction

**Target**: Extract ~150 lines of connection lifecycle management to connectionManager.js

### T018: Create connectionManager.js Skeleton ⬜ READY
**Effort**: 15 min | **Risk**: Low | **Parallel-Safe**: ✅

**Methods to extract** (service.js):
- `_startConnectionMonitoring` (line 5648)
- `_checkConnectionHealth` (line 5662)
- `_attemptReconnection` (line 5678)
- `_setupConnection` (line 5724)

```
INSTRUCTIONS:
Create /pixel/pixel-agent/plugin-nostr/lib/connectionManager.js with skeleton class.

"use strict";

/**
 * Connection Manager
 * Extracted from service.js (lines 5648-5800) for better separation.
 * Handles pool lifecycle, health monitoring, and reconnection logic.
 */

class ConnectionManager {
  constructor({ poolFactory, relays, pkHex, runtime, handlers, config, logger }) {
    this.poolFactory = poolFactory;
    this.relays = relays;
    this.pkHex = pkHex;
    this.runtime = runtime;
    this.handlers = handlers; // { onevent, oneose, onclose }
    this.config = config; // { checkIntervalMs, maxTimeSinceLastEventMs, maxReconnectAttempts, reconnectDelayMs }
    this.logger = logger || console;
    
    this.pool = null;
    this.listenUnsub = null;
    this.homeFeedUnsub = null;
    this.monitorTimer = null;
    this.reconnectAttempts = 0;
    this.lastEventReceived = Date.now();
  }

  // Placeholder - T019
  async setup() { throw new Error('Not implemented - see T019'); }
  
  // Placeholder - T020  
  startMonitoring() { throw new Error('Not implemented - see T020'); }
  checkHealth() { throw new Error('Not implemented - see T020'); }
  async attemptReconnection() { throw new Error('Not implemented - see T020'); }
  
  stop() {
    if (this.monitorTimer) clearTimeout(this.monitorTimer);
    if (this.listenUnsub) try { this.listenUnsub(); } catch {}
    if (this.homeFeedUnsub) try { this.homeFeedUnsub(); } catch {}
    if (this.pool) try { this.pool.close([]); } catch {}
  }
}

module.exports = { ConnectionManager };

VERIFY:
node -e "require('/pixel/pixel-agent/plugin-nostr/lib/connectionManager.js')" && echo "OK"
```

---

### T019: Extract _setupConnection ⬜ READY
**Effort**: 30 min | **Risk**: High | **Parallel-Safe**: ❌
**Depends**: T018

**Current location**: service.js lines 5724-5800+ (~80 lines)

```
INSTRUCTIONS:
1. Extract _setupConnection (lines 5724-5800+) to ConnectionManager.setup()
2. This method creates pool, sets up subscriptions via subscribeMap
3. Adapt references:
   - this.runtime -> this.runtime
   - this.relays -> this.relays
   - this.pkHex -> this.pkHex
   - this.pool -> this.pool (store on instance)
   - this.listenUnsub -> this.listenUnsub
4. Return pool instance so service.js can store reference
5. This is HIGH RISK - connection setup is critical. Test thoroughly.

VERIFY:
docker compose restart agent && sleep 30 && docker compose logs agent --tail=20 | grep -i "connected\|error"
```

---

### T020: Extract Connection Monitoring Methods ⬜ READY
**Effort**: 30 min | **Risk**: Medium | **Parallel-Safe**: ❌
**Depends**: T019

**Current locations** (service.js):
- `_startConnectionMonitoring` (line 5648, ~14 lines)
- `_checkConnectionHealth` (line 5662, ~16 lines)
- `_attemptReconnection` (line 5678, ~46 lines)

```
INSTRUCTIONS:
1. Extract these methods to ConnectionManager:
   - _startConnectionMonitoring -> startMonitoring()
   - _checkConnectionHealth -> checkHealth()
   - _attemptReconnection -> attemptReconnection()
2. Adapt references to use constructor-injected config
3. Note: _checkConnectionHealth also calls _cleanupImageContexts() - 
   this should be passed as a callback in handlers or kept in service.js

VERIFY:
cd /pixel/pixel-agent/plugin-nostr && npm test 2>&1 | tail -10
```

---

## 📋 Phase 1: Nostr Plugin - Contact Manager ✅ ALREADY EXTRACTED

**STATUS**: Contact management code was already extracted to `contacts.js` and `mute.js` in prior work.
Tasks T021-T023 are marked DONE. See individual tasks for details.

### T021: SKIP - contacts.js and mute.js Already Exist ✅ DONE
**Effort**: N/A | **Risk**: None | **Parallel-Safe**: ✅

**STATUS**: Already completed in prior refactoring.
- `/pixel/pixel-agent/plugin-nostr/lib/contacts.js` - exports: loadCurrentContacts, publishContacts, loadMuteList, publishMuteList
- `/pixel/pixel-agent/plugin-nostr/lib/mute.js` - exports: muteUser, unmuteUser, checkIfMuted

Service.js methods `_loadCurrentContacts`, `_loadMuteList`, `_publishContacts`, `_publishMuteList` are now thin wrappers
that call these extracted functions. Methods `muteUser`/`unmuteUser` in service.js add caching and logging.

```
VERIFY:
node -e "const c = require('/pixel/pixel-agent/plugin-nostr/lib/contacts'); const m = require('/pixel/pixel-agent/plugin-nostr/lib/mute'); console.log('contacts:', Object.keys(c)); console.log('mute:', Object.keys(m));" && echo "OK"
```

Completed: Prior to queue creation

---

### T022: SKIP - Contact Loading Already Extracted ✅ DONE
**Effort**: N/A | **Risk**: None | **Parallel-Safe**: ✅
**Depends**: T021

**STATUS**: Already completed. See T021.

The following are thin wrappers in service.js calling contacts.js:
- `_loadCurrentContacts` (line 1730) -> calls `loadCurrentContacts` from contacts.js
- `_loadMuteList` (line 1740) -> calls `loadMuteList` from contacts.js (with caching)
- `_isUserMuted` (line 1774) -> calls `_loadMuteList` and checks Set

Completed: Prior to queue creation

---

### T023: SKIP - Contact Mutation Already Extracted ✅ DONE
**Effort**: N/A | **Risk**: None | **Parallel-Safe**: ✅
**Depends**: T022

**STATUS**: Already completed. See T021.

The following are thin wrappers in service.js:
- `_publishContacts` (line 1829) -> calls `publishContacts` from contacts.js
- `_publishMuteList` (line 1842) -> calls `publishMuteList` from contacts.js
- `muteUser` (line 1856) -> orchestrates mute with caching and optional unfollow
- `unmuteUser` (line 1900) -> orchestrates unmute with caching

The standalone functions in mute.js (`muteUser`, `unmuteUser`, `checkIfMuted`) are simpler versions
without caching - the service.js methods add service-level concerns.

Completed: Prior to queue creation

---

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
