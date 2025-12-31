## 📚 Knowledge Base
### Ecosystem Health Audit (Last Updated: 2025-12-31)
- **Treasury Status:** 79,014 sats.
- **Container Status:**
  - **pixel-agent-1:** ✅ **HEALTHY** (Running with user 1000:1000).
  - **pixel-api-1:** ✅ **HEALTHY** (Stable, DB mounted correctly).
  - **pixel-syntropy-1:** ✅ **HEALTHY** (Operational).

### Recent Resolutions
1.  **Agent Restart Loop**: FIXED. Caused by permission errors on `data/eliza`. Resolved by `chown 1000:1000` and enforcing `user: 1000:1000` in `docker-compose.yml`.
2.  **Memory Persistence & World Mapping**: FIXED. Corrected `context.js` to explicitly include `worldId` and `world_id`, along with `unique/metadata` fields. This ensures compatibility with the SQL adapter and prevents database insertion errors.
3.  **Log Noise**: FIXED. Created `suppress-warnings.ts` preload script to disable "AI SDK Warning" spam effectively.
4.  **Database Migrations**: FIXED. Successfully ran after permission fix.
5.  **Nostr Filter Rejection**: FIXED. Resolved `bad req: provided filter is not an object` by passing filter objects directly to `subscribeMany` and utilizing `subscribeMap` for multi-filter subscriptions (Home Feed) to stay within relay limits.

### Active Issues
- **Opencode Rate Limits**: The `gpt-5-mini` model is hitting TPM limits.

### Recommendations
- **Monitor Opencode**: Switch to `claude-3-5-sonnet` if needed.
- **Audit SQL Storage**: Verify that memories are correctly linked across restarts with the new worldId mapping.