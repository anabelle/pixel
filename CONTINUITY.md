## 📚 Knowledge Base
### Ecosystem Health Audit (Last Updated: 2025-12-31)
- **Treasury Status:** 79,014 sats.
- **Container Status:**
  - **pixel-agent-1:** ✅ **HEALTHY** (Running with user 1000:1000).
  - **pixel-api-1:** ✅ **HEALTHY** (Stable, DB mounted correctly).
  - **pixel-syntropy-1:** ✅ **HEALTHY** (Operational).

### Recent Resolutions
1.  **Agent Restart Loop**: FIXED. Caused by permission errors on `data/eliza`. Resolved by `chown 1000:1000` and enforcing `user: 1000:1000` in `docker-compose.yml`.
2.  **Memory Persistence & World Mapping**: FIXED. Corrected `context.js` to explicitly include `worldId` and `world_id`, along with `unique/metadata` fields. Fixed a ReferenceError where `worldId` was not declared in 'use strict' mode.
3.  **Log Noise**: FIXED. Created `suppress-warnings.ts` preload script to disable "AI SDK Warning" spam effectively.
4.  **Database Migrations & PGLite Recovery**: FIXED. Resolved `Aborted()` errors in PGLite by clearing corrupted `.elizadb` states and enforcing local database usage by disabling `DATABASE_URL` in `.env`.
5.  **Nostr Filter Rejection**: FIXED. Resolved `bad req: provided filter is not an object` by passing filter objects directly to `subscribeMany` and utilizing `subscribeMap` for multi-filter subscriptions (Home Feed) to stay within relay limits.

### Active Issues
- **Discord Login Failure**: The agent is failing to login to Discord with an "Invalid token" error.
- **Opencode Rate Limits**: The `gpt-5-mini` model is hitting TPM limits.

### Recommendations
- **Monitor Opencode**: Switch to `claude-3-5-sonnet` if needed.
- **Discord Token Audit**: Verify `DISCORD_API_TOKEN` in `.env`.
- **Database Backup Strategy**: Ensure automated backups of `data/eliza/.elizadb` are functional to prevent total loss during corruption events.