/**
 * Reminder Service — Reliable Alarm Clock for Pixel
 *
 * The scheduler is dumb: it stores raw user intent + due time.
 * Pixel is smart: it interprets the message at fire time.
 */

import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, eq, and, or, lte, isNull, desc, gt } from "drizzle-orm";
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
}

const GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

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
  if (!db) throw new Error("Reminders service not initialized");

  const results = await db.select().from(reminders)
    .where(and(
      eq(reminders.userId, userId),
      eq(reminders.platform, platform),
      eq(reminders.status, "active")
    ))
    .orderBy(desc(reminders.dueAt));

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
 * Fire a single reminder: pass the alarm through the LLM so the user
 * receives a natural-language notification instead of raw metadata.
 */
async function fireReminder(reminder: ReminderRecord): Promise<void> {
  const now = new Date();
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
    if (!reminder.platformChatId) {
      audit("reminder", `No platformChatId for reminder ${reminder.id}, skipping`);
    } else {
      // Route through promptWithHistory so the LLM processes the alarm
      const userId = reminder.userId;
      const platform = reminder.platform;
      const chatId = reminder.platformChatId;

      let naturalMessage: string | null = null;
      try {
        const promptFn = await getPromptWithHistory();
        naturalMessage = await promptFn(
          { userId, platform, chatId },
          alarmPrompt
        );
      } catch (err: any) {
        console.error(`[reminders] LLM processing failed for reminder ${reminder.id}:`, err.message);
      }

      // Strip any [SILENT] — alarms should never be silent
      if (naturalMessage && naturalMessage.includes("[SILENT]")) {
        naturalMessage = null;
      }

      // Fallback: if LLM failed, send a simple human-readable message
      if (!naturalMessage) {
        naturalMessage = `Hey! Reminder: ${reminder.rawMessage}`;
      }

      switch (platform) {
        case "telegram":
          sent = await sendTelegramMessage(chatId, naturalMessage);
          break;
        case "whatsapp":
          sent = await sendWhatsAppMessage(chatId, naturalMessage);
          break;
        case "nostr":
        case "nostr-dm":
          sent = await sendNostrDm(chatId, naturalMessage);
          break;
        default:
          audit("reminder", `Unknown platform ${platform} for reminder ${reminder.id}`);
      }
    }
  } catch (err: any) {
    audit("reminder", `Failed to send reminder ${reminder.id}: ${err.message}`);
  }

  // Update reminder state
  const updates: Record<string, unknown> = {
    lastFiredAt: now,
  };

  if (reminder.firesRemaining !== null && reminder.firesRemaining !== undefined) {
    const nextRemaining = reminder.firesRemaining - 1;
    updates.fires_remaining = nextRemaining;
    if (nextRemaining <= 0) {
      updates.status = "fired";
    }
  }

  if (!reminder.repeatPattern && updates.status !== "fired") {
    updates.status = "fired";
  }

  await db!.update(reminders)
    .set(updates)
    .where(eq(reminders.id, reminder.id));

  audit("reminder", `Reminder ${reminder.id} fired (sent=${sent})`);
}

/** Main scheduler loop — runs every minute */
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (schedulerInterval) {
    console.log("[reminders] Scheduler already running");
    return;
  }

  schedulerLoop();
  schedulerInterval = setInterval(() => {
    schedulerLoop();
  }, 60_000);

  console.log("[reminders] Scheduler started (every 60 seconds)");
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
  const graceBoundary = new Date(now.getTime() + GRACE_PERIOD_MS);

  try {
    const dueReminders = await db.select().from(reminders)
      .where(and(
        eq(reminders.status, "active"),
        lte(reminders.dueAt, graceBoundary),
        or(
          isNull(reminders.lastFiredAt),
          sql`${reminders.lastFiredAt} < ${reminders.dueAt}`
        )
      ));

    if (dueReminders.length > 0) {
      console.log(`[reminders] Found ${dueReminders.length} due reminders`);
      for (const reminder of dueReminders as ReminderRecord[]) {
        try {
          await fireReminder(reminder);
        } catch (err: any) {
          console.error(`[reminders] Error firing reminder ${reminder.id}:`, err.message);
          audit("reminder", `Error firing reminder ${reminder.id}: ${err.message}`);
        }
      }
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
