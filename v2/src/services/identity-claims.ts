import { randomBytes } from "crypto";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../db.js";
import { linkSubjects, resolveCanonicalSubject } from "./identity.js";

let db: PostgresJsDatabase<typeof schema> | null = null;
let rawSql: any | null = null;

const CLAIM_TTL_HOURS = 24;

export function initIdentityClaims(database: PostgresJsDatabase<typeof schema>, sqlInstance: any): void {
  db = database;
  rawSql = sqlInstance;
}

function generateClaimCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function createIdentityClaim(claimantUserId: string, claimantPlatform: string): Promise<{ code: string; expiresAt: string }> {
  if (!rawSql) throw new Error("Identity claims service not initialized");
  const code = generateClaimCode();
  const expiresAt = new Date(Date.now() + CLAIM_TTL_HOURS * 60 * 60 * 1000);

  await rawSql`
    INSERT INTO identity_claims (code, claimant_user_id, claimant_platform, status, expires_at)
    VALUES (${code}, ${claimantUserId}, ${claimantPlatform}, ${"pending"}, ${expiresAt.toISOString()})
  `;

  return { code, expiresAt: expiresAt.toISOString() };
}

export async function redeemIdentityClaim(code: string, targetUserId: string, targetPlatform: string): Promise<{ canonicalId: string; aliases: string[] }> {
  if (!rawSql) throw new Error("Identity claims service not initialized");

  const [claim] = await rawSql`
    SELECT * FROM identity_claims
    WHERE code = ${code.toUpperCase()}
    LIMIT 1
  `;

  if (!claim) throw new Error("Claim code not found");
  if (claim.status !== "pending") throw new Error(`Claim is already ${claim.status}`);
  if (new Date(claim.expires_at).getTime() < Date.now()) throw new Error("Claim has expired");
  if (claim.claimant_user_id === targetUserId) throw new Error("Use the code from your other account, not the same one");

  const resolvedA = await resolveCanonicalSubject(String(claim.claimant_user_id));
  const resolvedB = await resolveCanonicalSubject(targetUserId);
  if (resolvedA && resolvedB && resolvedA.canonicalId === resolvedB.canonicalId) {
    throw new Error("These accounts are already linked");
  }

  const linked = await linkSubjects(String(claim.claimant_user_id), targetUserId);

  await rawSql`
    UPDATE identity_claims
    SET status = ${"redeemed"},
        target_user_id = ${targetUserId},
        target_platform = ${targetPlatform},
        redeemed_at = NOW()
    WHERE id = ${claim.id}
  `;

  return linked;
}

export async function listIdentityClaims(limit: number = 20): Promise<any[]> {
  if (!rawSql) throw new Error("Identity claims service not initialized");
  const safeLimit = Math.max(1, Math.min(limit, 100));
  return await rawSql`
    SELECT code, claimant_user_id, claimant_platform, target_user_id, target_platform, status, expires_at, redeemed_at, created_at
    FROM identity_claims
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;
}
