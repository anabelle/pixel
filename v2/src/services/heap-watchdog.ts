/**
 * Heap Spike Watchdog — monitors process memory and mitigates sudden jumps
 *
 * Project: project-heap-spike-watchdog
 *
 * What it does:
 *   1. Samples process.memoryUsage() on a fixed interval (default 30s).
 *   2. Maintains a rolling baseline (max-of-recent window).
 *   3. When heapUsed spikes >SPIKE_THRESHOLD_PCT relative to the reference
 *      (default 20%), it:
 *        - logs + audits the event (always — for observability)
 *        - runs mitigation: tries global.gc() if exposed, and clears
 *          known in-process caches
 *        - alerts owner ONLY when the spike is non-transient:
 *             * heap does NOT recover within one sample after mitigation, OR
 *             * RSS exceeds RSS_CRITICAL_BYTES (400MB+), OR
 *             * spike frequency exceeds SPIKES_PER_HOUR_THRESHOLD (leak pattern)
 *
 * Design notes:
 *   - Non-fatal. Every error path is swallowed; the watchdog must never
 *     take the process down — it observes and softens, it doesn't kill.
 *   - Mitigation is best-effort: Bun does not expose global.gc() without
 *     --expose-gc, so cache clearing is the primary lever.
 *   - Alert policy is intentionally conservative: transient spikes that
 *     auto-recover are logged and audited but do NOT notify the owner.
 */

import { audit } from "./audit.js";
import { alertOwner } from "./digest.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ============================================================
// Configuration
// ============================================================

const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const STATE_PATH = join(DATA_DIR, "heap-watchdog.json");

const SAMPLE_INTERVAL_MS = 30_000;          // 30 seconds
const SPIKE_THRESHOLD_PCT = 20;             // >20% jump over reference = spike
const REFERENCE_WINDOW = 8;                 // compare against max of last N samples (excluding current)
const BASELINE_WINDOW = 20;                 // window for reporting median in status
const SPIKE_ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between owner alerts for sustained spikes
const PRESSURE_COOLDOWN_MS = 15 * 60 * 1000;// critical pressure re-alert window
const RSS_DANGER_BYTES = 380 * 1024 * 1024; // 380MB — close to 512MB cgroup limit
const RSS_CRITICAL_BYTES = 400 * 1024 * 1024; // 400MB — always alert regardless of recovery
const PRESSURE_CONSECUTIVE_SAMPLES = 3;     // must be sustained across N samples
const MAX_HISTORY = 60;                     // keep last 60 samples in state file

// Alert policy: transient spikes that auto-recover are noise.
// Only alert when one of these conditions is met:
//   1. Spike did NOT recover after mitigation (heap still elevated next sample)
//   2. RSS crossed the critical threshold (400MB+)
//   3. Spike frequency indicates a leak pattern (N+ spikes in 1h)
const SPIKE_RECOVERY_CHECK_PCT = 10;        // if heap is still >10% above reference after mitigation = not recovered
const SPIKES_PER_HOUR_THRESHOLD = 6;        // 6+ spikes in 60 min = leak pattern, alert

// ============================================================
// State
// ============================================================

type Sample = { ts: number; rss: number; heapUsed: number; heapTotal: number; external: number };

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let samples: Sample[] = [];
let lastSpikeAlertAt = 0;
let lastPressureAlertAt = 0;
let pressureStreak = 0;
let initialized = false;

// Track the last spike for recovery checking
type PendingSpike = {
  detectedAtTs: number;       // wall-clock time of spike detection
  detectedAtSampleTs: number; // sample timestamp
  heapUsedAtSpike: number;
  referenceHeap: number;
  jumpPct: number;
};
let pendingSpike: PendingSpike | null = null;

// Spike timestamp history for frequency-based alerting
let recentSpikeTimes: number[] = [];

// Registered clearable caches for mitigation
type ClearableCache = { name: string; clear: () => void };
const clearableCaches: ClearableCache[] = [];

// Counters surfaced via getHeapWatchdogStatus
let spikesDetected = 0;
let mitigationsTriggered = 0;
let pressureEvents = 0;
let ownerAlertsSuppressed = 0;

