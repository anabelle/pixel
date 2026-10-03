# Runbook — TallerUbens Co-Admin Duty

> **Scope:** Operational duty over jorge's production site (tallerubens.com),
> held by Pixel/Syntropy since 2026-09-30 while jorge is buried at the empresa.
> Duty registered in `v2/servers.json` (commit 86aca59).
> **Source repo:** `/home/pixel/developero/repos/tallerubens` (developero's
> workspace — read/verify freely, never modify without coordination).

## What the duty IS

Watch, verify, and act through **documented access paths only**:

| # | Access path | Status |
|---|-------------|--------|
| 1 | **Prod site** `https://tallerubens.com/` | WordPress 6.9.1, behind Cloudflare |
| 2 | **Staging** `https://dev.tallerubens.com/` | basic-auth (`rubens`), noindex, staging flags |
| 3 | **WP-REST App Password** | `WP_ADMIN_USER`/`WP_APP_PASS` in repo `.env.local` — authenticates as `rubens` (id 1), admin scope confirmed |
| 4 | **Deploy pipeline** | `develop` → verify staging → PR → `main` → GitHub Actions FTP deploy |
| 5 | **Watchdog** | `developero/repos/tallerubens/bin/site-watchdog.sh`, cron daily 3:35, alerts Syntropy mailbox **on regression only** |

**The historical `talleru` SSH path is obsolete and must not be used.** Coordinate server-side operations through developero; public HTTP checks do not prove current hosting-account capabilities. `servers.json` tallerubens
entry carries `capabilities: ["wp"]` only — no ssh.

## Verification (on demand)

```bash
v2/scripts/verify-tallerubens-duty.sh
```

Read-only, stateless, prints no secrets. Checks: prod 200 + WP marker,
staging 200 + auth, WP-REST app-password auth + admin scope, deploy sync
(local checkout HEAD == remote main), watchdog freshness (<36h). Exit 0 means these limited probes passed, NOT that live production matches GitHub. Real deploy verification requires the real docroot sync-state/file read-back; purchase/login/mobile flows remain untested.
This complements — never replaces — the daily stateful watchdog.

## Duties

1. **Uptime watch** — watchdog alerts land in the Syntropy mailbox; dispatch
   sessions triage them: prod/staging down, WP version downgrade, deploy lag
   >7 days. Verify with the script above before acting.
2. **Deploy discipline** — all code changes flow `develop` → staging verify →
   PR → `main`. Never push to `main` directly. Never FTP manually when the
   Actions pipeline is healthy.
3. **DB sync safety** — NEVER run the historical `sync-staging.sh` or `talleru` SSH recipes. They contain pre-consolidation paths and destructive sync behavior. A staging refresh requires a separately reviewed, backed-up procedure through developero. **NEVER sync staging DB → production.**
4. **Prod changes via WP-REST only** — content/publishing tasks for jorge use
   the app password. Plugin/core updates on prod require: staging
   verification + owner (Ana) approval. Direct-on-prod file changes get
   backported via `sync-to-git.sh`.
5. **Incident response** — on regression alert: verify (script), assess blast
   radius, fix via pipeline if code-side, escalate to Ana if host-side.

## Standing items

- **CRITICAL — prod PHP 7.4.33 EOL:** host-panel fix only (owner action via
  cPanel/hosting.com). Ours: keep flagging in watchdog state; do not attempt
  workarounds on prod.
- **Staging is disposable; prod DB is the only source of truth.**
- Jorge directs this team; existing project-owner approval boundaries remain unchanged. We are co-admins, not owners.

## Forbidden under this duty

- No credential changes (app passwords, FTP secrets, basic-auth) without Ana.
- No prod deploys beyond the approved pipeline.
- No modifications to developero's watchdog/scripts without coordination.
- No secrets committed to either repo or printed in logs/results.

## Verification log

- **2026-10-03 (Syntropy dispatch, task 49d5492a):** all 7 checks green —
  prod 200/WP 6.9.1, staging 200, WP-REST `rubens` admin scope, main
  94085831 == origin, watchdog fresh 9h. PHP still 7.4.33 (standing EOL).
