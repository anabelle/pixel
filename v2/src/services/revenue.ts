/**
 * Revenue Tracking — Record and query all payment activity
 *
 * Every sat that flows through Pixel gets recorded here.
 * Sources: nostr_dvm, l402, x402, canvas, zap, tip, whatsapp, telegram, http
 */

import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { desc, sql, eq, gte } from "drizzle-orm";
import { revenue } from "../db.js";
import type * as schema from "../db.js";
import { audit } from "./audit.js";
import { alertOwner } from "./digest.js";

// Will be set by initRevenue() from index.ts
let db: PostgresJsDatabase<typeof schema> | null = null;

/** Initialize the revenue service with a database connection */
export function initRevenue(database: PostgresJsDatabase<typeof schema>): void {
  db = database;
  console.log("[revenue] Revenue tracking initialized");
}

export interface RevenueEntry {
  source: string;
  amountSats: number;
  userId?: string;
  description?: string;
  txHash?: string;
}

/**
 * Record a revenue event.
 *
 * Call this whenever Pixel receives a payment — from any source.
 */
export async function recordRevenue(entry: RevenueEntry): Promise<void> {
  if (!db) {
    console.log("[revenue] Database not available, logging to console only");
    console.log(`[revenue] ${entry.source}: ${entry.amountSats} sats — ${entry.description ?? "no description"}`);
    return;
  }

  try {
    await db.insert(revenue).values({
      source: entry.source,
      amountSats: entry.amountSats,
      userId: entry.userId ?? null,
      description: entry.description ?? null,
      txHash: entry.txHash ?? null,
    });
    console.log(`[revenue] Recorded: ${entry.source} — ${entry.amountSats} sats`);
    audit("revenue", `${entry.source}: ${entry.amountSats} sats`, { source: entry.source, amountSats: entry.amountSats, userId: entry.userId, description: entry.description });
    alertOwner("revenue", `${entry.amountSats} sats from ${entry.source}${entry.description ? ` — ${entry.description}` : ""}`, { source: entry.source, amountSats: entry.amountSats }).catch(() => {});
  } catch (err: any) {
    console.error("[revenue] Failed to record:", err.message);
    // Still log it even if DB fails
    console.log(`[revenue] (fallback log) ${entry.source}: ${entry.amountSats} sats — ${entry.description}`);
  }
}

/**
 * Get revenue statistics — total by source, overall total, recent entries.
 */
export async function getRevenueStats(): Promise<{
  totalSats: number;
  bySource: { source: string; totalSats: number; count: number }[];
  recent: { source: string; amountSats: number; description: string | null; createdAt: Date }[];
}> {
  if (!db) {
    return { totalSats: 0, bySource: [], recent: [] };
  }

  try {
    // Total across all sources
    const totalResult = await db
      .select({ total: sql<number>`COALESCE(SUM(amount_sats), 0)::int` })
      .from(revenue);
    const totalSats = totalResult[0]?.total ?? 0;

    // Breakdown by source
    const bySource = await db
      .select({
        source: revenue.source,
        totalSats: sql<number>`COALESCE(SUM(amount_sats), 0)::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(revenue)
      .groupBy(revenue.source)
      .orderBy(sql`SUM(amount_sats) DESC`);

    // Last 20 entries
    const recent = await db
      .select({
        source: revenue.source,
        amountSats: revenue.amountSats,
        description: revenue.description,
        createdAt: revenue.createdAt,
      })
      .from(revenue)
      .orderBy(desc(revenue.createdAt))
      .limit(20);

    return {
      totalSats,
      bySource: bySource.map((r) => ({
        source: r.source,
        totalSats: r.totalSats,
        count: r.count,
      })),
      recent: recent.map((r) => ({
        source: r.source,
        amountSats: Number(r.amountSats) || 0,
        description: r.description,
        createdAt: r.createdAt,
      })),
    };
  } catch (err: any) {
    console.error("[revenue] Failed to get stats:", err.message);
    return { totalSats: 0, bySource: [], recent: [] };
  }
}

/**
 * Get total sats received in the last N days.
 */
export async function getRevenueSince(days: number): Promise<number> {
  if (!db) return 0;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(amount_sats), 0)::int` })
      .from(revenue)
      .where(gte(revenue.createdAt, since));
    return result[0]?.total ?? 0;
  } catch (err: any) {
    console.error("[revenue] Failed to get recent stats:", err.message);
    return 0;
  }
}
