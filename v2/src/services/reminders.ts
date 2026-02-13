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
  if (updates.dueAt) setClause.due_at = updates.dueAt;
  if (updates.rawMessage) setClause.raw_message = updates.rawMessage;
  if (updates.repeatPattern !== undefined) setClause.repeat_pattern = updates.repeatPattern;
  if (updates.repeatCount !== undefined) setClause.repeat_count = updates.repeatCount;
  if (updates.firesRemaining !== undefined) setClause.fires_remaining = updates.firesRemaining;

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
 * Fire a single reminder: send raw wake-up message to Pixel
 */
async function fireReminder(reminder: ReminderRecord): Promise<void> {
  const now = new Date();
  audit("reminder", `Firing reminder ${reminder.id}: "${reminder.rawMessage}"`);

  const wakeMessage = [
    "[ALARM]",
    `You set this reminder for yourself on ${reminder.createdAt.toISOString()}:`,
    "",
    `\"${reminder.rawMessage}\"`,
    "",
    `It is now ${now.toISOString()}. What do you do?`
  ].join("\n");

  let sent = false;
  try {
    switch (reminder.platform) {
      case "telegram":
        if (reminder.platformChatId) {
          sent = await sendTelegramMessage(reminder.platformChatId, wakeMessage);
        }
        break;
      case "whatsapp":
        if (reminder.platformChatId) {
          sent = await sendWhatsAppMessage(reminder.platformChatId, wakeMessage);
        }
        break;
      case "nostr":
      case "nostr-dm":
        if (reminder.platformChatId) {
          sent = await sendNostrDm(reminder.platformChatId, wakeMessage);
        }
        break;
      default:
        audit("reminder", `Unknown platform ${reminder.platform} for reminder ${reminder.id}`);
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

  await db.update(reminders)
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
