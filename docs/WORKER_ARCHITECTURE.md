# Worker Architecture Design: Autonomous Self-Evolution

## Executive Summary

This document outlines a robust architecture for long-term autonomous AI evolution. The core insight: **Syntropy must never rebuild the container it's running in**. We separate the stable "brain" (Syntropy orchestrator) from ephemeral "hands" (Worker containers that execute code changes).

---

## 🔴 The Problem: Self-Destruction Loop

**Current Failure Mode:**
```
Syntropy → delegates to Opencode → Opencode runs "docker compose up -d --build" 
         → Docker rebuilds pixel-syntropy-1 container
         → Syntropy process (and Opencode child) are killed mid-execution
         → Task state lost, no completion record, potential partial changes
```

This is the digital equivalent of performing brain surgery on yourself while conscious.

---

## 🟢 The Solution: Brain/Hands Separation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HOST SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    SYNTROPY (Brain)                            │ │
│  │                    pixel-syntropy-1                            │ │
│  │                                                                │ │
│  │  • ToolLoopAgent (gpt-5-mini)                                 │ │
│  │  • Scheduling logic                                            │ │
│  │  • Task ledger management                                      │ │
│  │  • Worker spawning/monitoring                                  │ │
│  │  • NEVER rebuilds itself                                       │ │
│  │                                                                │ │
│  │  Mounts: /pixel (read-mostly), docker.sock (worker control)   │ │
│  └─────────────────────┬─────────────────────────────────────────┘ │
│                        │                                            │
│                        │ spawns via docker.sock                     │
│                        ▼                                            │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    WORKER (Hands)                              │ │
│  │                    pixel-worker-{uuid}                         │ │
│  │                                                                │ │
│  │  • Opencode CLI                                                │ │
│  │  • Git operations                                              │ │
│  │  • Docker compose (can rebuild other services)                 │ │
│  │  • Ephemeral: dies after task completion                       │ │
│  │                                                                │ │
│  │  Mounts: /pixel (full RW), docker.sock                        │ │
│  │  GUARDRAIL: Cannot rebuild syntropy                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    TASK LEDGER                                 │ │
│  │                    /pixel/data/task-ledger.json               │ │
│  │                                                                │ │
│  │  • Durable task queue                                         │ │
│  │  • Status tracking (pending/running/completed/failed)         │ │
│  │  • Survives container restarts                                │ │
│  │  • Recovery point for interrupted tasks                       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Detailed Component Design

### 1. Task Ledger (Persistent State)

Location: `/pixel/data/task-ledger.json`

```typescript
interface TaskLedger {
  version: 1;
  tasks: Task[];
}

interface Task {
  id: string;              // UUIDv4
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
  createdAt: string;       // ISO timestamp
  startedAt?: string;
  completedAt?: string;
  
  // Task definition
  type: 'opencode' | 'docker-op' | 'git-op';
  payload: {
    task: string;          // Task description for opencode
    context?: string;      // Additional context
  };
  
  // Worker tracking
  workerId?: string;       // Container ID once assigned
  workerPid?: number;      // PID inside worker
  
  // Results
  exitCode?: number;
  output?: string;         // Truncated output (last 10KB)
  error?: string;
  
  // Recovery info
  attempts: number;
  maxAttempts: number;     // Default: 3
  lastAttemptError?: string;
}
```

**Durability Guarantees:**
- Written atomically via temp file + rename
- Synced to disk before returning
- Survives container crashes
- Read on Syntropy startup to recover state

### 2. Worker Container Service

Add to `docker-compose.yml`:

```yaml
  # Worker template - not started by default
  # Syntropy spawns instances via docker compose run
  worker:
    build:
      context: ./syntropy-core
      dockerfile: Dockerfile.worker
    profiles:
      - worker  # Not started by default
    user: "1000:1000"
    group_add:
      - "${DOCKER_GID:-999}"
    volumes:
      - .:/pixel
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=production
      - PIXEL_ROOT=/pixel
      - HOME=/tmp
      - CI=true
      - OPENCODE_TELEMETRY_DISABLED=true
      # Task ID passed at runtime
      - TASK_ID=${TASK_ID}
    networks:
      - pixel-net
    # Ephemeral - no restart policy
    restart: "no"
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2"
```

