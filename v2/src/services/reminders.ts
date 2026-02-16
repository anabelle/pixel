/**
 * Reminder Service — Reliable Alarm Clock for Pixel
 *
 * The scheduler is dumb: it stores raw user intent + due time.
 * Pixel is smart: it interprets the message at fire time.
 */

import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, eq, and, or, lte, isNull, desc, inArray } from "drizzle-orm";
import { reminders } from "../db.js";
import type * as schema from "../db.js";
import { sendTelegramMessage } from "../connectors/telegram.js";
import { sendWhatsAppMessage } from "../connectors/whatsapp.js";
import { sendNostrDm } from "../connectors/nostr.js";
import { audit } from "./audit.js";

// Late-bound reference to promptWithHistory to avoid circular import
// (agent.ts imports from reminders.ts, reminders.ts needs agent.ts)
let _promptWithHistory: ((options: any, message: string) => Promise<string>) | null = null;

async function getPromptWithHistory() {
  if (!_promptWithHistory) {
    const mod = await import("../agent.js");
    _promptWithHistory = mod.promptWithHistory;
  }
  return _promptWithHistory;
}

// Will be set by initReminders() from index.ts
let db: PostgresJsDatabase<typeof schema> | null = null;

/** Initialize the reminder service with a database connection */
export function initReminders(database: PostgresJsDatabase<typeof schema>): void {
  db = database;
  console.log("[reminders] Reminder service initialized");

  // Quick read test to fail fast on permission issues
  db.select().from(reminders).limit(1)
    .then(() => {
      console.log("[reminders] Database read check OK");
    })
    .catch((err: any) => {
      console.error("[reminders] Database read check FAILED:", err?.message ?? err);
    });
}

// No grace period — fire only when due_at <= now
// (Previously 1 hour, which caused alarms to fire immediately)

// In-memory set of reminder IDs currently being fired — prevents the same
// scheduler tick's Promise.allSettled from double-claiming, AND prevents
// overlapping ticks from racing on the same ID before the DB claim lands.
const firingInProgress = new Set<number>();

export interface ReminderInput {
  userId: string;
  platform: string;
  platformChatId?: string;
  rawMessage: string;
  dueAt: Date;
  repeatPattern?: string | null;
  repeatCount?: number | null;
  firesRemaining?: number | null;
}

export interface ReminderRecord extends ReminderInput {
  id: number;
  status: string;
  createdAt: Date;
  lastFiredAt: Date | null;
}

/** Store a new reminder */
export async function storeReminder(input: ReminderInput): Promise<ReminderRecord> {
  if (!db) throw new Error("Reminders service not initialized");

  const [created] = await db.insert(reminders).values({
    userId: input.userId,
    platform: input.platform,
    platformChatId: input.platformChatId ?? null,
    rawMessage: input.rawMessage,
    dueAt: input.dueAt,
    repeatPattern: input.repeatPattern ?? null,
    repeatCount: input.repeatCount ?? null,
    firesRemaining: input.firesRemaining ?? (input.repeatCount ?? null),
    status: "active",
  }).returning();

  audit("reminder", `Created reminder ${created.id} for ${input.userId} on ${input.platform}: "${input.rawMessage}" due ${input.dueAt.toISOString()}`);
  return created as ReminderRecord;
}

/** List active reminders for a user */
export async function listReminders(userId: string, platform: string): Promise<ReminderRecord[]> {
  if (!db) {
    console.error("[reminders] ERROR: Database not initialized — cannot list reminders");
    throw new Error("Reminders service not initialized");
  }

  const results = await db.select().from(reminders)
    .where(and(
      eq(reminders.userId, userId),
      eq(reminders.platform, platform),
      eq(reminders.status, "active")
    ))
    .orderBy(desc(reminders.dueAt));

  return results as ReminderRecord[];
}

/** List reminders for a user with status filters + pagination */
export async function listRemindersAdvanced(
  userId: string,
  platform: string,
  options?: { statuses?: string[]; limit?: number; offset?: number; platformChatId?: string }
): Promise<ReminderRecord[]> {
  if (!db) {
    console.error("[reminders] ERROR: Database not initialized — cannot list reminders");
    throw new Error("Reminders service not initialized");
  }

  const statuses = options?.statuses?.length ? options.statuses : ["active"];
  const baseConditions = [
    eq(reminders.userId, userId),
    eq(reminders.platform, platform),
  ];
  
  // Use inArray only when multiple statuses; use eq for single status to avoid Drizzle parameterization issues
  if (statuses.length === 1) {
    baseConditions.push(eq(reminders.status, statuses[0]));
  } else {
    baseConditions.push(inArray(reminders.status, statuses));
  }
  
  if (options?.platformChatId) {
    baseConditions.push(eq(reminders.platformChatId, options.platformChatId));
  }

  let query = db.select().from(reminders)
    .where(and(...baseConditions))
    .orderBy(desc(reminders.dueAt));

  if (typeof options?.limit === "number") {
    query = query.limit(options.limit);
  }
  if (typeof options?.offset === "number") {
    query = query.offset(options.offset);
  }

  const results = await query;
  return results as ReminderRecord[];
}