// ============================================================
// Persistence
// ============================================================

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadState(): void {
  if (initialized) return;
  initialized = true;
  try {
    if (existsSync(STATE_PATH)) {
      const raw = readFileSync(STATE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      samples = Array.isArray(parsed.samples) ? parsed.samples.slice(-MAX_HISTORY) : [];
      spikesDetected = Number(parsed.spikesDetected) || 0;
      mitigationsTriggered = Number(parsed.mitigationsTriggered) || 0;
      pressureEvents = Number(parsed.pressureEvents) || 0;
      ownerAlertsSuppressed = Number(parsed.ownerAlertsSuppressed) || 0;
    }
  } catch {
    samples = [];
  }
}

function saveState(): void {
  ensureDataDir();
  try {
    writeFileSync(
      STATE_PATH,
      JSON.stringify({
        samples: samples.slice(-MAX_HISTORY),
        spikesDetected,
        mitigationsTriggered,
        pressureEvents,
        ownerAlertsSuppressed,
        updatedAt: new Date().toISOString(),
      }, null, 2),
      "utf-8"
    );
  } catch (err: any) {
    console.error("[heap-watchdog] Failed to save state:", err.message);
  }
}

// ============================================================
// Core logic
// ============================================================

function takeSample(): Sample {
  const m = process.memoryUsage();
  return {
    ts: Date.now(),
    rss: m.rss,
    heapUsed: m.heapUsed,
    heapTotal: m.heapTotal,
    external: m.external,
  };
}

/**
 * Compute the reference heap as the MAX of the last N samples (excluding
 * the current one just pushed). A spike is defined as exceeding this
 * recent high-water mark by >20%.
 */
function referenceHeap(): number | null {
  if (samples.length < 4) return null;
  const window = samples.slice(-REFERENCE_WINDOW - 1, -1);
  if (window.length === 0) return null;
  return Math.max(...window.map((s) => s.heapUsed));
}

function lastSample(): Sample | null {
  return samples.length > 0 ? samples[samples.length - 1] : null;
}

/**
 * Run mitigation steps after a spike is detected.
 * Best-effort; never throws.
 */
function runMitigation(reason: string): void {
  mitigationsTriggered++;
  const cleared: string[] = [];

  for (const cache of clearableCaches) {
    try {
      cache.clear();
      cleared.push(cache.name);
    } catch (err: any) {
      console.error(`[heap-watchdog] Failed to clear cache ${cache.name}:`, err.message);
    }
  }

  const gc = (global as any).gc;
  if (typeof gc === "function") {
    try {
      gc();
      cleared.push("global.gc()");
    } catch {
      // ignore
    }
  }

  audit(
    "heap_mitigation",
    `Heap mitigation (${reason}) — cleared: ${cleared.length ? cleared.join(", ") : "(none registered)"}`,
    { reason, clearedCaches: cleared }
  );
  console.log(`[heap-watchdog] Mitigation (${reason}) — cleared: ${cleared.join(", ") || "(none)"}`);
}

/**
 * Count spikes in the last hour from the recentSpikeTimes array.
 * Prunes entries older than 1 hour.
 */
function countSpikesInLastHour(): number {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  recentSpikeTimes = recentSpikeTimes.filter((ts) => ts > oneHourAgo);
  return recentSpikeTimes.length;
}

/**
 * Check whether a pending spike has recovered. Called on the sample AFTER
 * a spike was detected and mitigated. If heap is still elevated, the spike
 * is non-transient and the owner should be alerted.
 */
function checkPendingSpikeRecovery(currentSample: Sample): void {
  if (!pendingSpike) return;
  const spike = pendingSpike;
  pendingSpike = null; // consume it regardless

  const mb = (n: number) => Math.round(n / 1024 / 1024);
  const stillElevatedPct = ((currentSample.heapUsed - spike.referenceHeap) / spike.referenceHeap) * 100;

  if (stillElevatedPct > SPIKE_RECOVERY_CHECK_PCT) {
    // Spike did NOT recover after mitigation — alert owner
    const now = Date.now();
    if (now - lastSpikeAlertAt > SPIKE_ALERT_COOLDOWN_MS) {
      lastSpikeAlertAt = now;
      const msg = `Heap did not recover after spike — ${mb(currentSample.heapUsed)}MB still +${stillElevatedPct.toFixed(0)}% above ${mb(spike.referenceHeap)}MB baseline (RSS ${mb(currentSample.rss)}MB)`;
      alertOwner("error", msg, {
        heapUsedMb: mb(currentSample.heapUsed),
        referenceMb: mb(spike.referenceHeap),
        stillElevatedPct: Math.round(stillElevatedPct),
      }).catch(() => {});
      audit("heap_spike_alert", msg, { reason: "non-recovering", originalJumpPct: Math.round(spike.jumpPct) });
    }
  } else {
    // Spike recovered — transient, no owner alert needed
    ownerAlertsSuppressed++;
    console.log(`[heap-watchdog] Spike recovered — ${mb(currentSample.heapUsed)}MB (was ${mb(spike.heapUsedAtSpike)}MB, now +${stillElevatedPct.toFixed(0)}% above baseline)`);
  }
}

async function evaluate(): Promise<void> {
  if (!running) return;
  const sample = takeSample();
  samples.push(sample);
  if (samples.length > MAX_HISTORY) samples = samples.slice(-MAX_HISTORY);

  // Check if a previous spike recovered (before processing new spike detection)
  checkPendingSpikeRecovery(sample);

  const reference = referenceHeap();
  const prev = lastSample();

  // --- Spike detection (>20% jump over recent high-water mark) ---
  if (reference !== null && reference > 0) {
    const jumpPct = ((sample.heapUsed - reference) / reference) * 100;
    if (jumpPct > SPIKE_THRESHOLD_PCT) {
      spikesDetected++;
      const now = Date.now();
      const mb = (n: number) => Math.round(n / 1024 / 1024);
      recentSpikeTimes.push(now);

      const msg = `Heap spike +${jumpPct.toFixed(0)}% — ${mb(sample.heapUsed)}MB used vs ${mb(reference)}MB recent-peak (RSS ${mb(sample.rss)}MB)`;
      console.warn(`[heap-watchdog] ${msg}`);
      audit("heap_spike", msg, {
        heapUsedMb: mb(sample.heapUsed),
        referenceMb: mb(reference),
        jumpPct: Math.round(jumpPct),
        rssMb: mb(sample.rss),
      });

      // Always run mitigation (clears caches)
      runMitigation("spike");

      // Stage the spike for recovery check on next sample
      pendingSpike = {
        detectedAtTs: now,
        detectedAtSampleTs: sample.ts,
        heapUsedAtSpike: sample.heapUsed,
        referenceHeap: reference,
        jumpPct,
      };

      // Immediate alert conditions (don't wait for recovery check):
      // 1. RSS is at critical level (400MB+)
      if (sample.rss >= RSS_CRITICAL_BYTES) {
        const alertMsg = `Critical memory — RSS ${mb(sample.rss)}MB during heap spike (+${jumpPct.toFixed(0)}%)`;
        if (now - lastSpikeAlertAt > SPIKE_ALERT_COOLDOWN_MS) {
          lastSpikeAlertAt = now;
          alertOwner("error", alertMsg, { rssMb: mb(sample.rss), jumpPct: Math.round(jumpPct) }).catch(() => {});
          audit("heap_spike_alert", alertMsg, { reason: "critical_rss" });
        }
      }

      // 2. High spike frequency = leak pattern
      const spikesInHour = countSpikesInLastHour();
      if (spikesInHour >= SPIKES_PER_HOUR_THRESHOLD) {
        const alertMsg = `Heap leak pattern — ${spikesInHour} spikes in the last hour (latest +${jumpPct.toFixed(0)}%)`;
        if (now - lastSpikeAlertAt > SPIKE_ALERT_COOLDOWN_MS) {
          lastSpikeAlertAt = now;
          alertOwner("error", alertMsg, { spikesInHour, jumpPct: Math.round(jumpPct) }).catch(() => {});
          audit("heap_spike_alert", alertMsg, { reason: "leak_pattern", spikesInHour });
        }
      } else {
        // Transient spike — logged and mitigated, but no owner notification.
        // Recovery will be verified on next sample.
        ownerAlertsSuppressed++;
      }
    }
  }

  // --- Critical RSS pressure (sustained near cgroup limit) ---
  if (prev && sample.rss >= RSS_DANGER_BYTES && prev.rss >= RSS_DANGER_BYTES) {
    pressureStreak++;
  } else {
    pressureStreak = 0;
  }

  if (pressureStreak >= PRESSURE_CONSECUTIVE_SAMPLES) {
    pressureEvents++;
    const now = Date.now();
    const mb = (n: number) => Math.round(n / 1024 / 1024);
    const msg = `Memory pressure — RSS ${mb(sample.rss)}MB sustained near limit`;
    console.warn(`[heap-watchdog] ${msg} (streak ${pressureStreak})`);
    audit("heap_pressure", msg, {
      rssMb: mb(sample.rss),
      heapUsedMb: mb(sample.heapUsed),
      streak: pressureStreak,
    });
    runMitigation("pressure");
    pressureStreak = 0;
    if (now - lastPressureAlertAt > PRESSURE_COOLDOWN_MS) {
      lastPressureAlertAt = now;
      alertOwner("error", msg + " — consider restarting Pixel if it persists", {
        rssMb: mb(sample.rss),
      }).catch(() => {});
    }
  }

  // Persist state every few samples
  if (samples.length % 5 === 0) saveState();
}

function scheduleNext(): void {
  if (!running) return;
  timer = setTimeout(async () => {
    try {
      await evaluate();
    } catch (err: any) {
      console.error("[heap-watchdog] Evaluation error:", err.message);
    }
    scheduleNext();
  }, SAMPLE_INTERVAL_MS);
}

// ============================================================
// Public API
// ============================================================

/**
 * Register a clearable in-process cache so the watchdog can drop it
 * during heap-spike mitigation. The clear() callback must be safe to
 * call repeatedly.
 */
export function registerClearableCache(name: string, clear: () => void): void {
  if (clearableCaches.some((c) => c.name === name)) return;
  clearableCaches.push({ name, clear });
}

/** Start the watchdog. */
export function startHeapWatchdog(): void {
  if (running) return;
  running = true;
  loadState();
  samples.push(takeSample());
  console.log(
    `[heap-watchdog] Starting (sample every ${SAMPLE_INTERVAL_MS / 1000}s, spike threshold +${SPIKE_THRESHOLD_PCT}%, ` +
    `RSS danger ${Math.round(RSS_DANGER_BYTES / 1024 / 1024)}MB, critical ${Math.round(RSS_CRITICAL_BYTES / 1024 / 1024)}MB, ` +
    `${clearableCaches.length} clearable caches)`
  );
  scheduleNext();
}

/** Stop the watchdog. */
export function stopHeapWatchdog(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  saveState();
  console.log("[heap-watchdog] Stopped");
}

/** Get watchdog status for /health and dashboard. */
export function getHeapWatchdogStatus() {
  const current = lastSample();
  const reference = referenceHeap();
  const mb = (n: number | undefined) => (n !== undefined && n !== null ? Math.round(n / 1024 / 1024) : null);
  return {
    running,
    currentHeapUsedMb: mb(current?.heapUsed),
    currentRssMb: mb(current?.rss),
    referenceHeapMb: mb(reference ?? undefined),
    spikeThresholdPct: SPIKE_THRESHOLD_PCT,
    rssDangerMb: Math.round(RSS_DANGER_BYTES / 1024 / 1024),
    rssCriticalMb: Math.round(RSS_CRITICAL_BYTES / 1024 / 1024),
    spikesDetected,
    mitigationsTriggered,
    pressureEvents,
    pressureStreak,
    ownerAlertsSuppressed,
    spikesInLastHour: countSpikesInLastHour(),
    spikeFrequencyThreshold: SPIKES_PER_HOUR_THRESHOLD,
    pendingSpikeRecovery: !!pendingSpike,
    registeredCaches: clearableCaches.map((c) => c.name),
    sampleCount: samples.length,
  };
}

/** Force an immediate evaluation cycle (for testing / manual trigger). */
export async function forceHeapEvaluation(): Promise<void> {
  await evaluate();
}
