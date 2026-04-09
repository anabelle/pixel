import { audit } from "./audit.js";

const DREAM_CYCLE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DREAM_CYCLE_STARTUP_DELAY_MS = 6 * 60 * 1000;

let running = false;
let dreamCycleTimer: ReturnType<typeof setTimeout> | null = null;

// Late-bound reference to avoid circular imports.
let _promptWithHistory: ((options: any, message: string) => Promise<string>) | null = null;

async function getPromptWithHistory() {
  if (!_promptWithHistory) {
    const mod = await import("../agent.js");
    _promptWithHistory = mod.promptWithHistory;
  }
  return _promptWithHistory;
}

function scheduleNextDreamCycle(delayMs: number = DREAM_CYCLE_INTERVAL_MS): void {
  if (!running) return;
  if (dreamCycleTimer) clearTimeout(dreamCycleTimer);
  dreamCycleTimer = setTimeout(() => {
    void runDreamCycleTick();
  }, Math.max(1_000, delayMs));
}

async function runDreamCycleTick(): Promise<void> {
  if (!running) return;
  scheduleNextDreamCycle();
  await triggerDreamCycle();
}

export async function triggerDreamCycle(): Promise<string> {
  try {
    const promptWithHistory = await getPromptWithHistory();
    const response = await promptWithHistory(
      { userId: "pixel-self", platform: "internal", chatId: "" },
      "dream cycle"
    );

    const silent = response?.includes("[SILENT]") ?? false;
    audit("tool_use", `Dream cycle triggered (silent=${silent})`, {
      responseLength: response?.length ?? 0,
      silent,
    });
    if (!silent && response) {
      console.log(`[dream-cycle] Pixel response: ${response.slice(0, 200)}...`);
    } else {
      console.log("[dream-cycle] Completed silently");
    }
    return response ?? "";
  } catch (err: any) {
    console.error(`[dream-cycle] Trigger failed: ${err.message}`);
    audit("tool_use", `Dream cycle failed: ${err.message}`, { error: err.message });
    return "";
  }
}

export function startDreamCycle(): void {
  if (running) return;
  running = true;
  console.log(`[dream-cycle] Starting (first cycle in ~${Math.round(DREAM_CYCLE_STARTUP_DELAY_MS / 60_000)} minutes)`);
  scheduleNextDreamCycle(DREAM_CYCLE_STARTUP_DELAY_MS);
}

export function stopDreamCycle(): void {
  running = false;
  if (dreamCycleTimer) {
    clearTimeout(dreamCycleTimer);
    dreamCycleTimer = null;
  }
  console.log("[dream-cycle] Stopped");
}

export function getDreamCycleStatus() {
  return {
    running,
    intervalHours: DREAM_CYCLE_INTERVAL_MS / (60 * 60 * 1000),
  };
}