/** Cancel a reminder (soft delete) */
export async function cancelReminder(id: number): Promise<boolean> {
  if (!db) throw new Error("Reminders service not initialized");

  const [updated] = await db.update(reminders)
    .set({ status: "cancelled" })
    .where(eq(reminders.id, id))
    .returning();

  if (updated) {
    audit("reminder", `Cancelled reminder ${id}`);
    return true;
  }
  return false;
}

/** Cancel all reminders for a user */
export async function cancelAllReminders(userId: string, platform: string): Promise<number> {
  if (!db) throw new Error("Reminders service not initialized");

  const result = await db.update(reminders)
    .set({ status: "cancelled" })
    .where(and(
      eq(reminders.userId, userId),
      eq(reminders.platform, platform),
      eq(reminders.status, "active")
    ))
    .returning({ id: reminders.id });

  audit("reminder", `Cancelled all ${result.length} reminders for ${userId}`);
  return result.length;
}

/** Modify a reminder's time or metadata */
export async function modifyReminder(
  id: number,
  updates: {
    dueAt?: Date;
    rawMessage?: string;
    repeatPattern?: string | null;
    repeatCount?: number | null;
    firesRemaining?: number | null;
  }
): Promise<ReminderRecord | null> {
  if (!db) throw new Error("Reminders service not initialized");

  const setClause: Record<string, unknown> = {};
  if (updates.dueAt) setClause.dueAt = updates.dueAt;
  if (updates.rawMessage) setClause.rawMessage = updates.rawMessage;
  if (updates.repeatPattern !== undefined) setClause.repeatPattern = updates.repeatPattern;
  if (updates.repeatCount !== undefined) setClause.repeatCount = updates.repeatCount;
  if (updates.firesRemaining !== undefined) setClause.firesRemaining = updates.firesRemaining;

  if (Object.keys(setClause).length === 0) return null;

  const [updated] = await db.update(reminders)
    .set(setClause)
    .where(eq(reminders.id, id))
    .returning();

  if (updated) {
    audit("reminder", `Modified reminder ${id}`);
    return updated as ReminderRecord;
  }
  return null;
}

/**
 * Parse a freeform repeat pattern and advance dueAt to the next occurrence.
 * Handles patterns like: "1 hour", "every 1 minute", "every year", "every weekday",
 * "cron:0 9 * * 1-5", "2 days", "every 30 minutes", "weekly", "monthly", "daily", etc.
 * Returns the next due date, or null if unparseable.
 */
function computeNextDueAt(lastDueAt: Date, now: Date, pattern: string): Date | null {
  const p = pattern.toLowerCase().trim().replace(/^every\s+/, "");

  // Simple duration patterns: "N unit" or just "unit"
  const durationMatch = p.match(/^(\d+)?\s*(minute|min|hour|hr|day|week|month|year)s?$/);
  if (durationMatch) {
    const amount = parseInt(durationMatch[1] || "1", 10);
    const unit = durationMatch[2];
    let next = new Date(lastDueAt);

    // Advance past `now` in case multiple intervals were missed
    const advance = () => {
      switch (unit) {
        case "minute": case "min":
          next.setMinutes(next.getMinutes() + amount); break;
        case "hour": case "hr":
          next.setHours(next.getHours() + amount); break;
        case "day":
          next.setDate(next.getDate() + amount); break;
        case "week":
          next.setDate(next.getDate() + amount * 7); break;
        case "month":
          next.setMonth(next.getMonth() + amount); break;
        case "year":
          next.setFullYear(next.getFullYear() + amount); break;
      }
    };

    // Keep advancing until we're past `now` (handles missed intervals)
    let safety = 0;
    do {
      advance();
      safety++;
    } while (next <= now && safety < 10000);

    return safety < 10000 ? next : null;
  }

  // Named shortcuts
  if (p === "daily") {
    const next = new Date(lastDueAt);
    do { next.setDate(next.getDate() + 1); } while (next <= now);
    return next;
  }
  if (p === "weekly") {
    const next = new Date(lastDueAt);
    do { next.setDate(next.getDate() + 7); } while (next <= now);
    return next;
  }
  if (p === "monthly") {
    const next = new Date(lastDueAt);
    do { next.setMonth(next.getMonth() + 1); } while (next <= now);
    return next;
  }
  if (p === "yearly" || p === "annually") {
    const next = new Date(lastDueAt);
    do { next.setFullYear(next.getFullYear() + 1); } while (next <= now);
    return next;
  }

  // "weekday" / "every weekday" — Mon-Fri
  if (p === "weekday" || p === "weekdays") {
    const next = new Date(lastDueAt);
    do {
      next.setDate(next.getDate() + 1);
      // Skip weekends (0=Sun, 6=Sat)
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
    } while (next <= now);
    return next;
  }

  // Couldn't parse
  audit("reminder", `Could not parse repeat pattern: "${pattern}"`);
  return null;
}

