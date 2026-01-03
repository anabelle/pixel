# 🔄 Syntropy Refactor Queue
## *Autonomous Self-Improvement Tasks*

**Purpose**: Atomic tasks for Syntropy to process during runtime cycles.
**Protocol**: Pick the next `⬜ READY` task, execute via `spawnWorker`, mark complete.
**Safety**: All tasks are designed to be rollback-safe and testable.
**Archive**: Completed tasks are moved to `REFACTOR_ARCHIVE.md`.

---

## 📊 Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| ⬜ READY | 8 | Available for processing |
| 🟡 IN_PROGRESS | 0 | Currently being worked on |
| ✅ DONE | 0 | Completed (See Archive) |
| ❌ FAILED | 0 | Failed, needs human review |
| ⏸️ BLOCKED | 0 | Waiting on dependency |

**Last Processed**: 2026-01-03T20:10Z (T037 complete - archived)
**Next Priority**: T038

---

## 🚦 Processing Rules for Syntropy

1. **One task per cycle**: Only attempt ONE task from this queue per Syntropy cycle
2. **Spawn Worker**: Use `spawnWorker` with the task's `INSTRUCTIONS` block
3. **Verify before marking done**: Run the `VERIFY` command
4. **Update ALL references**: When moving/renaming files, update all calling scripts/docs
5. **Move to Archive**: Once done, move the task block to `REFACTOR_ARCHIVE.md` to keep this file lean
6. **No breaking changes**: Tests must pass before and after

---

## 📋 Phase 4: Unit Testing (Syntropy Tools)

**Goal**: Achieve 80%+ test coverage for all Syntropy tool modules.
**Pattern**: Create `src/tools/module.test.ts` using `bun:test` and mocked dependencies.

### T038: Continuity Tools Unit Tests ⬜ READY
**Effort**: 20 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/continuity.test.ts.
Test:
- readContinuity (file read, error handling)
- updateContinuity (file write, section updates)
Use bun:test.
```

---

### T039: Nostr Tools Unit Tests ⬜ READY
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/nostr.test.ts.
Test:
- postToNostr
- readPixelNostrFeed
- readPixelNostrMentions
Mock the @elizaos/plugin-nostr service calls.
```

---

### T040: Ecosystem Tools Unit Tests ⬜ READY
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/ecosystem.test.ts.
Test:
- getEcosystemStatus (docker ps parsing)
- readAgentLogs (line filtering)
- getVPSMetrics (CPU/Memory parsing)
Mock child_process.exec.
```

---

### T041: Memory & Diary Tools Unit Tests ⬜ READY
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/memory.test.ts.
Test:
- readPixelMemories (DB query)
- getPixelStats (DB aggregation)
- readDiary (markdown read)
- writeDiary (markdown append)
Mock bun:sqlite and fs-extra.
```

---

### T042: Character Tools Unit Tests ⬜ READY
**Effort**: 20 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/character.test.ts.
Test:
- readCharacterFile
- mutateCharacter (regex replacement)
- writeEvolutionReport (file append)
```

---

### T043: Utility Tools Unit Tests ⬜ READY
**Effort**: 20 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/utility.test.ts.
Test:
- checkTreasury (DB query)
- notifyHuman (file append)
- readAudit (log parsing)
- gitSync (mock syncAll)
```

---

### T044: Refactoring Tools Unit Tests ⬜ READY
**Effort**: 30 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/refactoring.test.ts.
Test:
- processRefactorQueue
- addRefactorTask
- analyzeForRefactoring
Mock the REFACTOR_QUEUE.md file interactions.
```

---

### T045: Research Tools Unit Tests ⬜ READY
**Effort**: 20 min | **Risk**: Low | **Parallel-Safe**: ✅

```
INSTRUCTIONS:
Create /pixel/syntropy-core/src/tools/research.test.ts.
Test:
- webSearch
- spawnResearchWorker
- readResearchResults
Mock worker-tools.ts calls.
```
