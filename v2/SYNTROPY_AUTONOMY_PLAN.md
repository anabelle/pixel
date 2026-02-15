# Syntropy Autonomous Operation Plan (v3 — Final)

**Date:** 2026-02-15
**Status:** Planning — awaiting approval (NO code changes yet)
**Objective:** Remove Ana from the Pixel→Syntropy loop. Pixel escalates → Syntropy acts → Ana gets FYI.

---

## Executive Summary

### Current Flow (Manual Bottleneck)

```
Pixel calls syntropy_notify → mailbox.jsonl
  → cron (30 min) → forwards to Pixel → Pixel calls notify_owner
    → Ana gets Telegram → Ana manually runs opencode
      → Syntropy works → Ana debriefs Pixel manually
```

**Latency:** 30 min (cron) + human availability (hours to days)

### Proposed Flow (Autonomous)

```
Pixel calls syntropy_notify → mailbox.jsonl
  → cron (30 min) → pre-flight model probe → spawns opencode headlessly
    → Syntropy reads mailbox, investigates, acts
      → Syntropy chats with Pixel interactively (test, verify, iterate)
        → Syntropy debriefs Pixel with final summary
          → Ana gets FYI notification (non-blocking)
```

**Latency:** ≤30 min (cron interval), zero human dependency

---

## V1 Failure Autopsy — Why This Must Be Done Differently

V1 had autonomous Syntropy (`syntropy-core` container + `syntropy-cycle.sh`). Killed in Session 28 for 6 specific reasons. **Every design decision below is a direct response to one of these failures.**

| # | V1 Failure | Anti-Pattern | V2 Response |
|---|-----------|-------------|-------------|
| 1 | Periodic busywork cycles (20+ tool calls every 15 min, zero work) | Running on a timer when there's nothing to do | **Event-driven only.** Empty mailbox = cron exits in <1ms. Zero LLM calls when idle. |
| 2 | Free LLM quality (kimi-k2.5-free → robotic Spanish) | Cheap models for autonomous decisions | **Pre-flight model probe** selects the best available model. GLM-4.7 primary, GitHub Copilot and Gemini fallbacks. |
| 3 | Worker permission bugs (EACCES on root-owned files) | Docker containers with wrong UID | **No containers.** Opencode runs on host as `pixel` (uid 1000). Post-run ownership audit catches any docker-created root files. |
| 4 | Self-rebuild loops (killed own container mid-task) | Agent modifying its own runtime | **Syntropy is a process, not a container.** `opencode run` starts, works, exits. Can safely rebuild Pixel's container. |
| 5 | Git commits as fake work (100+ "sync" commits) | Mistaking activity for progress | **Forbidden actions list.** No commits unless source files actually changed. |
| 6 | Unbounded scope (checked everything every cycle) | No clear scope boundaries | **Scoped to mailbox messages only.** Handle what Pixel asked, nothing more. |

---

## Failure Mode Analysis — How Will It Fail?

### Problem 1: `external_directory` permission blocks headless operations

**Discovery:** Opencode restricts file/bash operations to the project root (`/home/pixel/pixel/`) by default. The `external_directory` permission defaults to `"ask"` — in interactive mode, user approves; in headless `opencode run`, **it silently blocks**.

This means autonomous Syntropy CANNOT:
- Read/write `~/.local/share/opencode/` (session storage)
- Read/modify `~/.ssh/` (SSH keys)
- Touch `/etc/hosts` (DNS bypass)
- Run `crontab -l` or modify cron
- Access anything outside `/home/pixel/pixel/`

**Solution:** Add `"external_directory": "allow"` to `opencode.json` for `syntropy-admin`:

```json
"permission": {
  "bash": "allow",
  "edit": "allow",
  "webfetch": "allow",
  "websearch": "allow",
  "external_directory": "allow"
}
```

This is safe because: `syntropy-admin` already has full bash + edit access. The `external_directory` restriction only prevents accessing files outside the project — but Syntropy's entire job IS managing the VPS, which includes files outside the project. The VPS itself IS the sandbox.

### Problem 2: Z.AI rate limits (5-hour rolling window)

**Discovery:** Z.AI Coding Lite plan has a 5-hour rolling usage window. Right now it's returning HTTP 429 with `"Usage limit reached for 5 hour. Your limit will reset at 2026-02-15 15:34:14"`. **All Z.AI models share the same limit** — GLM-4.7, GLM-4.5-air, GLM-4.6, all of them.

**Discovery:** Opencode has **NO built-in model fallback on rate limit.** It uses one model per session. If that model 429s, the session fails.

