## 📚 Knowledge Base
### Ecosystem Health Audit (Last Updated: 2025-12-31)
- **Treasury Status:** 79,014 sats.
- **Container Status:**
  - **pixel-agent-1:** ✅ **HEALTHY** (Running with user 1000:1000).
  - **pixel-api-1:** ✅ **HEALTHY** (Stable, DB mounted correctly).
  - **pixel-syntropy-1:** ✅ **HEALTHY** (Operational).

### Recent Resolutions
1.  **Agent Restart Loop**: FIXED. Caused by permission errors on `data/eliza`. Resolved by `chown 1000:1000` and enforcing `user: 1000:1000` in `docker-compose.yml`.
2.  **Memory Persistence**: FIXED. Corrected `context.js` to pass both `userId` and `entityId` to satisfy both Postgres adapter and Drizzle plugin schemas.
3.  **Log Noise**: FIXED. Created `suppress-warnings.ts` preload script to disable "AI SDK Warning" spam effectively.
4.  **Database Migrations**: FIXED. Successfully ran after permission fix.

### Active Issues
- **Opencode Rate Limits**: The `gpt-5-mini` model is hitting TPM limits (~119k tokens requested). Syntropy delegation fails because of this.

### Recommendations
- **Monitor Opencode**: If rate limits persist, switch to `claude-3-5-sonnet` (via config or manual override) or reduce context size.
- **Verify Backups**: Ensure the new `data/eliza` ownership doesn't affect backup scripts (though it should be fine).