/**
 * Zap-based Reputation Scoring — infer user trustworthiness from payment history.
 *
 * Every sat that flows through Pixel lands in the revenue table (zaps, L402,
 * x402, DVM jobs, canvas, tips). This service turns that invoice history into
 * a deterministic trust signal:
 *
 *   volume    (0-50) log-scaled total sats paid
 *   consistency (0-25) number of distinct payment events
 *   recency   (0-15) time since last payment
 *   breadth   (0-10) distinct payment sources
 *
 * Score is 0-100, tiered newcomer → elite. No LLM involved — same input,
 * same score, every time. Cross-platform identities are merged through the
 * canonical identity graph before aggregation.
 */

import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, inArray } from "drizzle-orm";
import { revenue } from "../db.js";
import type * as schema from "../db.js";
import { resolveCanonicalSubject } from "./identity.js";

let db: PostgresJsDatabase<typeof schema> | null = null;

export function initReputation(database: PostgresJsDatabase<typeof schema>): void {
  db = database;
  console.log("[reputation] Zap-based reputation scoring initialized");
}

export interface ReputationBreakdown {
  volume: number;
  consistency: number;
  recency: number;
  breadth: number;
}

export interface UserReputation {
  userId: string;
  canonicalId: string;
  aliases: string[];
  score: number;
  tier: string;
  totalSats: number;
  paymentCount: number;
  distinctSources: string[];
  lastPaymentAt: string | null;
  breakdown: ReputationBreakdown;
  sources: string[]; // user ids the aggregation covered
}

export interface ReputationSummary {
  userId: string;
  score: number;
  tier: string;
  totalSats: number;
  paymentCount: number;
  lastPaymentAt: string | null;
}

/** Volume points: log10 scaling — 100 sats ≈ 12.5, 1k ≈ 25, 10k+ ≈ 50. */
function volumePoints(totalSats: number): number {
  if (totalSats <= 0) return 0;
  const maxRef = 10_000;
  return Math.min(50, (Math.log10(1 + totalSats) / Math.log10(1 + maxRef)) * 50);
}

/** Consistency points: 5 per payment, full marks at 5 payments. */
function consistencyPoints(paymentCount: number): number {
  return Math.min(25, paymentCount * 5);
}

/** Recency points: paid within the last week → 15, month → 10, quarter → 5. */
function recencyPoints(lastPaymentAt: Date | null): number {
  if (!lastPaymentAt) return 0;
  const days = (Date.now() - lastPaymentAt.getTime()) / 86_400_000;
  if (days <= 7) return 15;
  if (days <= 30) return 10;
  if (days <= 90) return 5;
  return 0;
}

/** Breadth points: 2.5 per distinct payment source, full marks at 4. */
function breadthPoints(distinctSources: number): number {
  return Math.min(10, distinctSources * 2.5);
}

function tierFor(score: number): string {
  if (score >= 85) return "elite";
  if (score >= 70) return "veteran";
  if (score >= 45) return "trusted";
  if (score >= 20) return "casual";
  return "newcomer";
}

interface AggregateRow {
  total_sats: string | number | null;
  payment_count: string | number | null;
  distinct_sources: string | number | null;
  last_payment_at: string | Date | null;
}

function rowToReputation(row: AggregateRow, userIds: string[], canonicalId: string, aliases: string[]): UserReputation {
  const totalSats = Number(row.total_sats ?? 0);
  const paymentCount = Number(row.payment_count ?? 0);
  const lastPaymentAt = row.last_payment_at ? new Date(row.last_payment_at) : null;

  const breakdown: ReputationBreakdown = {
    volume: Math.round(volumePoints(totalSats) * 10) / 10,
    consistency: Math.round(consistencyPoints(paymentCount) * 10) / 10,
    recency: recencyPoints(lastPaymentAt),
    breadth: Math.round(breadthPoints(Number(row.distinct_sources ?? 0)) * 10) / 10,
  };
  const score = Math.round(breakdown.volume + breakdown.consistency + breakdown.recency + breakdown.breadth);

  return {
    userId: userIds[0],
    canonicalId,
    aliases,
    score,
    tier: tierFor(score),
    totalSats,
    paymentCount,
    distinctSources: [],
    lastPaymentAt: lastPaymentAt ? lastPaymentAt.toISOString() : null,
    breakdown,
    sources: userIds,
  };
}