### 3. Worker Dockerfile

`syntropy-core/Dockerfile.worker`:

```dockerfile
FROM oven/bun:1-slim

# Install Docker CLI and Opencode
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates curl git jq && \
    curl -fsSL https://get.docker.com | sh && \
    curl -fsSL https://get.opencode.ai | sh && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /pixel

# Entry point reads task from ledger and executes
COPY worker-entrypoint.sh /worker-entrypoint.sh
RUN chmod +x /worker-entrypoint.sh

ENTRYPOINT ["/worker-entrypoint.sh"]
```

### 4. Worker Entrypoint Script

`syntropy-core/worker-entrypoint.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Guardrails
FORBIDDEN_PATTERNS=(
  "docker compose.*syntropy.*build"
  "docker-compose.*syntropy.*build"
  "docker build.*syntropy"
  "docker compose up.*--build.*syntropy"
  "docker compose up -d --build"  # Catches rebuild-all
)

# Check if this is a deliberate syntropy-rebuild task
TASK_TYPE=$(echo "$TASK_JSON" | jq -r '.type // "opencode"')

check_forbidden() {
  local cmd="$1"
  
  # Allow syntropy rebuilds ONLY for syntropy-rebuild tasks
  if [[ "$TASK_TYPE" == "syntropy-rebuild" ]]; then
    echo "ℹ️  Syntropy rebuild allowed (deliberate self-rebuild task)"
    return 0
  fi
  
  for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if echo "$cmd" | grep -qiE "$pattern"; then
      echo "🚫 GUARDRAIL: Command would rebuild syntropy: $cmd"
      echo "Self-modification of the brain is prohibited in regular tasks."
      echo "Use scheduleSelfRebuild() for intentional updates."
      return 1
    fi
  done
  return 0
}

# Read task from ledger
TASK_ID="${TASK_ID:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: TASK_ID not set"
  exit 1
fi

LEDGER="/pixel/data/task-ledger.json"
TASK_JSON=$(jq -r ".tasks[] | select(.id == \"$TASK_ID\")" "$LEDGER")

if [[ -z "$TASK_JSON" ]]; then
  echo "ERROR: Task $TASK_ID not found in ledger"
  exit 1
fi

TASK_DESC=$(echo "$TASK_JSON" | jq -r '.payload.task')
TASK_CONTEXT=$(echo "$TASK_JSON" | jq -r '.payload.context // ""')

# Update ledger: mark as running
jq "(.tasks[] | select(.id == \"$TASK_ID\")).status = \"running\" | 
    (.tasks[] | select(.id == \"$TASK_ID\")).startedAt = \"$(date -Iseconds)\" |
    (.tasks[] | select(.id == \"$TASK_ID\")).workerId = \"$(hostname)\"" \
    "$LEDGER" > "$LEDGER.tmp" && mv "$LEDGER.tmp" "$LEDGER"

# Prepare briefing with guardrail instructions
BRIEFING="
CONTEXT BRIEFING:
- You are a worker for the Pixel ecosystem
- You can modify code, run tests, restart services
- CRITICAL GUARDRAIL: You MUST NOT rebuild the 'syntropy' service
  - Do NOT run: docker compose up -d --build (rebuilds everything including syntropy)
  - Instead use: docker compose up -d --build <service> (specific services only)
  - Valid services to rebuild: api, web, landing, agent, postgres, nginx
  - NEVER: docker compose up -d --build syntropy
  
YOUR TASK: $TASK_DESC

${TASK_CONTEXT:+ADDITIONAL CONTEXT: $TASK_CONTEXT}

When done, save a summary to /pixel/data/worker-output-$TASK_ID.txt
"

# Execute with opencode
echo "Starting Opencode execution..."
cd /pixel

OUTPUT_FILE="/pixel/data/worker-output-$TASK_ID.txt"
EXIT_CODE=0

opencode run "$BRIEFING" \
  -m "${OPENCODE_MODEL:-anthropic:claude-sonnet-4-20250514}" \
  --file /pixel/AGENTS.md \
  --file /pixel/CONTINUITY.md \
  2>&1 | tee "$OUTPUT_FILE" || EXIT_CODE=$?

# Update ledger with results
FINAL_STATUS="completed"
[[ $EXIT_CODE -ne 0 ]] && FINAL_STATUS="failed"

OUTPUT_TAIL=$(tail -c 10000 "$OUTPUT_FILE" 2>/dev/null || echo "")
OUTPUT_ESCAPED=$(echo "$OUTPUT_TAIL" | jq -Rs .)

jq "(.tasks[] | select(.id == \"$TASK_ID\")).status = \"$FINAL_STATUS\" | 
    (.tasks[] | select(.id == \"$TASK_ID\")).completedAt = \"$(date -Iseconds)\" |
    (.tasks[] | select(.id == \"$TASK_ID\")).exitCode = $EXIT_CODE |
    (.tasks[] | select(.id == \"$TASK_ID\")).output = $OUTPUT_ESCAPED" \
    "$LEDGER" > "$LEDGER.tmp" && mv "$LEDGER.tmp" "$LEDGER"

echo "Worker completed with exit code $EXIT_CODE"
exit $EXIT_CODE
```