**Solution:** Pre-flight model probe in dispatch script. Test the API BEFORE spawning opencode:

```bash
# Model cascade (order of preference):
# 1. zai-coding-plan/glm-4.7         — best quality, flat-rate
# 2. github-copilot/gpt-5.2-codex    — higher capability, Copilot subscription
# 3. github-copilot/claude-opus-4.6  — high capability, Copilot subscription
# 4. opencode/*-free models ONLY (e.g., kimi-k2.5-free, minimax-m2.5-free)
#    - allowed only as LAST resort
#    - notify owner if used
#    - verify outputs explicitly
#    - if free model missing or fails, notify owner and retry later
# 5. ABORT — no usable model, notify owner + schedule retry

probe_zai() {
  ZAI_KEY=$(grep "^ZAI_API_KEY=" "$WORKDIR/.env" | cut -d= -f2)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    https://api.z.ai/api/coding/paas/v4/chat/completions \
    -H "Authorization: Bearer $ZAI_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"glm-4.7","messages":[{"role":"user","content":"ping"}],"max_tokens":1}')
  [ "$HTTP_CODE" = "200" ]
}

model_exists() {
  # Avoid wasted opencode runs if model disappeared from models list
  /home/pixel/.opencode/bin/opencode models | grep -qx "$1"
}

notify_owner_and_retry() {
  # Notify owner via Pixel and schedule a retry (cron-based, no busy loops)
  curl -s --max-time 15 -X POST "http://127.0.0.1:4000/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"syntropy dispatch: no approved model available (zai/coding-plan down, copilot unavailable, free models missing). please check subscriptions or provider auth. will retry on next cron cycle.","userId":"syntropy-admin"}' >/dev/null || true
  exit 2
}

select_model() {
  if probe_zai; then
    echo "zai-coding-plan/glm-4.7"
    return 0
  fi

  # Copilot models (preferred): use the best available
  if model_exists "github-copilot/gpt-5.2-codex"; then
    echo "github-copilot/gpt-5.2-codex"
    return 0
  fi
  if model_exists "github-copilot/claude-opus-4.6"; then
    echo "github-copilot/claude-opus-4.6"
    return 0
  fi

  # Last resort: opencode free-tier models ONLY (name contains "-free")
  if model_exists "opencode/kimi-k2.5-free"; then
    echo "opencode/kimi-k2.5-free"
    return 0
  fi
  if model_exists "opencode/minimax-m2.5-free"; then
    echo "opencode/minimax-m2.5-free"
    return 0
  fi

  # Nothing usable
  return 1
}
```

The dispatch script selects the best working model before invoking opencode. If Z.AI is rate-limited, it falls back to the best Copilot model. If only free-tier opencode models remain (name contains `-free`), it may use them **only as a last resort** and MUST notify the owner and verify outputs. If no approved model exists, it notifies the owner and schedules a retry (next cron tick).

### Problem 3: Root-owned files after docker operations

**Discovery:** There are **28,625 root-owned files** in `v2/node_modules/` RIGHT NOW. Root cause: `docker exec` defaults to root because the Dockerfile has no `USER` directive. The `entrypoint.sh` drops to `bun` via `su-exec`, but `docker exec` bypasses the entrypoint.

Other vectors:
- Clawstr tool runs `docker run node:22-alpine` as root → root-owned files in `data/.clawstr/`
- Any `docker exec v2-pixel-1` command without `-u bun` → root-owned files
- `docker compose up --build` writing to bind-mounted volumes during build

**Solution:** Three layers of defense:

**Layer 1: Post-run ownership audit** in dispatch script:
```bash
# After opencode finishes, check for root-owned files in project
ROOT_FILES=$(find "$WORKDIR/v2" -user root -not -path "*/data/postgres/*" -not -path "*/node_modules/*" -type f 2>/dev/null | head -5)
if [ -n "$ROOT_FILES" ]; then
  log "WARNING: root-owned files detected, fixing ownership"
  docker run --rm -v "$WORKDIR:/data" alpine chown -R 1000:1000 /data/v2/data /data/v2/conversations /data/v2/skills
fi
```

**Layer 2: Agent prompt rule** — Syntropy's prompt explicitly says: "When running `docker exec` against v2-pixel-1, ALWAYS use `-u bun` to avoid creating root-owned files."

**Layer 3: Fix the existing mess** (one-time, before deployment):
```bash
docker run --rm -v /home/pixel/pixel:/data alpine chown -R 1000:1000 /data/v2/node_modules /data/v2/bun.lock /data/v2/data/.clawstr
```

### Problem 4: Sudo/root access for system-level operations

