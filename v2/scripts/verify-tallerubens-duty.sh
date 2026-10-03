#!/bin/sh
# verify-tallerubens-duty.sh — on-demand, READ-ONLY verification of the
# TallerUbens co-admin duty. Run by Syntropy dispatch sessions to confirm all
# documented access paths are healthy. Complements (does NOT duplicate) the
# daily site-watchdog in developero's workspace:
#   - watchdog (developero/repos/tallerubens/bin/site-watchdog.sh): daily 3:35,
#     stateful, alerts via Syntropy mailbox on regression only.
#   - this script: dispatch-time, stateless, exit-code + human summary.
#
# Guarantees: writes nothing, alerts nothing, prints no secrets.
# Secrets are read at runtime from documented locations only:
#   - WP_ADMIN_USER / WP_APP_PASS  -> tallerubens repo .env.local
#   - staging basic auth           -> parsed from the watchdog script
#     (override with TALLERUBENS_STAGE_USER / TALLERUBENS_STAGE_PASS)
#
# Exit codes: 0 = all checks green, 1 = at least one regression/failure.

REPO_DIR="/home/pixel/developero/repos/tallerubens"
ENV_LOCAL="$REPO_DIR/.env.local"
WATCHDOG="$REPO_DIR/bin/site-watchdog.sh"
WATCHDOG_LOG="/home/pixel/developero/.opencode/tallerubens-watchdog.log"
PROD_URL="https://tallerubens.com/"
STAGE_URL="https://dev.tallerubens.com/"
WATCHDOG_MAX_AGE_HOURS=36

FAILS=0
ok()   { printf '  OK    %s\n' "$1"; }
bad()  { printf '  FAIL  %s\n' "$1"; FAILS=$((FAILS+1)); }

# ── 1. prod up + WordPress present ──────────────────────────
PROD_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PROD_URL")
[ "$PROD_CODE" = "200" ] && ok "prod https://tallerubens.com/ -> 200" \
                        || bad "prod down (HTTP $PROD_CODE)"
PROD_WP=$(curl -s --max-time 20 "$PROD_URL" | grep -o '<meta name="generator" content="WordPress [0-9.]*"' | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
[ -n "$PROD_WP" ] && ok "prod WordPress $PROD_WP" || bad "prod WordPress marker missing"

# ── 2. staging up (basic auth) ───────────────────────────────
if [ -z "$TALLERUBENS_STAGE_USER" ] && [ -f "$WATCHDOG" ]; then
  TALLERUBENS_STAGE_USER=$(sed -n 's/^STAGE_USER="\?\([^"]*\)"\?.*/\1/p' "$WATCHDOG" | head -1)
  TALLERUBENS_STAGE_PASS=$(sed -n 's/^STAGE_PASS="\?\([^"]*\)"\?.*/\1/p' "$WATCHDOG" | head -1)
fi
if [ -n "$TALLERUBENS_STAGE_USER" ]; then
  STAGE_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
    -u "$TALLERUBENS_STAGE_USER:$TALLERUBENS_STAGE_PASS" "$STAGE_URL")
  [ "$STAGE_CODE" = "200" ] && ok "staging https://dev.tallerubens.com/ -> 200 (auth ok)" \
                          || bad "staging down or auth broken (HTTP $STAGE_CODE)"
else
  bad "staging credentials unavailable (watchdog script missing?)"
fi

# ── 3. WP-REST app password (admin scope) ────────────────────
if [ -f "$ENV_LOCAL" ]; then
  WP_USER=$(sed -n 's/^WP_ADMIN_USER="\?\([^"]*\)"\?.*/\1/p' "$ENV_LOCAL" | head -1)
  WP_PASS=$(sed -n 's/^WP_APP_PASS="\?\([^"]*\)"\?.*/\1/p' "$ENV_LOCAL" | head -1)
  ME=$(curl -s --max-time 20 -u "$WP_USER:$WP_PASS" "${PROD_URL}wp-json/wp/v2/users/me")
  ADMIN_SCOPE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -u "$WP_USER:$WP_PASS" \
    "${PROD_URL}wp-json/wp/v2/users?per_page=1&context=edit")
  case "$ME" in
    *'"id"'*) ok "WP-REST app password authenticates (user slug: $(printf '%s' "$ME" | sed -n 's/.*"slug":"\([^"]*\)".*/\1/p'))" ;;
    *) bad "WP-REST app password rejected" ;;
  esac
  [ "$ADMIN_SCOPE" = "200" ] && ok "WP-REST admin scope confirmed (context=edit -> 200)" \
                           || bad "WP-REST admin scope lost (HTTP $ADMIN_SCOPE)"
else
  bad "tallerubens .env.local missing at $ENV_LOCAL"
fi

# ── 4. checkout alignment only; NOT real production deploy proof ──
if [ -d "$REPO_DIR/.git" ]; then
  LOCAL_MAIN=$(git -C "$REPO_DIR" rev-parse --short=8 HEAD 2>/dev/null)
  ORIGIN_MAIN=$(git -C "$REPO_DIR" ls-remote origin main 2>/dev/null | cut -c1-8)
  if [ -n "$LOCAL_MAIN" ] && [ "$LOCAL_MAIN" = "$ORIGIN_MAIN" ]; then
    ok "checkout aligned (HEAD $LOCAL_MAIN == remote main; live deploy not checked)"
  else
    bad "checkout drift (HEAD $LOCAL_MAIN vs remote main $ORIGIN_MAIN)"
  fi
else
  bad "tallerubens repo missing at $REPO_DIR"
fi

# ── 5. watchdog freshness ────────────────────────────────────
if [ -f "$WATCHDOG_LOG" ]; then
  LAST=$(grep -o '^[0-9T:Z.-]*' "$WATCHDOG_LOG" 2>/dev/null | tail -1)
  AGE_H=$(python3 -c "
from datetime import datetime,timezone;import sys
try:
    t=datetime.strptime('$LAST','%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    print(int((datetime.now(timezone.utc)-t).total_seconds()//3600))
except Exception:
    print(-1)")
  [ "$AGE_H" -ge 0 ] && [ "$AGE_H" -le "$WATCHDOG_MAX_AGE_HOURS" ] \
    && ok "watchdog fresh (last run ${AGE_H}h ago: $LAST)" \
    || bad "watchdog stale (last run '$LAST', age ${AGE_H}h)"
else
  bad "watchdog log missing at $WATCHDOG_LOG"
fi

echo "----"
[ "$FAILS" -eq 0 ] && echo "tallerubens duty: ALL GREEN" || echo "tallerubens duty: $FAILS REGRESSION(S)"
exit $([ "$FAILS" -eq 0 ] && echo 0 || echo 1)
