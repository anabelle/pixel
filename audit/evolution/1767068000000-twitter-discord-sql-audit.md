# Technical Audit: Twitter, Discord, and SQL Integration

**Date**: December 30, 2025
**Scope**: `pixel-agent` plugin architecture and configuration.

## Executive Summary
The agent is currently running on a hybrid architecture with up-to-date core libraries but significantly outdated Twitter and Discord plugins. A custom runtime patch is being used to keep the Twitter integration functional against rate limits. Database configuration is inconsistent across maintenance scripts.

## 1. Twitter Integration

### Current Status
- **Plugin Version**: `@elizaos/plugin-twitter` v1.2.22 (Significantly outdated).
- **Architecture**: Uses a custom runtime patch (`twitter-patch.js`) injected via `start-with-twitter-patch.sh`.
- **Mechanism**: The patch intercepts the `TwitterAuth` class to swallow 429 (Rate Limit) errors and pause execution rather than crashing.
- **Authentication**: Explicitly uses **OAuth 1.0a** (API Key/Secret + Access Token/Secret).

### Issues Identified
- **Fragility**: The patch relies on internal implementation details of an old plugin version. It prevents upgrades.
- **Credential Confusion**: Newer ElizaOS versions typically use Scraper credentials (User/Pass). This setup requires Developer Portal API keys, which are harder to get.
- **Missing Config**: `TWITTER_API_KEY` and related secrets were missing from `.env.example`.

### Resolution Steps
1.  **Immediate**: Populate `.env` with OAuth 1.0a credentials (added to `.env.example`).
2.  **Strategic**: Plan a migration to the latest `@elizaos/plugin-twitter` (v1.6.x+). This will likely require removing the patch script and switching to scraper-based authentication if API limits remain a bottleneck.

## 2. SQL / Database Integration

### Current Status
- **Plugin Version**: `@elizaos/plugin-sql` v1.6.2 (Up to date).
- **Configuration**: The plugin expects `DATABASE_URL` or `POSTGRES_URL` but falls back silently (likely to error or SQLite depending on core).

### Issues Identified
- **Inconsistency**:
    - `clean-db.sh` targets database: `elizaos_db` (User: `elizaos_user`)
    - `backup-eliza-db.sh` targets database: `pixel_db` (User: `pixel`)
    - Docs mention database: `pixel`
- **Missing Config**: `DATABASE_URL` was not documented in `.env.example`.

### Resolution Steps
1.  **Standardization**: We have updated `.env.example` to explicitly include `DATABASE_URL`.
2.  **Configuration**: Users **must** set `DATABASE_URL` to match their actual provisioned database.
3.  **Cleanup**: Maintenance scripts (`clean-db.sh`, `backup-all-dbs.sh`) need to be updated to read `DATABASE_URL` dynamically instead of hardcoding names, or the infrastructure provisioning must ensure the name matches the scripts.

## 3. Discord Integration

### Current Status
- **Plugin Version**: `@elizaos/plugin-discord` v1.3.3 (Outdated).
- **Configuration**: Uses `DISCORD_API_TOKEN`.

### Issues Identified
- **Missing ID**: `DISCORD_APPLICATION_ID` is used in settings but was missing from `.env.example`.
- **Version Gap**: Running v1.3.3 alongside core v1.6.2 may lead to instability or missing features.

### Resolution Steps
1.  **Config**: Added `DISCORD_APPLICATION_ID` to `.env.example`.
2.  **Upgrade**: Recommended upgrade to `@elizaos/plugin-discord@latest` to match core version.

## Migration & Fix Instructions

### 1. Update Environment
Run the following check to see missing variables:
```bash
./pixel-agent/verify-env.sh
```

Copy the new keys from `.env.example` to `.env` and fill them in:
- **Twitter**: Requires API Key & Secret from X Developer Portal.
- **Database**: Ensure `DATABASE_URL` matches your local or VPS Postgres instance.

### 2. Verify Database
Before running the agent, verify connection:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### 3. Start Agent
Use the patched start command until the Twitter plugin is upgraded:
```bash
npm run start:patched
```