/** Compute the reputation for a single user, merging all canonical aliases. */
export async function getUserReputation(userId: string): Promise<UserReputation | null> {
  if (!db) return null;

  let canonicalId = userId;
  let aliases: string[] = [];
  try {
    const subject = await resolveCanonicalSubject(userId);
    if (subject) {
      canonicalId = subject.canonicalId;
      aliases = (subject.aliases ?? []).filter((a: string) => a !== canonicalId);
    }
  } catch {
    // identity graph unavailable — score the raw id
  }

  const userIds = [canonicalId, ...aliases];
  const rows: AggregateRow[] = await db
    .select({
      total_sats: sql<string>`coalesce(sum(${revenue.amountSats}), 0)`,
      payment_count: sql<string>`count(*)`,
      distinct_sources: sql<string>`count(distinct ${revenue.source})`,
      last_payment_at: sql<string | null>`max(${revenue.createdAt})`,
    })
    .from(revenue)
    .where(inArray(revenue.userId, userIds));

  if (!rows || rows.length === 0) return null;
  return rowToReputation(rows[0], userIds, canonicalId, aliases);
}

/** Top reputations by score — leaderboard for review. Anonymous payments excluded. */
export async function getTopReputations(limit: number = 10): Promise<ReputationSummary[]> {
  if (!db) return [];
  const rows = await db
    .select({
      userId: revenue.userId,
      totalSats: sql<string>`coalesce(sum(${revenue.amountSats}), 0)`,
      paymentCount: sql<string>`count(*)`,
      lastPaymentAt: sql<string | null>`max(${revenue.createdAt})`,
    })
    .from(revenue)
    .where(sql`${revenue.userId} is not null`)
    .groupBy(revenue.userId);

  const summaries: ReputationSummary[] = rows.map((r: any) => {
    const totalSats = Number(r.totalSats);
    const paymentCount = Number(r.paymentCount);
    const lastPaymentAt = r.lastPaymentAt ? new Date(r.lastPaymentAt) : null;
    // Leaderboard rows are per-raw-userId; alias merging happens on detail view
    const breakdown: ReputationBreakdown = {
      volume: Math.round(volumePoints(totalSats) * 10) / 10,
      consistency: Math.round(consistencyPoints(paymentCount) * 10) / 10,
      recency: recencyPoints(lastPaymentAt),
      breadth: 0, // not aggregated per-source here; detail view has it
    };
    const score = Math.round(breakdown.volume + breakdown.consistency + breakdown.recency);
    return {
      userId: r.userId,
      score,
      tier: tierFor(score),
      totalSats,
      paymentCount,
      lastPaymentAt: lastPaymentAt ? lastPaymentAt.toISOString() : null,
    };
  });

  summaries.sort((a, b) => b.score - a.score || b.totalSats - a.totalSats);
  return summaries.slice(0, limit);
}

/** Compact reputation line for system-prompt injection (empty string = no history). */
export async function getReputationPromptLine(userId: string): Promise<string> {
  const rep = await getUserReputation(userId).catch(() => null);
  if (!rep || rep.paymentCount === 0) return "";
  return `Payment reputation: ${rep.tier} (score ${rep.score}/100 — ${rep.paymentCount} payments, ${rep.totalSats} sats total${rep.lastPaymentAt ? `, last ${rep.lastPaymentAt.slice(0, 10)}` : ""}). Internal signal for trust; never quote verbatim.`;
}