---

## 🛡️ Guardrail System

> ⚠️ **Important Distinction**: The goal is NOT to prevent syntropy rebuilds entirely. 
> The goal is to prevent **accidental** syntropy rebuilds that kill the orchestrator mid-task.
> Syntropy CAN and SHOULD be rebuilt—but only through the **deliberate self-rebuild protocol**.

### What We're Preventing vs. Allowing

| Scenario | Allowed? | Why |
|----------|----------|-----|
| Worker runs `docker compose up -d --build` (rebuilds ALL) | ❌ NO | Kills Syntropy mid-task, loses state |
| Worker runs `docker compose up -d --build agent api` | ✅ YES | Specific services, Syntropy untouched |
| Worker runs `syntropy-rebuild` task with handoff protocol | ✅ YES | Deliberate, state saved, monitored |
| Opencode casually decides to "fix" syntropy | ❌ NO | Unplanned, no state preservation |

### Level 1: Prompt Engineering (Soft)
- Worker briefing forbids **casual** syntropy rebuilds
- Explicit exception: `syntropy-rebuild` task type bypasses guardrail
- Opencode sees clear instructions about the protocol

### Level 2: Shell Wrapper (Medium)
- Worker entrypoint wraps docker commands
- Regex patterns block dangerous commands **unless** task type is `syntropy-rebuild`
- Logs violations before blocking

### Level 3: Docker Socket Proxy (Hard)
Future enhancement: Use [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) to limit worker API access:

```yaml
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    environment:
      CONTAINERS: 1
      SERVICES: 1
      TASKS: 0
      NETWORKS: 0
      VOLUMES: 0
      IMAGES: 1
      # Block compose operations that touch syntropy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

---

## 🔄 Syntropy Tool Changes

Replace `delegateToOpencode` with `spawnWorker`:

```typescript
export const spawnWorker = tool({
  description: `Spawn an ephemeral worker container to execute a coding task.
  
The worker runs Opencode and has full access to the codebase and Docker.
It can rebuild services (except syntropy) and make code changes.

IMPORTANT: The worker is ephemeral. Monitor its status via checkWorkerStatus.
Results are stored in the task ledger at /pixel/data/task-ledger.json`,

  inputSchema: z.object({
    task: z.string().describe('Detailed technical instruction'),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
  }),

  execute: async ({ task, priority }) => {
    const taskId = crypto.randomUUID();
    
    // 1. Create task in ledger
    const ledger = await readTaskLedger();
    ledger.tasks.push({
      id: taskId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      type: 'opencode',
      payload: { task },
      attempts: 0,
      maxAttempts: 3,
    });
    await writeTaskLedger(ledger);
    
    // 2. Spawn worker container
    const containerName = `pixel-worker-${taskId.slice(0, 8)}`;
    const proc = spawn('docker', [
      'compose', 'run', '-d',
      '--name', containerName,
      '--rm',  // Auto-remove on exit
      '-e', `TASK_ID=${taskId}`,
      'worker'
    ], { cwd: PIXEL_ROOT });
    
    // 3. Return immediately - don't block
    return {
      taskId,
      containerName,
      status: 'spawned',
      message: 'Worker spawned. Use checkWorkerStatus to monitor progress.',
    };
  }
});