**Discovery:** `pixel` user is in the `sudo` group but needs a password. Some operations require root: `/etc/hosts` changes, package installs, journal vacuum, etc.

**Problem:** Can't store the root password in the git repo (`.env` is gitignored but still a file on disk — anyone with host access sees it).

**Solution:** Store the sudo password in a file that:
1. Lives OUTSIDE the git repo
2. Has restrictive permissions (600)
3. Is sourced by the dispatch script at runtime

```bash
# One-time setup (done by Ana manually):
echo "THE_PASSWORD" > /home/pixel/.sudo_pass
chmod 600 /home/pixel/.sudo_pass

# In dispatch script, export for opencode's bash tool:
if [ -f /home/pixel/.sudo_pass ]; then
  export SUDO_PASS=$(cat /home/pixel/.sudo_pass)
fi
```

Then in the agent prompt:
```
If you need sudo access, use: echo "$SUDO_PASS" | sudo -S <command>
The SUDO_PASS environment variable is available in your bash environment.
Do NOT echo, print, log, or expose this password in any output or file.
```

**Alternative (better long-term):** Configure passwordless sudo for specific commands only:
```bash
# /etc/sudoers.d/pixel-syntropy (requires root to create — Ana does this once)
pixel ALL=(ALL) NOPASSWD: /usr/bin/chown, /usr/bin/chmod, /usr/sbin/service, /usr/bin/journalctl, /usr/bin/apt-get
```

This is safer — Syntropy can `sudo chown` and `sudo journalctl` without any password, but can't `sudo rm -rf /` or `sudo su`.

**Recommendation:** Use the sudoers approach. It's more secure and doesn't leak any password to any process.

### Problem 5: Syntropy should CHAT with Pixel, not just debrief

**Current plan flaw:** Syntropy sends one debrief message and exits. But real infrastructure work often needs verification:
- "I fixed the SSH key" → need to test if Pixel can actually use it
- "I updated the model config" → need to rebuild container and verify Pixel works
- "I patched a bug in tools.ts" → need to ask Pixel to test the tool

**Solution:** Interactive testing protocol. The dispatch prompt instructs Syntropy to:

1. **Diagnose** the issue
2. **Fix** the issue
3. **Chat with Pixel to verify** — send a test prompt via `/api/chat`, read the response, iterate if it failed
4. **Debrief** with a summary only after verification passes

The agent prompt section:

