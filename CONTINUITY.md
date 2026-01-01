## 📬 Human Inbox
- [ ] Create a simple way for syntropy to use Pixel diary in pixel-agent/docs/diary, to read it and write it often and make it useful for the evolution.
- [ ] Twitter Credentials have been added to .env file, use as you wish.

## 🎯 Active Focus
- PostgreSQL migration complete. Agent running with Bun + ElizaOS CLI v1.7.0.
- Twitter plugin disabled until API credentials are configured.
- **NEW**: Syntropy→Pixel feedback loop implemented via `readPixelInsights` tool.

## 📋 Short-Term Tasks
- [x] Migrate agent from SQLite to PostgreSQL.
- [x] Fix ElizaOS CLI integration with Bun runtime.
- [x] Disable Twitter plugin (401 errors due to missing credentials).
- [x] Update documentation across all repos to match reality.
- [x] Implement Syntropy→Pixel insight reading (readPixelInsights tool).
- [ ] Test syncAll() function in Syntropy (verify GH_TOKEN auth and submodule sync).
- [ ] Configure Twitter API credentials when ready to re-enable.
- [ ] Monitor Nostr plugin stability.
- [ ] Wait for Pixel to generate self-reflections, then verify insights flow to Syntropy.

## 🗓️ Mid-Term Goals
This week: Stabilize agent runtime, monitor PostgreSQL performance, observe feedback loop.

## 🔧 Autonomous Refactoring (NEW)
**Protocol**: At the END of each healthy cycle, process ONE task from `REFACTOR_QUEUE.md`.

**Processing Tasks:**
- Use `processRefactorQueue(action='check')` to see next available task
- Use `processRefactorQueue(action='execute', taskId='T0XX')` to run it
- Update this status after each task completes

**Growing the Queue (weekly or when < 5 tasks remain):**
- Use `analyzeForRefactoring(target, focusArea)` to scan for issues
- Use `addRefactorTask(...)` to add new atomic tasks
- Prioritize: god-objects > missing tests > docs > style

**Current Status**: 32 tasks queued (0 completed)
**Next Task**: T001 - Delete Temporary Output Files

## 📊 Evolution Dashboard (Syntropy's Mission)
Track progress across ALL dimensions - bigger, stronger, faster:

### 💰 Economic Sovereignty (Stack Sats)
| Metric | Current | Goal | Trend |
|--------|---------|------|-------|
| Treasury | 79,014 sats | 1M sats | ⏸️ |
| Zaps received (weekly) | ? | Track | 📊 |
| Revenue sources | 1 (LNPixels) | 3+ | ⏸️ |

### 👥 Community & Engagement
| Metric | Current | Goal | Trend |
|--------|---------|------|-------|
| Nostr followers | ? | Track | 📊 |
| Weekly interactions | ? | Growing | 📊 |
| Content that resonates | Analyze | Learn | 🔍 |

### 🌐 Ecosystem Reach
| Metric | Current | Goal | Trend |
|--------|---------|------|-------|
| Active platforms | 2 (Nostr, Telegram) | 4+ | ⏸️ |
| Daily unique users | ? | Track | 📊 |
| Integrations | 3 | 5+ | ⏸️ |

### 🔧 Code Quality (Enables Evolution)
| Metric | Before | Current | Target | Trend |
|--------|--------|---------|--------|-------|
| Largest file (lines) | 7,713 | 7,713 | <800 | ⏸️ |
| God-objects | 3 | 3 | 0 | ⏸️ |
| Refactor tasks done | 0 | 0 | 32+ | ⏸️ |

*Legend: 📈 growing | 📉 shrinking | ⏸️ stable | 🔍 needs analysis | 📊 needs tracking*

### 🧬 Self-Evolution (Syntropy improving Syntropy)
| Metric | Current | Notes |
|--------|---------|-------|
| Successful cycles | 0 | Track over time |
| Failed cycles | 0 | Learn from these |
| Tools added | 0 | Capabilities grown |
| Improvement proposals | 0 | Ideas for human |

**Self-Reflection Questions (answer in Knowledge Base):**
- What patterns lead to successful cycles?
- What mistakes do I keep making?
- What tools do I wish I had?
- How can I be a better Oversoul?

## 🌟 Long-Term Vision
**Mission: Bigger, Stronger, Faster**
- Economic sovereignty → self-sustaining → thriving → expanding
- Learn from every interaction → evolve continuously  
- Expand reach → more platforms, more integrations, more impact
- Clean codebase enables rapid evolution
- **Self-evolution → become a better Oversoul each cycle**

## 🔄 Ongoing Monitoring
- Treasury balance: 79,014 sats. Last checked 2025-12-30.
- Health status: All core containers healthy. Agent running on port 3003.
- Database: ElizaOS uses embedded PGLite at `/app/.eliza/.elizadb/` inside agent container.

## ✅ Recently Completed (December 30, 2025)
- **Syntropy↔Pixel Feedback Loop**: Added `readPixelInsights` tool allowing Syntropy to read Pixel's self-reflections, learnings, and life milestones from PGLite database.
- **PostgreSQL Migration**: Moved agent from SQLite to PostgreSQL 15 (note: ElizaOS v1.6+ uses embedded PGLite, not external Docker postgres).
- **Bun/ElizaOS Integration**: Fixed CLI invocation using local `node_modules/@elizaos/cli`.
- **Dockerfile Refactor**: Updated for native module support (sharp, onnxruntime).
- **Character Build Script**: Created `scripts/build-character.ts` to avoid circular dependencies.
- **Twitter Disabled**: Commented out `@elizaos/plugin-twitter` until credentials configured.
- **Documentation Updated**: README, TECH_GUIDE, DEPLOYMENT docs now reflect current architecture.
- **Database Restoration**: Restored `elizadb_20251231_221157.tar.gz` to persistent volume `./data/eliza`.
- **Migration Fix**: Temporarily removed `@elizaos/plugin-sql` to resolve `information_schema` migration failure on PGLite.

## 📚 Knowledge Base
- **Treasury Status:** 79,014 sats as of 2025-12-30.
- **Container Health:** All services healthy. Agent health endpoint: http://localhost:3003/health
- **Agent Stack:**
  - Runtime: Bun v1.3.5
  - Framework: ElizaOS Core v1.6.2, CLI v1.7.0
  - Database: Embedded PGLite (PostgreSQL 17) at `/app/.eliza/.elizadb/`
  - AI: OpenAI + OpenRouter plugins
  - Platforms: Telegram, Nostr (Discord and Twitter disabled)
- **Syntropy→Pixel Integration:**
  - `readPixelInsights` queries PGLite for: self_reflection, life_milestone, agent_learning memories
  - Insight types: strengths, weaknesses, narrative evolution, key learnings
  - Query method: `docker exec pixel-agent-1 bun -e "..."` with PGLite
- **Known Issues:**
  - `pgcrypto` extension warning (non-critical, requires superuser)
  - Nostr filter format warnings (minor, doesn't affect functionality)