/**
 * Heap Spike Watchdog — monitors process memory and mitigates sudden jumps
 *
 * Project: project-heap-spike-watchdog
 *
 * What it does:
 *   1. Samples process.memoryUsage() on a fixed interval (default 30s).
 *   2. Maintains a rolling baseline (low-watermark of recent samples).
 *   3. When heapUsed spikes >SPIKE_THRESHOLD_PCT relative to the baseline
 *      (default 20%), it:
 *        - logs + audits the event
 *        - alerts the owner via alertOwner() (deduplicated)
 *        - runs mitigation: tries global.gc() if exposed, and clears
 *          known in-process caches that opt in via registerClearableCache()
 *   4. Tracks RSS ceiling; if RSS crosses RSS_DANGER_BYTES and keeps
 *      growing across consecutive samples, flags a critical pressure event
 *      so the operator can act (no auto-restart — that's a bigger decision).
 *
 * Design notes:
 *   - Non-fatal. Every error path is swallowed; the watchdog must never
 *     take the process down — it observes and softens, it doesn't kill.
 *   - Conservative baseline: uses the minimum recent heap as the reference
 *     so noise above the floor doesn't mask real spikes.
 *   - Mitigation is best-effort: Bun does not expose global.gc() without
 *     --expose-gc, so cache clearing is the primary lever.
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
const SPIKE_COOLDOWN_MS = 5 * 60 * 1000;    // don't re-alert within 5 minutes
const PRESSURE_COOLDOWN_MS = 15 * 60 * 1000;// critical pressure re-alert window
const RSS_DANGER_BYTES = 380 * 1024 * 1024; // 380MB — close to 512MB cgroup limit
const PRESSURE_CONSECUTIVE_SAMPLES = 3;     // must be sustained across N samples
const MAX_HISTORY = 60;                     // keep last 60 samples in state file

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

// Registered clearable caches for mitigation
type ClearableCache = { name: string; clear: () => void };
const clearableCaches: ClearableCache[] = [];

// Counters surfaced via getHeapWatchdogStatus
let spikesDetected = 0;
let mitigationsTriggered = 0;
let pressureEvents = 0;

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
 *
 * Why max-of-recent (not median/min):
 *   - V8 heap grows monotonically between GC cycles, so comparing against
 *     median or min produces false positives during normal operation.
 *   - Using max-of-recent means gradual growth (a few % per sample) never
 *     trips the threshold, because each new sample is only slightly above
 *     the previous max.
 *   - A genuine sudden jump (>20% above anything seen recently) fires.
 */
function referenceHeap(): number | null {
  // Exclude the last sample (just pushed); use up to REFERENCE_WINDOW before it
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

  // Try to clear registered in-process caches
  for (const cache of clearableCaches) {
    try {
      cache.clear();
      cleared.push(cache.name);
    } catch (err: any) {
      console.error(`[heap-watchdog] Failed to clear cache ${cache.name}:`, err.message);
    }
  }

  // Try manual GC if Bun was started with --expose-gc
  const gc = (global as any).gc;
  if (typeof gc === "function") {
    try {
      gc();
      cleared.push("global.gc()");
    } catch (err: any) {
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

async function evaluate(): Promise<void> {
  if (!running) return;
  const sample = takeSample();
  samples.push(sample);
  if (samples.length > MAX_HISTORY) samples = samples.slice(-MAX_HISTORY);

  const reference = referenceHeap();
  const prev = lastSample();

  // --- Spike detection (>20% jump over recent high-water mark) ---
  if (reference !== null && reference > 0) {
    const jumpPct = ((sample.heapUsed - reference) / reference) * 100;
    if (jumpPct > SPIKE_THRESHOLD_PCT) {
      spikesDetected++;
      const now = Date.now();
      const mb = (n: number) => Math.round(n / 1024 / 1024);
      const msg = `Heap spike +${jumpPct.toFixed(0)}% — ${mb(sample.heapUsed)}MB used vs ${mb(reference)}MB recent-peak (RSS ${mb(sample.rss)}MB)`;
      console.warn(`[heap-watchdog] ${msg}`);
      audit("heap_spike", msg, {
        heapUsedMb: mb(sample.heapUsed),
        referenceMb: mb(reference),
        jumpPct: Math.round(jumpPct),
        rssMb: mb(sample.rss),
      });
      runMitigation("spike");
      if (now - lastSpikeAlertAt > SPIKE_COOLDOWN_MS) {
        lastSpikeAlertAt = now;
        alertOwner("error", msg, {
          heapUsedMb: mb(sample.heapUsed),
          referenceMb: mb(reference),
          jumpPct: Math.round(jumpPct),
        }).catch(() => {});
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
    pressureStreak = 0; // reset so we don't fire every sample
    if (now - lastPressureAlertAt > PRESSURE_COOLDOWN_MS) {
      lastPressureAlertAt = now;
      alertOwner("error", msg + " — consider restarting Pixel if it persists", {
        rssMb: mb(sample.rss),
      }).catch(() => {});
    }
  }

  // Persist state every few samples (cheap, survives restarts)
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
  // Prime with an initial sample so we have a baseline quickly
  samples.push(takeSample());
  console.log(
    `[heap-watchdog] Starting (sample every ${SAMPLE_INTERVAL_MS / 1000}s, spike threshold +${SPIKE_THRESHOLD_PCT}%, ` +
    `RSS danger ${Math.round(RSS_DANGER_BYTES / 1024 / 1024)}MB, ${clearableCaches.length} clearable caches)`
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
    spikesDetected,
    mitigationsTriggered,
    pressureEvents,
    pressureStreak,
    registeredCaches: clearableCaches.map((c) => c.name),
    sampleCount: samples.length,
  };
}

/** Force an immediate evaluation cycle (for testing / manual trigger). */
export async function forceHeapEvaluation(): Promise<void> {
  await evaluate();
}