```markdown
## Interactive Verification Protocol

After fixing an issue, VERIFY it works by chatting with Pixel:

### Step 1: Send test command
```bash
RESPONSE=$(curl -s --max-time 30 -X POST http://127.0.0.1:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"<test prompt that exercises the fix>","userId":"syntropy-admin"}')
echo "$RESPONSE" | jq -r '.response'
```

### Step 2: Analyze response
- Did Pixel use the fixed tool correctly?
- Did the response indicate success?
- Any errors in the response?

### Step 3: If verification failed
- Read container logs: `docker compose -f v2/docker-compose.yml logs pixel --tail=50`
- Check audit log: `tail -5 v2/data/audit.jsonl`
- Fix the issue and retry (up to 3 attempts)

### Step 4: Rebuild if needed
If you modified source code:
```bash
docker compose -f v2/docker-compose.yml up -d pixel --build
sleep 10  # Wait for container to be healthy
curl -s http://127.0.0.1:4000/health  # Verify health
```
Then re-run verification.

### Examples of interactive verification:
- Fixed SSH tool → chat: "test the ssh tool — run 'echo hello' on tallerubens.com"
- Fixed memory system → chat: "what do you remember about me?"
- Fixed a crash → check health endpoint and container logs
- Added a new tool → chat: "use introspect to list your tools"
```

### Problem 6: Working directory — should opencode run from `/home/pixel` or `/home/pixel/pixel`?

**Discovery:** `opencode run --dir <path>` controls the project root. This determines:
- Which `opencode.json` is loaded (agent definition)
- What counts as "inside project" vs "external_directory"
- Where relative file paths resolve to

**Decision:** Run from `/home/pixel/pixel` (the git repo root). Reasons:
1. `opencode.json` lives there — agent config, tools, permissions
2. All project files are there — code, data, scripts
3. `external_directory: "allow"` handles anything outside (SSH keys, crontab, etc.)
4. Running from `/home/pixel` would make `external_directory` less relevant but would change which config file is loaded

---

## Architecture

### Components (3 files modified, 1 new file, 1 config change)

| Component | Purpose | Change |
|-----------|---------|--------|
| `v2/scripts/syntropy-dispatch.sh` | Main entry: model probe, read mailbox, spawn opencode | **NEW** |
| `v2/scripts/check-mailbox.sh` | Cron script (30 min) | **MODIFIED** — calls dispatch |
| `opencode.json` | Agent config | **MODIFIED** — add `external_directory: "allow"` |
| `opencode-agents/syntropy-admin.md` | Agent prompt | **MODIFIED** — add autonomous protocol + interactive verification |
| `/etc/sudoers.d/pixel-syntropy` | Passwordless sudo for safe commands | **NEW** (Ana creates manually, not in git) |

### What Stays the Same

- Pixel's `syntropy_notify` tool — unchanged
- Mailbox JSONL format — unchanged
- Crontab schedule — unchanged (`*/30 * * * *`)
- Session storage — unchanged

---

## Implementation

### File 1: `v2/scripts/syntropy-dispatch.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# Syntropy Autonomous Dispatch
# Reads ALL mailbox messages, probes for working model, spawns opencode headlessly.
# ONE worker at a time. ONE session continued. Interactive verification with Pixel.
#
# Called by check-mailbox.sh when mailbox is non-empty.

WORKDIR="/home/pixel/pixel"
OPENCODE="/home/pixel/.opencode/bin/opencode"
MAILBOX="$WORKDIR/v2/data/syntropy-mailbox.jsonl"
LOG="$WORKDIR/v2/data/syntropy-dispatch.log"
PIDFILE="$WORKDIR/v2/data/syntropy-dispatch.pid"
LOCKFILE="$WORKDIR/v2/data/.syntropy-dispatch.lock"
MAX_RUNTIME=900   # 15 minutes hard kill
SESSION_FILE="$WORKDIR/v2/data/syntropy-session-id.txt"

timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

log() {
  printf "%s [dispatch] %s\n" "$(timestamp)" "$1" >> "$LOG"
}

# ── Log rotation (>1MB) ────────────────────────────────────────
if [ -f "$LOG" ]; then
  size=$(stat -c %s "$LOG" 2>/dev/null || echo 0)
  if [ "$size" -ge 1048576 ]; then
    mv "$LOG" "$LOG.1" 2>/dev/null || true
  fi
fi

# ── Guard: prevent concurrent runs ─────────────────────────────
if [ -f "$LOCKFILE" ]; then
  lock_age_min=$(( ($(date +%s) - $(stat -c %Y "$LOCKFILE")) / 60 ))
  if [ "$lock_age_min" -lt 20 ]; then
    log "SKIP: another dispatch is running (lock age: ${lock_age_min}m)"
    exit 0
  fi
  log "WARNING: removing stale lock (age: ${lock_age_min}m)"
  if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat "$PIDFILE" 2>/dev/null || echo "")
    if [ -n "$OLD_PID" ] && ps -p "$OLD_PID" > /dev/null 2>&1; then
      log "WARNING: killing stale opencode process (PID $OLD_PID)"
      kill -TERM "$OLD_PID" 2>/dev/null || true
      sleep 3
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
    rm -f "$PIDFILE"
  fi
  rm -f "$LOCKFILE"
fi

# ── Verify mailbox has content ──────────────────────────────────
if [ ! -s "$MAILBOX" ]; then
  exit 0
fi

# ── Verify opencode exists ──────────────────────────────────────
if [ ! -x "$OPENCODE" ]; then
  log "ERROR: opencode not found at $OPENCODE"
  exit 1
fi

# ── Create lock ─────────────────────────────────────────────────
touch "$LOCKFILE"

# ── Pre-flight model probe ──────────────────────────────────────
select_model() {
  # Try Z.AI first (flat-rate, best quality)
  local ZAI_KEY
  ZAI_KEY=$(grep "^ZAI_API_KEY=" "$WORKDIR/.env" | cut -d= -f2)
  if [ -n "$ZAI_KEY" ]; then
    local HTTP_CODE
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
      "https://api.z.ai/api/coding/paas/v4/chat/completions" \
      -H "Authorization: Bearer $ZAI_KEY" \
      -H "Content-Type: application/json" \
      -d '{"model":"glm-4.7","messages":[{"role":"user","content":"ping"}],"max_tokens":1}' \
      2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      echo "zai-coding-plan/glm-4.7"
      return 0
    fi
    log "INFO: Z.AI returned HTTP $HTTP_CODE, trying fallback models"
  fi

  # Fallback: GitHub Copilot (subscription-based, no API probe needed)
  # These use OAuth tokens managed by opencode — they either work or don't
  echo "github-copilot/claude-sonnet-4"
  return 0
}

MODEL=$(select_model)
log "INFO: selected model: $MODEL"