export const checkWorkerStatus = tool({
  description: 'Check the status of a worker task',
  
  inputSchema: z.object({
    taskId: z.string().describe('The task ID returned by spawnWorker'),
  }),
  
  execute: async ({ taskId }) => {
    const ledger = await readTaskLedger();
    const task = ledger.tasks.find(t => t.id === taskId);
    
    if (!task) {
      return { error: 'Task not found' };
    }
    
    // Check container status if running
    if (task.status === 'running' && task.workerId) {
      const containerStatus = await getContainerStatus(task.workerId);
      if (containerStatus.exited) {
        // Update ledger if container died unexpectedly
        task.status = containerStatus.exitCode === 0 ? 'completed' : 'failed';
        task.exitCode = containerStatus.exitCode;
        await writeTaskLedger(ledger);
      }
    }
    
    return {
      taskId: task.id,
      status: task.status,
      attempts: task.attempts,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      exitCode: task.exitCode,
      output: task.output?.slice(-2000), // Last 2KB
      error: task.error,
    };
  }
});
```

---

## 🚨 Failure Modes & Recovery

### Pitfall 1: Worker Hangs Forever
**Cause:** Opencode waiting for input, network timeout, infinite loop
**Mitigation:** 
- Hard timeout (45 min default) in worker entrypoint
- Syntropy checks `docker ps` for zombie workers
- Cleanup job runs every hour

```typescript
// In Syntropy startup
async function cleanupStaleWorkers() {
  const containers = await docker.listContainers({ all: true });
  const staleWorkers = containers.filter(c => 
    c.Names[0].startsWith('/pixel-worker-') &&
    c.Status.includes('Exited')
  );
  for (const worker of staleWorkers) {
    await docker.removeContainer(worker.Id);
  }
}
```

### Pitfall 2: Concurrent Workers Fight
**Cause:** Multiple workers editing same file
**Mitigation:**
- Single-flight lock at task creation level
- Only one worker can be `running` at a time
- New tasks queue as `pending`

### Pitfall 3: Worker Corrupts Codebase
**Cause:** Partial git commits, broken builds
**Mitigation:**
- Workers operate on branches, not main
- Syntropy reviews changes before merge
- Automatic rollback on test failures

```bash
# Worker creates feature branch
git checkout -b worker/$TASK_ID
# ... make changes ...
git commit -m "Worker $TASK_ID: $TASK_DESC"
# Syntropy reviews and merges (separate tool)
```

### Pitfall 4: Ledger Corruption
**Cause:** Concurrent writes, crash during write
**Mitigation:**
- File locking via `proper-lockfile`
- Atomic writes (temp file + rename)
- Backup before every write

### Pitfall 5: Docker Socket Abuse
**Cause:** Worker deletes critical containers
**Mitigation:**
- Guardrail patterns in entrypoint
- Future: docker-socket-proxy
- Audit log of all docker commands

### Pitfall 6: Worker Doesn't Complete
**Cause:** Killed by OOM, host restart
**Mitigation:**
- Syntropy checks for `running` tasks on startup
- Tasks with no container get marked `aborted`
- Retry logic with exponential backoff

```typescript
async function recoverOnStartup() {
  const ledger = await readTaskLedger();
  
  for (const task of ledger.tasks) {
    if (task.status === 'running') {
      // Check if container still exists
      const exists = await containerExists(task.workerId);
      if (!exists) {
        task.status = 'aborted';
        task.error = 'Worker container disappeared (possible crash/restart)';
        if (task.attempts < task.maxAttempts) {
          // Re-queue for retry
          task.attempts++;
          task.status = 'pending';
          delete task.workerId;
          delete task.startedAt;
        }
      }
    }
  }
  
  await writeTaskLedger(ledger);
}
```

---

## 🔄 Graceful Self-Rebuild Protocol

Syntropy **absolutely can and should** rebuild itself for updates. The key is doing it *deliberately* with proper handoff, not accidentally mid-task.

### Why This Works

```
ACCIDENTAL (Bad):
  Syntropy running → Opencode thinks "I'll rebuild everything" → Syntropy dies → 💀 Lost state