/**
 * Fire a single reminder: pass the alarm through the LLM so the user
 * receives a natural-language notification instead of raw metadata.
 */
async function fireReminder(reminder: ReminderRecord): Promise<void> {
  const now = new Date();

  // ── Optimistic lock: prevent double-firing from overlapping scheduler ticks ──
  // 1. In-memory guard (instant, covers same-tick parallel calls)
  if (firingInProgress.has(reminder.id)) {
    audit("reminder", `Reminder ${reminder.id} already being fired (in-memory guard), skipping`);
    return;
  }
  firingInProgress.add(reminder.id);

  try {
    // 2. Atomic DB claim: set lastFiredAt = now WHERE the reminder still matches
    //    the scheduler query conditions. If another tick already claimed it,
    //    rowCount will be 0 and we bail out.
    const claimed = await db!.update(reminders)
      .set({ lastFiredAt: now })
      .where(and(
        eq(reminders.id, reminder.id),
        eq(reminders.status, "active"),
        or(
          isNull(reminders.lastFiredAt),
          sql`${reminders.lastFiredAt} < ${reminders.dueAt}`
        )
      ))
      .returning({ id: reminders.id });

    if (claimed.length === 0) {
      audit("reminder", `Reminder ${reminder.id} already claimed by another tick (DB guard), skipping`);
      return;
    }

    await fireReminderCore(reminder, now);
  } finally {
    firingInProgress.delete(reminder.id);
  }
}

/** Core firing logic — called only after the optimistic lock succeeds */
async function fireReminderCore(reminder: ReminderRecord, now: Date): Promise<void> {
  audit("reminder", `Firing reminder ${reminder.id}: "${reminder.rawMessage}"`);

  // Build a prompt that the LLM will turn into a friendly notification
  const alarmPrompt = [
    `[ALARM — internal, do NOT show this tag to the user]`,
    `You previously set a reminder on ${reminder.createdAt.toISOString()}:`,
    `"${reminder.rawMessage}"`,
    `It is now ${now.toISOString()}.`,
    `Deliver this reminder to the user in a friendly, natural way. Be brief (1-3 sentences).`,
    `Do NOT include any metadata, timestamps, or the word "ALARM" in your reply.`,
  ].join("\n");

  let sent = false;
  try {
    // Derive chatId: use platformChatId if available, otherwise derive from userId for DMs
    let effectiveChatId = reminder.platformChatId;
    if (!effectiveChatId) {
      // For Telegram DMs: userId is "tg-892935151" → chatId is "892935151"
      // For WhatsApp DMs: userId is "wa-573223176133" → chatId is "573223176133"
      // For Nostr DMs: userId is "nostr-dm-<pubkey>" → chatId is the pubkey
      if (reminder.userId.startsWith("tg-") && !reminder.userId.startsWith("tg-group-")) {
        effectiveChatId = reminder.userId.replace(/^tg-/, "");
        audit("reminder", `Derived chatId ${effectiveChatId} from userId ${reminder.userId} for reminder ${reminder.id}`);
      } else if (reminder.userId.startsWith("wa-")) {
        effectiveChatId = reminder.userId.replace(/^wa-/, "");
        audit("reminder", `Derived chatId ${effectiveChatId} from userId ${reminder.userId} for reminder ${reminder.id}`);
      } else if (reminder.userId.startsWith("nostr-dm-")) {
        effectiveChatId = reminder.userId.replace(/^nostr-dm-/, "");
        audit("reminder", `Derived chatId ${effectiveChatId} from userId ${reminder.userId} for reminder ${reminder.id}`);
      } else {
        audit("reminder", `No platformChatId and cannot derive from userId ${reminder.userId} for reminder ${reminder.id}, skipping`);
      }
    }
    
    if (!effectiveChatId) {
      audit("reminder", `No chatId for reminder ${reminder.id}, skipping delivery`);
    } else {
      // Route through promptWithHistory so the LLM processes the alarm
      const userId = reminder.userId;
      const platform = reminder.platform;

      let naturalMessage: string | null = null;
      try {
        const promptFn = await getPromptWithHistory();
        naturalMessage = await promptFn(
          { userId, platform, chatId: effectiveChatId },
          alarmPrompt
        );
      } catch (err: any) {
        console.error(`[reminders] LLM processing failed for reminder ${reminder.id}:`, err.message);
      }

      // Strip any [SILENT] — alarms should never be silent
      if (naturalMessage && naturalMessage.includes("[SILENT]")) {
        naturalMessage = null;
      }
      
      // Strip any leaked [ALARM] tags — LLM should never pass these through
      if (naturalMessage) {
        naturalMessage = naturalMessage.replace(/\[ALARM[^\]]*\]/gi, "").trim();
        if (!naturalMessage) naturalMessage = null;
      }

      // Fallback: if LLM failed, send a simple human-readable message
      if (!naturalMessage) {
        naturalMessage = `Hey! Reminder: ${reminder.rawMessage}`;
      }

      switch (platform) {
        case "telegram":
          sent = await sendTelegramMessage(effectiveChatId, naturalMessage);
          break;
        case "whatsapp":
          sent = await sendWhatsAppMessage(effectiveChatId, naturalMessage);
          break;
        case "nostr":
        case "nostr-dm":
          sent = await sendNostrDm(effectiveChatId, naturalMessage);
          break;
        default:
          audit("reminder", `Unknown platform ${platform} for reminder ${reminder.id}`);
      }
    }
  } catch (err: any) {
    audit("reminder", `Failed to send reminder ${reminder.id}: ${err.message}`);
  }

  // Update reminder state (lastFiredAt already set by the optimistic lock claim)
  const updates: Record<string, unknown> = {};

  if (reminder.firesRemaining !== null && reminder.firesRemaining !== undefined) {
    const nextRemaining = reminder.firesRemaining - 1;
    updates.firesRemaining = nextRemaining;  // Use Drizzle camelCase, not snake_case
    if (nextRemaining <= 0) {
      updates.status = "fired";
    }
  }

  if (reminder.repeatPattern && updates.status !== "fired") {
    // Advance dueAt to next occurrence for repeating alarms
    const nextDue = computeNextDueAt(reminder.dueAt, now, reminder.repeatPattern);
    if (nextDue) {
      updates.dueAt = nextDue;
      audit("reminder", `Reminder ${reminder.id} next due at ${nextDue.toISOString()}`);
    } else {
      // Could not parse repeat pattern — mark as fired to avoid infinite loop
      updates.status = "fired";
      audit("reminder", `Reminder ${reminder.id} has unparseable repeat pattern "${reminder.repeatPattern}", marking as fired`);
    }
  } else if (!reminder.repeatPattern && updates.status !== "fired") {
    updates.status = "fired";
  }

  if (Object.keys(updates).length > 0) {
    await db!.update(reminders)
      .set(updates)
      .where(eq(reminders.id, reminder.id));
  }

  audit("reminder", `Reminder ${reminder.id} fired (sent=${sent})`);
}