# ── Verify Pixel is healthy ────────────────────────────────────
PIXEL_HEALTHY=true
HEALTH=$(curl -s --max-time 5 http://127.0.0.1:4000/health 2>/dev/null || echo "")
if [ -z "$HEALTH" ]; then
  PIXEL_HEALTHY=false
  log "WARNING: Pixel health check failed — proceeding (cannot debrief or verify interactively)"
fi

# ── Read all messages and build a single prompt ─────────────────
MSG_COUNT=$(wc -l < "$MAILBOX" | tr -d ' ')
log "ALERT: $MSG_COUNT message(s) in mailbox, building prompt"

MESSAGES=""
while IFS= read -r line; do
  msg=$(echo "$line" | jq -r '.message // empty' 2>/dev/null)
  priority=$(echo "$line" | jq -r '.priority // "normal"' 2>/dev/null)
  ts=$(echo "$line" | jq -r '.timestamp // "unknown"' 2>/dev/null)
  if [ -n "$msg" ]; then
    MESSAGES="${MESSAGES}[${ts}] (priority: ${priority}) ${msg}
"
  fi
done < "$MAILBOX"

# ── Build prompt ────────────────────────────────────────────────
PROMPT="AUTONOMOUS SYNTROPY SESSION — Pixel sent ${MSG_COUNT} mailbox message(s):

${MESSAGES}
INSTRUCTIONS:
1. Read the mailbox at v2/data/syntropy-mailbox.jsonl to confirm these messages.
2. For each message: investigate, diagnose, and act.
3. Stay scoped — only handle what the messages ask about. Do NOT proactively audit infrastructure unless asked.
4. After fixing something, VERIFY it works by chatting with Pixel interactively:
   curl -s -X POST http://127.0.0.1:4000/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"<test prompt>\",\"userId\":\"syntropy-admin\"}'
   Read the response. If the fix didn't work, iterate until it does (max 3 attempts).
5. When done and verified, send a final debrief to Pixel summarizing what you did.
6. Clear the mailbox: echo -n '' > v2/data/syntropy-mailbox.jsonl
7. Do NOT make git commits unless you actually changed source code files.
8. Do NOT run periodic checks, self-examinations, or ecosystem scans.
9. When using docker exec against v2-pixel-1, ALWAYS use '-u bun' to avoid root-owned files.
10. Pixel is ${PIXEL_HEALTHY:+healthy}${PIXEL_HEALTHY:-unhealthy} right now."

# ── Determine session continuation ──────────────────────────────
SESSION_ARGS=""
if [ -f "$SESSION_FILE" ]; then
  SAVED_SESSION=$(cat "$SESSION_FILE" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$SAVED_SESSION" ]; then
    SESSION_ARGS="--session=$SAVED_SESSION"
    log "INFO: continuing session $SAVED_SESSION"
  fi
fi

# ── Archive mailbox BEFORE running ──────────────────────────────
ARCHIVE="$MAILBOX.forwarded"
cp "$MAILBOX" "$ARCHIVE"
: > "$MAILBOX"

# ── Spawn opencode ──────────────────────────────────────────────
log "INFO: spawning opencode (model: $MODEL, max runtime: ${MAX_RUNTIME}s)"

OPENCODE_OUTPUT=$(mktemp)

timeout "$MAX_RUNTIME" "$OPENCODE" run \
  --agent=syntropy-admin \
  --model="$MODEL" \
  $SESSION_ARGS \
  --format=json \
  "$PROMPT" \
  > "$OPENCODE_OUTPUT" 2>&1 &

OPENCODE_PID=$!
echo "$OPENCODE_PID" > "$PIDFILE"
log "INFO: opencode started (PID $OPENCODE_PID)"

# Wait for completion
wait "$OPENCODE_PID" 2>/dev/null
EXIT_CODE=$?

# ── Extract and save session ID ─────────────────────────────────
NEW_SESSION=$(grep -oP 'ses_[a-zA-Z0-9]+' "$OPENCODE_OUTPUT" 2>/dev/null | tail -1 || true)
if [ -n "$NEW_SESSION" ]; then
  echo "$NEW_SESSION" > "$SESSION_FILE"
  log "INFO: saved session ID $NEW_SESSION for continuation"
fi

# ── Post-run ownership audit ────────────────────────────────────
ROOT_FILES=$(find "$WORKDIR/v2" -user root \
  -not -path "*/data/postgres/*" \
  -not -path "*/node_modules/*" \
  -type f 2>/dev/null | head -5)
if [ -n "$ROOT_FILES" ]; then
  log "WARNING: root-owned files detected after dispatch, fixing ownership"
  docker run --rm -v "$WORKDIR:/data" alpine \
    chown -R 1000:1000 /data/v2/data /data/v2/conversations /data/v2/skills 2>/dev/null || true
fi

# ── Clean up ────────────────────────────────────────────────────
rm -f "$OPENCODE_OUTPUT"
rm -f "$PIDFILE"
rm -f "$LOCKFILE"

# ── Log result ──────────────────────────────────────────────────
case "$EXIT_CODE" in
  0)   log "SUCCESS: dispatch completed normally" ;;
  124) log "WARNING: dispatch timed out after ${MAX_RUNTIME}s" ;;
  *)   log "ERROR: dispatch failed with exit code $EXIT_CODE" ;;