DELIBERATE (Good):
  Syntropy running → Decides it needs update → Saves state → Spawns worker → 
  Worker rebuilds syntropy → Worker monitors new instance → New Syntropy loads state → ✅ Continuity
```

### Full Self-Rebuild Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     SYNTROPY SELF-REBUILD TIMELINE                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  T+0:00  │ Syntropy decides update needed (code changed, bug fix, etc)  │
│          │ Calls scheduleSelfRebuild({ reason: "..." })                 │
│          │                                                               │
│  T+0:01  │ State saved to CONTINUITY.md:                                │
│          │   - Current cycle context                                     │
│          │   - Pending tasks                                             │
│          │   - Recent decisions                                          │
│          │   - Rebuild reason                                            │
│          │                                                               │
│  T+0:02  │ Task created in ledger with type: 'syntropy-rebuild'         │
│          │ (This special type bypasses guardrails)                      │
│          │                                                               │
│  T+0:03  │ Worker container spawned                                      │
│          │                                                               │
│  T+0:10  │ Worker: git pull && docker compose build syntropy            │
│          │                                                               │
│  T+2:00  │ Worker: docker compose up -d syntropy                        │
│          │ ⚡ OLD SYNTROPY PROCESS DIES HERE ⚡                          │
│          │                                                               │
│  T+2:05  │ Worker: polling http://syntropy:3000/health                  │
│          │                                                               │
│  T+2:30  │ NEW SYNTROPY starts up                                        │
│          │   - Reads CONTINUITY.md                                       │
│          │   - Loads task ledger                                         │
│          │   - Sees syntropy-rebuild task as 'running'                  │
│          │                                                               │
│  T+2:45  │ Health check passes, Worker exits with code 0                │
│          │                                                               │
│  T+2:46  │ New Syntropy updates ledger: task 'completed'                │
│          │ Resumes normal operations with full context                   │
│          │                                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

### The Protocol

When Syntropy needs to update itself:

1. **Save State**: Write `CONTINUITY.md` with full context
2. **Queue Task**: Create ledger entry with `syntropy-rebuild` type
3. **Spawn Worker**: Worker performs the rebuild
4. **Monitor Externally**: Worker watches for new Syntropy to come up
5. **Handoff**: New Syntropy reads ledger, resumes operations

```typescript
export const scheduleSelfRebuild = tool({
  description: `Schedule Syntropy to rebuild itself. This is the ONLY safe way to update Syntropy.
  
The process:
1. Current state is saved to CONTINUITY.md and task ledger
2. A special 'syntropy-rebuild' worker task is created (bypasses guardrails)
3. Worker pulls latest code, rebuilds syntropy, monitors health
4. New Syntropy instance reads saved state and resumes
5. Worker exits after confirming handoff

Use this when: syntropy-core code has changed and needs deployment.`,
  
  inputSchema: z.object({
    reason: z.string().describe('Why the rebuild is needed'),
    gitRef: z.string().optional().describe('Git ref to checkout (default: current branch)'),
  }),
  
  execute: async ({ reason, gitRef }) => {
    // 1. Save current state to CONTINUITY.md
    await saveContinuityState({
      rebuildReason: reason,
      savedAt: new Date().toISOString(),
      currentTasks: await readTaskLedger(),
    });
    
    // 2. Create rebuild task with special type
    const taskId = crypto.randomUUID();
    await createTask({
      id: taskId,
      type: 'syntropy-rebuild',  // ← This bypasses guardrails
      payload: {
        task: `
          SYNTROPY SELF-REBUILD PROTOCOL
          Reason: ${reason}
          
          Steps:
          1. cd /pixel && git fetch origin
          2. ${gitRef ? `git checkout ${gitRef}` : 'git pull'}
          3. docker compose build syntropy
          4. docker compose up -d syntropy
          5. Wait up to 5 minutes for health: 
             while ! curl -sf http://syntropy:3000/health; do sleep 10; done
          6. If healthy within 5 min: exit 0 (success)
          7. If NOT healthy: 
             - docker compose logs syntropy --tail=100
             - Rollback: docker compose up -d syntropy (uses cached image)
             - exit 1 (failure, will retry)
          
          The new Syntropy will read CONTINUITY.md to restore context.
        `,
        context: `Rebuild triggered at ${new Date().toISOString()}. Reason: ${reason}`
      }
    });
    
    // 3. Log the scheduled rebuild
    await logAudit({ 
      type: 'syntropy_rebuild_scheduled', 
      taskId, 
      reason,
      gitRef 
    });
    
    return {
      scheduled: true,
      taskId,
      message: `Self-rebuild scheduled (task ${taskId.slice(0,8)}). Syntropy will be restarted when worker executes.`,
      warning: 'Current process will be replaced. State saved to CONTINUITY.md.',
    };
  }
});
```

---

## 📊 Monitoring Dashboard

Add to Syntropy cycle output:

```typescript
async function logSystemStatus() {
  const ledger = await readTaskLedger();
  const workers = await docker.listContainers({ 
    filters: { name: ['pixel-worker'] }
  });
  
  console.log('[SYNTROPY] System Status:');
  console.log(`  Tasks: ${ledger.tasks.length} total`);
  console.log(`    Pending: ${ledger.tasks.filter(t => t.status === 'pending').length}`);
  console.log(`    Running: ${ledger.tasks.filter(t => t.status === 'running').length}`);
  console.log(`    Completed: ${ledger.tasks.filter(t => t.status === 'completed').length}`);
  console.log(`    Failed: ${ledger.tasks.filter(t => t.status === 'failed').length}`);
  console.log(`  Active Workers: ${workers.length}`);
}
```

---

## 🚀 Implementation Phases

### Phase 1: Minimum Viable Worker (MVP)
1. ✅ Task ledger file format
2. ✅ Worker Dockerfile
3. ✅ Worker entrypoint with guardrails
4. ✅ `spawnWorker` tool
5. ✅ `checkWorkerStatus` tool
6. ✅ Startup recovery

### Phase 2: Robustness
1. File locking for ledger
2. Cleanup stale workers job
3. Retry logic with backoff
4. Output streaming to logs

### Phase 3: Advanced
1. Docker socket proxy
2. Branch-based isolation
3. Self-rebuild protocol
4. Web UI for task monitoring

---

## 📝 Configuration

Environment variables:

```env
# Worker defaults
WORKER_TIMEOUT_MS=2700000        # 45 minutes
WORKER_MAX_ATTEMPTS=3
WORKER_MEMORY_LIMIT=4g

