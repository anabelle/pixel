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
    const aliases = new Set<string>([normalized]);
    const queue = [normalized];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const links = await rawSql`
        SELECT user_id, linked_user_id
        FROM user_links
        WHERE user_id = ${current} OR linked_user_id = ${current}
      `;

      for (const row of links) {
        for (const candidate of [row.user_id, row.linked_user_id]) {
          if (!candidate) continue;
          const value = String(candidate);
          if (!aliases.has(value)) {
            aliases.add(value);
            queue.push(value);
          }
        }
      }
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
    ON CONFLICT (user_id, linked_user_id) DO NOTHING
  `;

  const resolved = await resolveCanonicalSubject(left);
  if (!resolved) throw new Error("Failed to resolve canonical subject after linking");
  return { canonicalId: resolved.canonicalId, aliases: resolved.aliases };
}

function normalizeDisplayName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isWeakIdentityName(name: string): boolean {
  if (!name || name.length < 4) return true;
  if (/^(someone|user\-\d+|unknown|telegram|whatsapp|twitter|nostr)/i.test(name)) return true;
  if (/^[0-9]{6,}$/.test(name.replace(/\s+/g, ""))) return true;
  if (/^[a-f0-9]{16,}$/i.test(name.replace(/\s+/g, ""))) return true;
  return false;
}

export interface IdentitySuggestion {
  subjectA: string;
  platformA: string;
  displayA: string;
  subjectB: string;
  platformB: string;
  displayB: string;
  normalized: string;
  confidence: "low" | "medium" | "high";
  reason: string;
}

export async function suggestIdentityLinks(limit: number = 20): Promise<IdentitySuggestion[]> {
  if (!rawSql) throw new Error("Identity service not initialized");

  const rows = await rawSql`
    SELECT platform_id, platform, display_name
    FROM users
    WHERE active = TRUE
      AND display_name IS NOT NULL
      AND platform_id NOT LIKE 'tg-group-%'
      AND platform_id NOT LIKE 'wa-group-%'
  `;

  const suggestions: IdentitySuggestion[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (!a?.platform_id || !b?.platform_id) continue;
      if (a.platform_id === b.platform_id) continue;
      if (a.platform === b.platform) continue;

      const resolvedA = await resolveCanonicalSubject(String(a.platform_id));
      const resolvedB = await resolveCanonicalSubject(String(b.platform_id));
      if (resolvedA && resolvedB && resolvedA.canonicalId === resolvedB.canonicalId) continue;

      const displayA = String(a.display_name || "").trim();
      const displayB = String(b.display_name || "").trim();
      const normA = normalizeDisplayName(displayA);
      const normB = normalizeDisplayName(displayB);
      if (!normA || !normB) continue;
      if (normA !== normB) continue;
      if (isWeakIdentityName(normA)) continue;

      const pairKey = [a.platform_id, b.platform_id].sort().join("::");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      suggestions.push({
        subjectA: String(a.platform_id),
        platformA: String(a.platform),
        displayA,
        subjectB: String(b.platform_id),
        platformB: String(b.platform),
        displayB,
        normalized: normA,
        confidence: normA.includes(" ") ? "high" : "medium",
        reason: `matching display name: ${normA}`,
      });
    }
  }

  return suggestions.slice(0, Math.max(1, Math.min(limit, 100)));
}
