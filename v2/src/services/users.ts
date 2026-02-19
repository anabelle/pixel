/**
 * User Tracking — Record and query user interactions
 *
 * Every user who talks to Pixel gets a record here.
 * Tracks: platform, first seen, last seen, message count.
 *
 * Same init pattern as revenue.ts — initUsers(db) called from index.ts.
 */

import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, eq, and } from "drizzle-orm";
import { users } from "../db.js";
import type * as schema from "../db.js";

// Will be set by initUsers() from index.ts
let db: PostgresJsDatabase<typeof schema> | null = null;

/** Initialize the user tracking service with a database connection */
export function initUsers(database: PostgresJsDatabase<typeof schema>): void {
  db = database;
  console.log("[users] User tracking initialized");
}

/**
 * Track a user interaction — upserts the user record.
 *
 * Creates the user if they don't exist, updates last_seen and increments
 * message_count if they do. Non-blocking, fire-and-forget.
 *
 * @param platformId - Platform-specific ID (e.g. nostr pubkey, telegram user id)
 * @param platform - Platform name (e.g. "nostr", "telegram", "http")
 * @param displayName - Optional human-readable name
 */
export async function trackUser(
  platformId: string,
  platform: string,
  displayName?: string
): Promise<void> {
  if (!db) return;

  try {
    // Try to upsert — PostgreSQL ON CONFLICT
    await db.execute(sql`
      INSERT INTO users (platform_id, platform, display_name, message_count, last_seen_at)
      VALUES (${platformId}, ${platform}, ${displayName ?? null}, 1, NOW())
      ON CONFLICT (platform_id, platform)
      DO UPDATE SET
        message_count = users.message_count + 1,
        last_seen_at = NOW(),
        display_name = COALESCE(EXCLUDED.display_name, users.display_name)
    `);
  } catch (err: any) {
    // The unique constraint might not exist yet — try creating it, then retry
    if (err.message?.includes("ON CONFLICT")) {
      try {
        await db.execute(sql`
          CREATE UNIQUE INDEX IF NOT EXISTS users_platform_id_platform_idx
          ON users (platform_id, platform)
        `);
        // Retry the upsert
        await db.execute(sql`
          INSERT INTO users (platform_id, platform, display_name, message_count, last_seen_at)
          VALUES (${platformId}, ${platform}, ${displayName ?? null}, 1, NOW())
          ON CONFLICT (platform_id, platform)
          DO UPDATE SET
            message_count = users.message_count + 1,
            last_seen_at = NOW(),
            display_name = COALESCE(EXCLUDED.display_name, users.display_name)
        `);
      } catch (retryErr: any) {
        console.error("[users] Track user retry failed:", retryErr.message);
      }
    } else {
      console.error("[users] Track user failed:", err.message);
    }
  }
}

/**
 * Get user stats — total users, active users (last 7 days), by platform
 */
export async function getUserStats(): Promise<{
  totalUsers: number;
  activeUsers: number;
  byPlatform: { platform: string; count: number }[];
}> {
  if (!db) {
    return { totalUsers: 0, activeUsers: 0, byPlatform: [] };
  }

  try {
    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users);
    const totalUsers = totalResult[0]?.count ?? 0;

    const activeResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(sql`last_seen_at > NOW() - INTERVAL '7 days'`);
    const activeUsers = activeResult[0]?.count ?? 0;

    const byPlatform = await db
      .select({
        platform: users.platform,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .groupBy(users.platform)
      .orderBy(sql`COUNT(*) DESC`);

    return {
      totalUsers,
      activeUsers,
      byPlatform: byPlatform.map((r) => ({
        platform: r.platform,
        count: r.count,
      })),
    };
  } catch (err: any) {
    console.error("[users] Get stats failed:", err.message);
    return { totalUsers: 0, activeUsers: 0, byPlatform: [] };
  }
}