# Opencode in worker
OPENCODE_MODEL=anthropic:claude-sonnet-4-20250514
OPENCODE_TELEMETRY_DISABLED=true

# Syntropy
SYNTROPY_MAX_CONCURRENT_WORKERS=1  # Start conservative
SYNTROPY_WORKER_POLL_INTERVAL=30000  # 30s
```

---

## 🎯 Success Criteria

1. **No Accidental Self-Destruction**: Syntropy never loses state due to *unplanned* rebuild
2. **Deliberate Self-Rebuild Works**: `scheduleSelfRebuild()` successfully updates Syntropy with full state handoff
3. **Task Durability**: Tasks survive container restarts
4. **Observable**: Full audit trail of worker activities
5. **Recoverable**: Startup handles all edge cases (crashed workers, interrupted rebuilds)
6. **Safe**: Guardrails prevent catastrophic operations while allowing intentional ones

---

## 🔑 Key Insight

The architecture isn't about *preventing* evolution—it's about making evolution **safe and deliberate**.

| Without This Architecture | With This Architecture |
|---------------------------|------------------------|
| "Oops, I rebuilt myself mid-task" | "I scheduled a rebuild with proper handoff" |
| State lost on every update | State persists through updates |
| Partial changes, broken deploys | Atomic updates with rollback |
| No idea what happened | Full audit trail |

**The brain can absolutely upgrade itself—it just needs to do it consciously, not accidentally.**

---

*"The brain doesn't need to touch its own neurons to think. Syntropy doesn't need to rebuild itself to evolve."*

— Architecture Design, v1.0