/** Main scheduler loop — runs every 15 seconds for reasonable alarm precision */
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (!db) {
    console.error("[reminders] ERROR: Database not initialized — cannot start scheduler");
    return;
  }
  
  if (schedulerInterval) {
    console.log("[reminders] Scheduler already running");
    return;
  }

  schedulerLoop();
  schedulerInterval = setInterval(() => {
    schedulerLoop();
  }, 15_000);

  console.log("[reminders] Scheduler started (every 15 seconds)");
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[reminders] Scheduler stopped");
  }
}

/** Check for due reminders and fire them */
async function schedulerLoop(): Promise<void> {
  if (!db) return;
  const now = new Date();

  try {
    // Only select reminders that are actually due (due_at <= now)
    // No grace period — alarms fire precisely when due, not before
    const dueReminders = await db.select().from(reminders)
      .where(and(
        eq(reminders.status, "active"),
        lte(reminders.dueAt, now),
        or(
          isNull(reminders.lastFiredAt),
          sql`${reminders.lastFiredAt} < ${reminders.dueAt}`
        )
      ));

    if (dueReminders.length > 0) {
      console.log(`[reminders] Found ${dueReminders.length} due reminders`);
      // Fire all due reminders in parallel (don't let one slow LLM call block others)
      const results = await Promise.allSettled(
        (dueReminders as ReminderRecord[]).map((reminder) =>
          fireReminder(reminder).catch((err: any) => {
            console.error(`[reminders] Error firing reminder ${reminder.id}:`, err.message);
            audit("reminder", `Error firing reminder ${reminder.id}: ${err.message}`);
          })
        )
      );
    }
  } catch (err: any) {
    console.error("[reminders] Scheduler loop error:", err.message);
    audit("reminder", `Scheduler loop error: ${err.message}`);
  }
}

/** Reminder stats (placeholder, keep signature) */
export function getReminderStats(): { active: number; cancelled: number; fired: number } {
  return { active: 0, cancelled: 0, fired: 0 };
}
