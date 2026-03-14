import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../db.js";

let db: PostgresJsDatabase<typeof schema> | null = null;
let rawSql: any | null = null;

export function initIdentity(database: PostgresJsDatabase<typeof schema>, sqlInstance: any): void {
  db = database;
  rawSql = sqlInstance;
}

function normalizeSubjectId(subjectId: string): string {
  return subjectId.trim();
}

function deriveDefaultSubjectType(subjectId: string): "person" | "group" | "self" {
  if (subjectId === "pixel-self") return "self";
  if (subjectId.startsWith("tg-group-") || subjectId.startsWith("wa-group-")) return "group";
  return "person";
}

export interface SubjectResolution {
  subjectId: string;
  canonicalId: string;
  canonicalType: "person" | "group" | "self";
  aliases: string[];
}

/**
 * Resolve a platform/user id to a canonical subject id using user_links.
 * If no link exists, the subject is canonical unto itself.
 */
export async function resolveCanonicalSubject(subjectId?: string): Promise<SubjectResolution | null> {
  if (!subjectId) return null;
  const normalized = normalizeSubjectId(subjectId);

  if (!rawSql) {
    const canonicalType = deriveDefaultSubjectType(normalized);
    return { subjectId: normalized, canonicalId: normalized, canonicalType, aliases: [normalized] };
  }

  try {
    const links = await rawSql`
      SELECT user_id, linked_user_id
      FROM user_links
      WHERE user_id = ${normalized} OR linked_user_id = ${normalized}
    `;

    const aliases = new Set<string>([normalized]);
    for (const row of links) {
      if (row.user_id) aliases.add(String(row.user_id));
      if (row.linked_user_id) aliases.add(String(row.linked_user_id));
    }

    const allAliases = Array.from(aliases).sort();
    const canonicalId = allAliases[0] || normalized;
    const canonicalType = deriveDefaultSubjectType(canonicalId);
    return { subjectId: normalized, canonicalId, canonicalType, aliases: allAliases };
  } catch {
    const canonicalType = deriveDefaultSubjectType(normalized);
    return { subjectId: normalized, canonicalId: normalized, canonicalType, aliases: [normalized] };
  }
}

export async function linkSubjects(subjectA: string, subjectB: string): Promise<{ canonicalId: string; aliases: string[] }> {
  if (!rawSql) throw new Error("Identity service not initialized");

  const a = normalizeSubjectId(subjectA);
  const b = normalizeSubjectId(subjectB);
  if (!a || !b) throw new Error("Both subject ids are required");
  if (a === b) throw new Error("Cannot link a subject to itself");

  const [left, right] = [a, b].sort();
  await rawSql`
    INSERT INTO user_links (user_id, platform, linked_user_id, linked_platform)
    VALUES (${left}, ${"linked"}, ${right}, ${"linked"})
  `;

  const resolved = await resolveCanonicalSubject(left);
  if (!resolved) throw new Error("Failed to resolve canonical subject after linking");
  return { canonicalId: resolved.canonicalId, aliases: resolved.aliases };
}
