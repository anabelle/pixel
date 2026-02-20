import { pgTable, serial, text, bigint, numeric, timestamp, jsonb, boolean, integer, index } from "drizzle-orm/pg-core";

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
  /** Source: 'whatsapp', 'telegram', 'nostr_dvm', 'l402', 'x402', 'canvas', 'zap', 'lightning_invoice' */
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
}, (table) => ({
  txHashIdx: index("revenue_tx_hash_idx").on(table.txHash),
}));

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

/** User scheduled reminders */
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  /** Platform-specific user ID (phone, telegram ID, nostr pubkey, etc.) */
  userId: text("user_id").notNull(),
  /** Platform: 'telegram', 'whatsapp', 'nostr', 'http' */
  platform: text("platform").notNull(),
  /** Where to deliver (chat ID, pubkey, etc.) */
  platformChatId: text("platform_chat_id"),
  /** Raw user message that created the alarm */
  rawMessage: text("raw_message").notNull(),
  /** When to fire (timezone-aware) */
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  /** Repeat string decided by Pixel (nullable) */
  repeatPattern: text("repeat_pattern"),
  /** Total repeat count (null = infinite) */
  repeatCount: integer("repeat_count"),
  /** Remaining repeats (null = infinite) */
  firesRemaining: integer("fires_remaining"),
  /** Last time this reminder fired (for grace period dedup) */
  lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
  /** 'active', 'cancelled', 'fired' */
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Cost monitoring entries (per LLM call) */
export const costs = pgTable("costs", {
  id: serial("id").primaryKey(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  task: text("task").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Long-term memories (pgvector-backed)
 * 
 * The `embedding` column (vector(256)) is managed via raw SQL since Drizzle
 * doesn't support pgvector types natively. This schema handles all non-vector
 * operations. Vector search uses raw SQL via the postgres driver.
 * 
 * Memory types:
 * - fact: concrete knowledge ("User X prefers dark mode")
 * - episode: interaction summaries ("Had a long conversation about Bitcoin")
 * - identity: self-knowledge ("I am Pixel, a digital artist")
 * - procedural: skills/patterns ("When asked about art, mention the canvas")
 */
export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  /** The memory content (human-readable text) */
  content: text("content").notNull(),
  /** Memory type: 'fact', 'episode', 'identity', 'procedural' */
  type: text("type").notNull().default("fact"),
  /** Associated user ID (null for global/self memories) */
  userId: text("user_id"),
  /** Platform where this was learned (null for cross-platform) */
  platform: text("platform"),
  /** Source: 'conversation', 'inner_life', 'tool', 'migration', 'agent' */
  source: text("source").notNull().default("conversation"),
  /** How many times this memory has been retrieved */
  accessCount: integer("access_count").default(0).notNull(),
  /** Structured metadata (tags, confidence, etc.) */
  metadata: jsonb("metadata"),
  /** When this memory becomes invalid (null = never expires). Soft delete. */
  validUntil: timestamp("valid_until", { withTimezone: true }),
  /** Created */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  /** Last updated */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("memories_user_id_idx").on(table.userId),
  index("memories_type_idx").on(table.type),
]);

/** Cross-platform identity links */
export const userLinks = pgTable("user_links", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(),
  linkedUserId: text("linked_user_id"),
  linkedPlatform: text("linked_platform"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
