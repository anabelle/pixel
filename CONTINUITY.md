## 📬 Human Inbox
(No pending directives)

## 🎯 Active Focus
- PostgreSQL migration complete. Agent running with Bun + ElizaOS CLI v1.7.0.
- Twitter plugin disabled until API credentials are configured.
- **FIXED**: Opencode delegation now working with `openai/gpt-5-mini` model.

## 📋 Short-Term Tasks
- [x] Migrate agent from SQLite to PostgreSQL.
- [x] Fix ElizaOS CLI integration with Bun runtime.
- [x] Disable Twitter plugin (401 errors due to missing credentials).
- [x] Update documentation across all repos to match reality.
- [x] Implement Syntropy→Pixel insight reading (readPixelInsights tool).
- [x] Fix Opencode delegation (CLI argument order + model selection).
- [x] Fix memory persistence (UUID fallback was generating invalid IDs for PGLite).
- [x] Fix entity creation errors (refactored context.js to prevent duplicate entity inserts).
- [ ] Configure Twitter API credentials when ready to re-enable.
- [ ] Monitor Nostr plugin stability (filter format warnings observed).
- [ ] Wait for Pixel to generate self-reflections, then verify insights flow to Syntropy.

## 🗓️ Mid-Term Goals
This week: 
- Stabilize agent memory persistence (investigate PGLite query failures).
- Monitor PostgreSQL/PGLite performance.
- Observe feedback loop between Syntropy and Pixel.

## 🌟 Long-Term Vision
Strategic direction for a stable and efficient ecosystem with multi-platform engagement.

## 🔄 Ongoing Monitoring
| Item | Status | Last Checked |
|------|--------|--------------|
| Treasury balance | 79,014 sats | 2025-12-31 |
| Health: nginx | ✅ healthy | 2025-12-31 |
| Health: api | ✅ healthy | 2025-12-31 |
| Health: web | ✅ healthy | 2025-12-31 |
| Health: landing | ✅ healthy | 2025-12-31 |
| Health: agent | ⚠️ unhealthy (running) | 2025-12-31 |
| Health: syntropy | ✅ running | 2025-12-31 |
| Opencode delegation | ❌ failed (rate limit) | 2025-12-31 |
| PGLite memories | ✅ 1+ stored (fixed) | 2025-12-31 |
| PGLite DB size | 29 MB | 2025-12-31 |
| Disk usage | 68% (306 GB free) | 2025-12-31 |
| External sites | pixel.xx.kg ✅, ln.pixel.xx.kg ✅ | 2025-12-31 |

## ✅ Recently Completed (December 31, 2025)
- **API Disconnection Fixed**: Resolved `SqliteError` in LNPixels API by correctly mounting `./data` volume and setting `DB_PATH`. API is now stable.
- **Opencode Reporting**: Improved `delegateToOpencode` tool to report the last 2k chars of log output (including stderr) so Syntropy can see *why* it failed (e.g. rate limits).
- **Nginx Noise**: Reduced log noise by setting `access_log off` and `error_log warn`.
- **Nostr Robustness**: Added recursive filter sanitization to preventing "not an object" errors in `pixel-agent`.
- **Opencode Delegation Fix**: Fixed CLI argument order and model selection (though rate limits persist).
- **Submodule Sync**: All submodules committed and pushed to GitHub.

## 📚 Knowledge Base
- **Treasury Status:** 79,014 sats as of 2025-12-31.
- **Container Health:** All services except agent healthcheck are healthy. Agent is running but marked unhealthy.
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
  - Nostr filter format warnings (minor, fixed in latest push, monitoring)
  - Memory persistence failures in agent logs (needs investigation)
  - Agent healthcheck failing despite agent being operational
  - **Opencode Rate Limit Exceeded:** `gpt-5-mini` hit TPM limit (requested ~119k tokens).


---

## 🚀 Improvement Recommendations

### Critical Priority
1. **Memory Persistence Issue** - Agent logs show repeated failures:
   ```
   [NOSTR] Failed to persist memory: Failed query: select "memories"...
   params: nostr-context-daily-report...
   ```
   - **Impact**: Pixel cannot store memories, breaking learning and self-reflection.
   - **Action**: Investigate PGLite query format and schema. Check if `memories` table exists and has correct indexes.

2. **Opencode Rate Limit Failure** - Failed with `Rate limit exceeded` for `gpt-5-mini`.
   - **Error**: Requested 118902 tokens when only ~45k remaining in TPM quota.
   - **Action**: Switch Opencode model to one with higher limits (e.g. `claude-3-5-sonnet`) or reduce context window (119k is very large for a single prompt).

3. **API Service Reliability** - **FIXED**.
   - **Resolution**: Mounted `./data` directory instead of individual files to allow SQLite WAL files to persist correctly.

4. **Agent Healthcheck** - Container shows `unhealthy` despite `/health` returning `{"status":"OK"}`.
   - **Action**: Review Dockerfile healthcheck command or adjust healthcheck criteria in docker-compose.yml.

### High Priority
3. **Nostr Relay Errors** - `ERROR: bad req: provided filter is not an object` from multiple relays.
   - **Impact**: May cause missed messages or failed subscriptions.
   - **Action**: Audit nostr-tools filter construction in pixel-plugin-nostr.

4. **AI SDK Warnings** - Repeated warnings about unsupported settings (presencePenalty, frequencyPenalty, stopSequences).
   - **Impact**: Noise in logs, potential model behavior issues.
   - **Action**: Update model configuration to not pass unsupported parameters for current model.

5. **Backup Gap** - Last backup was 2025-12-30 (no backup for Dec 31).
   - **Action**: Verify backup container is functioning. Check if agent DB is being backed up (currently only pixels.db).

### Medium Priority
6. **PGLite Database Backup** - Agent's PGLite DB at `/app/.eliza/.elizadb/` (29 MB) is NOT included in backup rotation.
   - **Action**: Add PGLite backup to backup container or create separate backup routine.

7. **Log Rotation** - Agent logs are minimal (122 bytes) suggesting they may be lost on container restart.
   - **Action**: Configure persistent log volume or implement log shipping.

8. **Syntropy Opencode Live Log** - 301 KB and growing. May need rotation.
   - **Action**: Add log rotation to `opencode_live.log`.

### Low Priority
9. **Unused Postgres Service** - `postgres` service defined with `profile: unused` but consumes docker-compose complexity.
   - **Action**: Consider removing from docker-compose if truly unnecessary.

10. **Documentation Drift** - CONTINUITY.md timestamps show "2025-12-30" but audit shows issues from Dec 31.
    - **Action**: Establish automated refresh of monitoring table.