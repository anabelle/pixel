import { pgTable, serial, text, bigint, numeric, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";

// ============================================================
// Pixel V2 Database Schema
// Single PostgreSQL instance for everything:
// conversations, revenue, canvas, user profiles
// ============================================================

/** Users across all platforms */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Platform-specific identifier: phone number, telegram ID, nostr pubkey, etc. */
  platformId: text("platform_id").notNull(),
  /** Platform: 'telegram', 'whatsapp', 'nostr', 'instagram', 'http' */
  platform: text("platform").notNull(),
  /** Human-readable display name */
  displayName: text("display_name"),
  /** Agent-written notes about this user */
  memoryMd: text("memory_md"),
  /** First seen */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  /** Last interaction */
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  /** Total messages exchanged */
  messageCount: integer("message_count").default(0).notNull(),
  /** Whether this user is allowed to interact (for rate limiting / banning) */
  active: boolean("active").default(true).notNull(),
});

/** Revenue from all sources */
export const revenue = pgTable("revenue", {
  id: serial("id").primaryKey(),
  /** Source: 'whatsapp', 'telegram', 'nostr_dvm', 'l402', 'x402', 'canvas', 'zap' */
  source: text("source").notNull(),
  /** Normalized to sats */
  amountSats: bigint("amount_sats", { mode: "number" }),
  /** USD equivalent at time of payment */
  amountUsd: numeric("amount_usd", { precision: 10, scale: 4 }),
  /** Platform-specific user identifier */
  userId: text("user_id"),
  /** Description of what was paid for */
  description: text("description"),
  /** Lightning payment hash or on-chain tx */
  txHash: text("tx_hash"),
  /** Payment timestamp */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Canvas pixels (migrated from V1 SQLite) */
export const canvasPixels = pgTable("canvas_pixels", {
  id: serial("id").primaryKey(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  color: text("color").notNull(),
  /** Who placed this pixel */
  placedBy: text("placed_by"),
  /** Payment hash for this pixel */
  paymentHash: text("payment_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Conversation log entries (supplement to JSONL files on disk) */
export const conversationLog = pgTable("conversation_log", {
  id: serial("id").primaryKey(),
  /** User ID from users table */
  userId: text("user_id").notNull(),
  /** Platform this message came from */
  platform: text("platform").notNull(),
  /** 'user' or 'assistant' */
  role: text("role").notNull(),
  /** Message content */
  content: text("content").notNull(),
  /** Any structured metadata */
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