esac

# ── FYI notification to Ana ─────────────────────────────────────
curl -s --max-time 10 -X POST http://127.0.0.1:4000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"fyi: syntropy autonomous dispatch completed. processed ${MSG_COUNT} message(s), model: ${MODEL}, exit code: ${EXIT_CODE}. no action needed unless exit code is non-zero.\",\"userId\":\"syntropy-admin\"}" \
  > /dev/null 2>&1 || true

exit 0
```

### File 2: `v2/scripts/check-mailbox.sh` (modified)

```bash
#!/usr/bin/env bash
set -euo pipefail

# Syntropy Mailbox Monitor
# If mailbox is non-empty, spawns autonomous dispatch.
# Runs via cron every 30 minutes.

MAILBOX="/home/pixel/pixel/v2/data/syntropy-mailbox.jsonl"
DISPATCH="/home/pixel/pixel/v2/scripts/syntropy-dispatch.sh"
LOG="/home/pixel/pixel/v2/data/mailbox-monitor.log"

timestamp() { date -u "+%Y-%m-%dT%H:%M:%SZ"; }
log() { printf "%s %s\n" "$(timestamp)" "$1" >> "$LOG"; }

# Rotate log if > 512KB
if [ -f "$LOG" ]; then
  size=$(stat -c %s "$LOG" 2>/dev/null || echo 0)
  [ "$size" -ge 524288 ] && mv "$LOG" "$LOG.1" 2>/dev/null || true
fi

# Empty mailbox = exit silently
[ ! -s "$MAILBOX" ] && exit 0

MSG_COUNT=$(wc -l < "$MAILBOX" | tr -d ' ')
log "ALERT: mailbox has $MSG_COUNT message(s), spawning dispatch"

# Dispatch in background (cron shouldn't wait 15 min)
"$DISPATCH" >> "$LOG" 2>&1 &
log "INFO: dispatch spawned (PID $!)"
```

### File 3: `opencode.json` (modified)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "syntropy-admin": {
      "description": "VPS administration and research agent for Syntropy — full access to manage Pixel infrastructure",
      "mode": "all",
      "temperature": 0.2,
      "steps": 100,
      "tools": {
        "bash": true,
        "read": true,
        "write": true,
        "edit": true,
        "grep": true,
        "glob": true,
        "webfetch": true,
        "websearch": true,
        "patch": true,
        "skill": true
      },
      "permission": {
        "bash": "allow",
        "edit": "allow",
        "webfetch": "allow",
        "websearch": "allow",
        "external_directory": "allow"
      },
      "color": "#8B5CF6",
      "prompt": "{file:./opencode-agents/syntropy-admin.md}"
    }
  }
}
```

**Change:** Added `"external_directory": "allow"` so headless Syntropy can access files outside the project root (SSH keys, crontab, system config, opencode session storage).

### File 4: Agent prompt additions (`opencode-agents/syntropy-admin.md`)

Add these sections:

```markdown
## Autonomous Operation Protocol

When running headlessly (spawned by `syntropy-dispatch.sh`), follow these rules:

### Scope Rules
1. **Handle ONLY what the mailbox messages ask about.** No proactive auditing.
2. **Interpret vague messages conservatively.** Fix the specific issue, not tangential ones.
3. **If you can't fix something**, document what you found and what blocked you.

### Forbidden Actions (Autonomous Mode)
- ❌ Git commits unless you actually modified source code files
- ❌ Periodic infrastructure scans or "ecosystem checks"
- ❌ Self-examination, philosophy, or reflection
- ❌ Modifying AGENTS.md session history (interactive sessions only)
- ❌ Rebuilding Pixel's container without explicit mailbox request
- ❌ Touching .env or credentials files
- ❌ Making changes to the agent prompt (this file)
- ❌ Running `docker exec` without `-u bun` (creates root-owned files)
- ❌ Exposing, logging, or printing SUDO_PASS or any credentials

### Required Actions (Autonomous Mode)
- ✅ Read the mailbox at `v2/data/syntropy-mailbox.jsonl`
- ✅ Act on each message (diagnose, fix, research)
- ✅ **Verify fixes interactively** with Pixel before debriefing (see below)
- ✅ Debrief Pixel when done with a summary
- ✅ Clear the mailbox after processing
- ✅ Stay within 15 minutes total runtime

### Interactive Verification Protocol

After fixing an issue, VERIFY it works by chatting with Pixel:

**Step 1:** Send a test prompt that exercises the fix:
```bash
RESPONSE=$(curl -s --max-time 30 -X POST http://127.0.0.1:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"<test prompt>","userId":"syntropy-admin"}')
echo "$RESPONSE" | jq -r '.response'
```

**Step 2:** Analyze the response. Did it work?

**Step 3:** If verification failed, check logs and iterate:
```bash
docker compose -f v2/docker-compose.yml logs pixel --tail=30
tail -5 v2/data/audit.jsonl
```
Fix the issue and retry (max 3 attempts).

**Step 4:** If you modified source code, rebuild first:
```bash
docker compose -f v2/docker-compose.yml up -d pixel --build
sleep 15
curl -s http://127.0.0.1:4000/health
```
Then re-run verification.

**Examples:**
- Fixed SSH → chat: "test ssh — run 'echo hello' on tallerubens.com"  
- Fixed tool bug → chat: "use introspect to list your tools"
- Fixed crash → check health + container logs
- Changed model config → chat: "what model are you using?"

### Docker Safety Rules
- When using `docker exec` against v2-pixel-1, ALWAYS use `-u bun`
- When using `docker run` with volume mounts, ALWAYS add `--user 1000:1000`
- After any docker operation that might create files, check ownership

### Root/Sudo Access
If SUDO_PASS is set in your environment, you can use it for system-level operations:
```bash
echo "$SUDO_PASS" | sudo -S <command>
```
Alternatively, some commands are configured for passwordless sudo via /etc/sudoers.d/.
NEVER expose, echo, log, or print the password.

### Session Continuation
Your session ID is preserved between autonomous runs via `v2/data/syntropy-session-id.txt`.
You accumulate context across dispatches — you'll remember previous issues, debriefs,
and infrastructure state.
```

### One-time setup: `/etc/sudoers.d/pixel-syntropy`

Ana creates this manually (requires root):

```bash
# As root:
cat > /etc/sudoers.d/pixel-syntropy << 'EOF'
# Allow pixel user to run specific commands without password for Syntropy autonomous operations
pixel ALL=(ALL) NOPASSWD: /usr/bin/chown
pixel ALL=(ALL) NOPASSWD: /usr/bin/chmod
pixel ALL=(ALL) NOPASSWD: /usr/sbin/service
pixel ALL=(ALL) NOPASSWD: /usr/bin/journalctl
pixel ALL=(ALL) NOPASSWD: /usr/bin/tee /etc/hosts
pixel ALL=(ALL) NOPASSWD: /usr/bin/apt-get update
pixel ALL=(ALL) NOPASSWD: /usr/bin/apt-get install *
EOF
chmod 440 /etc/sudoers.d/pixel-syntropy
```

This allows Syntropy to `sudo chown`, `sudo journalctl`, etc. without any password, while blocking dangerous commands like `sudo rm` or `sudo su`.

---

## Complete Failure Mode Catalog

| # | Failure | Severity | Mitigation |
|---|---------|----------|------------|
| 1 | Z.AI rate limited (5hr window) | High | Pre-flight probe → fallback to `github-copilot/claude-sonnet-4` |
| 2 | `external_directory` blocks headless file access | Critical | `"external_directory": "allow"` in `opencode.json` |
| 3 | Root-owned files from docker operations | Medium | Post-run ownership audit + `-u bun` prompt rule |
| 4 | Opencode hangs > 15 min | Medium | `timeout 900` hard kill + stale lock cleanup |
| 5 | Concurrent dispatches | Low | Lock file with age check |
| 6 | Debrief/verification fails (Pixel down) | Medium | Pre-check warns, dispatch still runs, logs result |
| 7 | Recursive session conflict | Critical | Uses `--session=<id>` NOT `--continue` |
| 8 | Mailbox re-processing on crash | Low | Archive BEFORE running |
| 9 | No sudo for system operations | Medium | Sudoers config for safe commands, OR `SUDO_PASS` env var |
| 10 | Model quality too low for fix | Low | Model cascade: GLM-4.7 → Copilot Claude → Copilot Gemini |
| 11 | GitHub Copilot OAuth expired | Low | Opencode manages its own auth; if expired, next model in cascade |
| 12 | Syntropy modifies its own prompt/config | Medium | Forbidden actions list in prompt |
| 13 | Unbounded scope creep | Medium | Scoped prompt + forbidden actions |
| 14 | Interactive verification loop (infinite retry) | Low | Max 3 attempts in prompt instructions |
| 15 | Session DB grows unbounded (641MB+) | Low | Monitor; address when it becomes a problem |

---

## Testing Plan

### Test 1: Model probe
```bash
# Source the select_model function and test it
# When Z.AI is rate-limited (like right now), should return github-copilot fallback
```

### Test 2: External directory access
```bash
# After adding external_directory: allow to opencode.json
opencode run --agent=syntropy-admin "read the file at /home/pixel/.local/share/opencode/opencode.db and tell me its size"
# Should work (currently blocked)
```

### Test 3: Manual dispatch with model fallback
```bash
echo '{"timestamp":"2026-02-15T12:00:00Z","priority":"normal","message":"test: check disk usage and report back"}' > v2/data/syntropy-mailbox.jsonl
./v2/scripts/syntropy-dispatch.sh
# Verify: uses fallback model if Z.AI is rate-limited
```

### Test 4: Interactive verification
```bash
echo '{"timestamp":"2026-02-15T12:30:00Z","priority":"normal","message":"test: verify pixel is healthy by chatting with him and asking what tools he has"}' > v2/data/syntropy-mailbox.jsonl
./v2/scripts/syntropy-dispatch.sh
# Verify: dispatch log shows Syntropy chatted with Pixel and got a response
```

### Test 5: Root-file detection
```bash
# Create a fake root-owned file
sudo touch v2/data/test-root-file.txt
# Run dispatch with a test message
echo '{"timestamp":"2026-02-15T13:00:00Z","priority":"normal","message":"test: just say hello and debrief"}' > v2/data/syntropy-mailbox.jsonl
./v2/scripts/syntropy-dispatch.sh
# Verify: post-run audit detected and fixed the root-owned file
```

### Test 6: End-to-end (Pixel → mailbox → Syntropy → verify → debrief)
```bash
curl -s -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"use syntropy_notify to tell syntropy to check if your health endpoint is working","userId":"test-e2e"}'
# Wait for cron or run check-mailbox.sh manually
# Verify full loop including interactive verification
```

---

## Deployment Steps

### Pre-deployment (one-time, Ana does manually)
1. Create sudoers file: `sudo visudo -f /etc/sudoers.d/pixel-syntropy`
2. Fix existing root-owned files: `docker run --rm -v /home/pixel/pixel:/data alpine chown -R 1000:1000 /data/v2/node_modules /data/v2/bun.lock /data/v2/data/.clawstr`
3. Optionally create sudo password file: `echo "PASSWORD" > ~/.sudo_pass && chmod 600 ~/.sudo_pass`

### Deployment
1. Write `v2/scripts/syntropy-dispatch.sh` + `chmod +x`
2. Replace `v2/scripts/check-mailbox.sh`
3. Update `opencode.json` (add `external_directory: allow`)
4. Update `opencode-agents/syntropy-admin.md` (add autonomous protocol)
5. Run Test 3 (manual dispatch)
6. Run Test 4 (interactive verification)
7. Run Test 6 (end-to-end)
8. Monitor first 3 cron cycles
9. Git commit and push

---

## What We're NOT Building (and why)

| Rejected | Why |
|----------|-----|
| Session manager script | 641MB SQLite is opencode's problem. Pruning JSON metadata files is theater. |
| Separate health check cron | Dispatch script handles its own locking, PID tracking, and stale detection. |
| Log monitor cron | Exit code + log is sufficient. Scanning for "ERROR" produces false positives. |
| Separate notification script | One curl line at end of dispatch. No script needed. |
| `opencode serve` daemon | Process-per-dispatch is simpler — no daemon to monitor, crashes self-heal. |
| Multiple concurrent workers | 3.8GB VPS, ~600MB free. One opencode instance max. |
| Custom retry/fallback inside opencode | Pre-flight model probe is simpler and more reliable than runtime retry. |

---

## Resource Impact

| State | RAM | CPU | Cost | Frequency |
|-------|-----|-----|------|-----------|
| Idle (empty mailbox) | 0 | <1ms | $0 | Every 30 min |
| Active dispatch | ~200-400MB | Moderate | $0 (flat-rate) | Only when needed |

---

*Plan by Syntropy, 2026-02-15*
*Status: Awaiting approval — zero code changes until approved*
