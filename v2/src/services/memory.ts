/**
 * Long-Term Memory Service — Mem0-inspired pgvector memory for Pixel
 *
 * Architecture:
 *   - Embeddings: Gemini text-embedding-004 (free tier, 256 dimensions)
 *   - Storage: PostgreSQL + pgvector (vector(256))
 *   - Retrieval: Hybrid (0.7 vector similarity + 0.3 recency)
 *   - Consolidation: Mem0 ADD/UPDATE/DELETE/NOOP pattern
 *   - Deletion: Soft delete via valid_until (temporal invalidation)
 *
 * Follows the late-bound init pattern from reminders.ts.
 */

import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { memories } from "../db.js";
import type * as schema from "../db.js";
import { audit } from "./audit.js";

// ─── Configuration ───────────────────────────────────────────

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 256;
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}`;

/** Hybrid retrieval weights */
const VECTOR_WEIGHT = 0.7;
const RECENCY_WEIGHT = 0.3;

/** Maximum memories to return from search */
const DEFAULT_TOP_K = 10;

/** Similarity threshold — below this, memories are not relevant */
const SIMILARITY_THRESHOLD = 0.3;

/** Max memories to inject into system prompt */
const MAX_PROMPT_MEMORIES = 8;

const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const CONVERSATIONS_DIR = process.env.DATA_DIR ?? "./conversations";

// ─── Late-bound DB reference ─────────────────────────────────

let db: PostgresJsDatabase<typeof schema> | null = null;
let rawSql: any | null = null;

/**
 * Initialize the memory system.
 * Creates the pgvector extension and memories table if they don't exist.
 */
export async function initMemory(
  database: PostgresJsDatabase<typeof schema>,
  sqlInstance: any
): Promise<void> {
  db = database;
  rawSql = sqlInstance;

  if (!GEMINI_API_KEY) {
    console.warn("[memory] No GOOGLE_GENERATIVE_AI_API_KEY — embeddings will fail");
  }

  try {
    // Enable pgvector extension
    await rawSql`CREATE EXTENSION IF NOT EXISTS vector`;

    // Create memories table with vector column
    await rawSql`
      CREATE TABLE IF NOT EXISTS memories (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(256),
        type TEXT NOT NULL DEFAULT 'fact',
        user_id TEXT,
        platform TEXT,
        source TEXT NOT NULL DEFAULT 'conversation',
        access_count INTEGER DEFAULT 0 NOT NULL,
        metadata JSONB,
        valid_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `;

    // Create indexes
    await rawSql`CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id)`;
    await rawSql`CREATE INDEX IF NOT EXISTS memories_type_idx ON memories(type)`;
    await rawSql`CREATE INDEX IF NOT EXISTS memories_valid_idx ON memories(valid_until) WHERE valid_until IS NOT NULL`;
    await rawSql`CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING hnsw (embedding vector_cosine_ops)`;

    // Count existing memories
    const [{ count }] = await rawSql`SELECT COUNT(*) as count FROM memories WHERE valid_until IS NULL`;
    console.log(`[memory] Memory system initialized (${count} active memories)`);
    audit("memory", `Memory system initialized (${count} active memories)`);

    // One-time legacy migration (from markdown files)
    await migrateLegacyMemory();

    // Distill long blobs into atomic facts (safe to run repeatedly)
    await distillMemoryBlobs();

    // Cleanup malformed entries and fix types
    await cleanupMemory();
  } catch (err: any) {
    console.error("[memory] Init failed:", err.message);
    audit("memory", `Init failed: ${err.message}`);
  }
}

// ─── Embedding Generation ────────────────────────────────────

/**
 * Generate an embedding for a single text using Gemini text-embedding-004.
 * Uses RETRIEVAL_DOCUMENT for stored content, RETRIEVAL_QUERY for search queries.
 */
export async function generateEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[]> {
  if (!GEMINI_API_KEY) throw new Error("No Gemini API key for embeddings");

  const response = await fetch(
    `${GEMINI_EMBED_URL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

/**
 * Generate embeddings for multiple texts in one API call.
 * Batches up to 100 texts per request (Gemini limit).
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  if (!GEMINI_API_KEY) throw new Error("No Gemini API key for embeddings");
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await generateEmbedding(texts[0], taskType)];

  // Gemini batch limit is 100
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const requests = batch.map((text) => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }));

    const response = await fetch(
      `${GEMINI_EMBED_URL}:batchEmbedContents?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch embedding API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as { embeddings: { values: number[] }[] };
    for (const emb of data.embeddings) {
      allEmbeddings.push(emb.values);
    }
  }

  return allEmbeddings;
}

// ─── CRUD Operations ─────────────────────────────────────────

export interface MemorySaveInput {
  content: string;
  type?: "fact" | "episode" | "identity" | "procedural";
  userId?: string;
  platform?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryRecord {
  id: number;
  content: string;
  type: string;
  userId: string | null;
  platform: string | null;
  source: string;
  accessCount: number;
  metadata: Record<string, unknown> | null;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  similarity?: number; // Only present in search results
}

export interface MemoryFact {
  id: number;
  content: string;
  type: string;
  userId: string | null;
  platform: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Save a new memory with embedding.
 * Uses Mem0 consolidation: checks for similar existing memories and
 * decides whether to ADD new, UPDATE existing, or NOOP.
 */
export async function memorySave(input: MemorySaveInput): Promise<MemoryRecord> {
  if (!db || !rawSql) throw new Error("Memory service not initialized");

  const { content, type = "fact", userId, platform, source = "conversation", metadata } = input;

  // Generate embedding for the new content
  const embedding = await generateEmbedding(content, "RETRIEVAL_DOCUMENT");
  const embeddingStr = `[${embedding.join(",")}]`;

  // Check for similar existing memories (consolidation)
  const similar = await rawSql`
    SELECT id, content, type, user_id, platform, source, metadata,
           1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM memories
    WHERE valid_until IS NULL
      AND embedding IS NOT NULL
      ${userId ? rawSql`AND (user_id = ${userId} OR user_id IS NULL)` : rawSql`AND user_id IS NULL`}
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT 5
  `;

  // Check if any existing memory is very similar (>0.85 similarity)
  const closestMatch = similar.find((m: any) => m.similarity > 0.85);

  if (closestMatch) {
    // UPDATE: merge with existing memory
    const mergedContent = await mergeMemoryContent(closestMatch.content, content);

    if (mergedContent === closestMatch.content) {
      // NOOP: new content adds nothing
      audit("memory", `NOOP — new fact already captured in memory ${closestMatch.id}`);
      const [existing] = await rawSql`SELECT * FROM memories WHERE id = ${closestMatch.id}`;
      return rowToRecord(existing);
    }

    // Update the existing memory with merged content and new embedding
    const mergedEmbedding = await generateEmbedding(mergedContent, "RETRIEVAL_DOCUMENT");
    const mergedEmbStr = `[${mergedEmbedding.join(",")}]`;

    await rawSql`
      UPDATE memories
      SET content = ${mergedContent},
          embedding = ${mergedEmbStr}::vector,
          updated_at = NOW(),
          metadata = ${JSON.stringify({ ...((closestMatch.metadata as any) || {}), ...(metadata || {}), merged_from: content.slice(0, 100) })}::jsonb
      WHERE id = ${closestMatch.id}
    `;

    audit("memory", `UPDATED memory ${closestMatch.id}: merged new fact`);
    const [updated] = await rawSql`SELECT * FROM memories WHERE id = ${closestMatch.id}`;
    return rowToRecord(updated);
  }

  // ADD: insert new memory
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  const [created] = await rawSql`
    INSERT INTO memories (content, embedding, type, user_id, platform, source, metadata)
    VALUES (
      ${content},
      ${embeddingStr}::vector,
      ${type},
      ${userId ?? null},
      ${platform ?? null},
      ${source},
      ${metadataJson}::jsonb
    )
    RETURNING *
  `;

  audit("memory", `ADDED memory ${created.id}: "${content.slice(0, 80)}..." (type=${type}, user=${userId ?? "global"})`);
  return rowToRecord(created);
}

/**
 * Search memories using hybrid retrieval (vector similarity + recency).
 */
export async function memorySearch(
  query: string,
  options: {
    userId?: string;
    platform?: string;
    type?: string;
    topK?: number;
    includeExpired?: boolean;
  } = {}
): Promise<MemoryRecord[]> {
  if (!db || !rawSql) throw new Error("Memory service not initialized");

  const { userId, platform, type, topK = DEFAULT_TOP_K, includeExpired = false } = options;

  // Generate query embedding (RETRIEVAL_QUERY taskType for search)
  const queryEmbedding = await generateEmbedding(query, "RETRIEVAL_QUERY");
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Hybrid retrieval: vector similarity + recency scoring
  // vector_score = 1 - cosine_distance (0 to 1, higher = more similar)
  // recency_score = normalized (0 to 1, higher = more recent)
  // final_score = VECTOR_WEIGHT * vector_score + RECENCY_WEIGHT * recency_score
  const results = await rawSql`
    WITH scored AS (
      SELECT *,
        1 - (embedding <=> ${embeddingStr}::vector) as vector_score,
        EXTRACT(EPOCH FROM (created_at - (SELECT MIN(created_at) FROM memories))) /
          NULLIF(EXTRACT(EPOCH FROM (NOW() - (SELECT MIN(created_at) FROM memories))), 0)
          as recency_score
      FROM memories
      WHERE TRUE
        AND embedding IS NOT NULL
        ${!includeExpired ? rawSql`AND valid_until IS NULL` : rawSql``}
        ${userId ? rawSql`AND (user_id = ${userId} OR user_id IS NULL)` : rawSql``}
        ${platform ? rawSql`AND (platform = ${platform} OR platform IS NULL)` : rawSql``}
        ${type ? rawSql`AND type = ${type}` : rawSql``}
    )
    SELECT *,
      (${VECTOR_WEIGHT} * vector_score + ${RECENCY_WEIGHT} * COALESCE(recency_score, 0)) as final_score
    FROM scored
    WHERE vector_score >= ${SIMILARITY_THRESHOLD}
    ORDER BY final_score DESC
    LIMIT ${topK}
  `;

  // Increment access count for retrieved memories
  if (results.length > 0) {
    const ids = results.map((r: any) => r.id);
    await rawSql`UPDATE memories SET access_count = access_count + 1 WHERE id = ANY(${ids})`;
  }

  return results.map((r: any) => ({
    ...rowToRecord(r),
    similarity: Number(r.final_score),
  }));
}

/**
 * Update a memory's content (generates new embedding).
 */
export async function memoryUpdate(
  id: number,
  newContent: string
): Promise<MemoryRecord | null> {
  if (!db || !rawSql) throw new Error("Memory service not initialized");

  // Check it exists and is valid
  const [existing] = await rawSql`SELECT * FROM memories WHERE id = ${id} AND valid_until IS NULL`;
  if (!existing) return null;

  // Generate new embedding
  const embedding = await generateEmbedding(newContent, "RETRIEVAL_DOCUMENT");
  const embeddingStr = `[${embedding.join(",")}]`;

  await rawSql`
    UPDATE memories
    SET content = ${newContent},
        embedding = ${embeddingStr}::vector,
        updated_at = NOW()
    WHERE id = ${id}
  `;

  audit("memory", `Updated memory ${id}: "${newContent.slice(0, 80)}..."`);
  const [updated] = await rawSql`SELECT * FROM memories WHERE id = ${id}`;
  return rowToRecord(updated);
}

/**
 * Soft-delete a memory by setting valid_until to now.
 * The memory remains in the database for audit purposes.
 */
export async function memoryDelete(id: number): Promise<boolean> {
  if (!db || !rawSql) throw new Error("Memory service not initialized");

  const [existing] = await rawSql`SELECT * FROM memories WHERE id = ${id} AND valid_until IS NULL`;
  if (!existing) return false;

  await rawSql`
    UPDATE memories SET valid_until = NOW(), updated_at = NOW() WHERE id = ${id}
  `;

  audit("memory", `Soft-deleted memory ${id}: "${existing.content?.slice(0, 60)}..."`);
  return true;
}

// ─── System Prompt Injection ─────────────────────────────────

/**
 * Get relevant memories for injection into the system prompt.
 * Called during buildSystemPrompt() to augment the agent's context.
 *
 * Strategy:
 * 1. Search for memories relevant to this user
 * 2. Include global identity/procedural memories
 * 3. Limit to MAX_PROMPT_MEMORIES to avoid context bloat
 */
export async function getRelevantMemories(
  userId?: string,
  platform?: string,
  conversationHint?: string
): Promise<string> {
  if (!db || !rawSql) return "";

  try {
    const parts: string[] = [];

    // 1. User-specific memories (if we have a user)
    if (userId) {
      const userMemories = await rawSql`
        SELECT content, type, access_count FROM memories
        WHERE user_id = ${userId}
          AND valid_until IS NULL
        ORDER BY updated_at DESC
        LIMIT ${Math.floor(MAX_PROMPT_MEMORIES / 2)}
      `;
      if (userMemories.length > 0) {
        parts.push("### About this user");
        for (const m of userMemories) {
          parts.push(`- ${m.content}`);
        }
      }
    }

    // 2. Identity memories (always include)
    const identityMemories = await rawSql`
      SELECT content FROM memories
      WHERE type = 'identity'
        AND valid_until IS NULL
      ORDER BY updated_at DESC
      LIMIT 3
    `;
    if (identityMemories.length > 0) {
      parts.push("### Self-knowledge");
      for (const m of identityMemories) {
        parts.push(`- ${m.content}`);
      }
    }

    // 3. If we have a conversation hint, do a semantic search for relevant facts
    if (conversationHint) {
      const relevantFacts = await memorySearch(conversationHint, {
        userId,
        topK: MAX_PROMPT_MEMORIES - parts.length,
      });

      // Filter out memories we already included
      const existingContent = new Set(parts);
      const newFacts = relevantFacts.filter(
        (m) => !existingContent.has(`- ${m.content}`)
      );

      if (newFacts.length > 0) {
        parts.push("### Relevant memories");
        for (const m of newFacts) {
          parts.push(`- ${m.content} (${m.type}, relevance: ${(m.similarity! * 100).toFixed(0)}%)`);
        }
      }
    }

    if (parts.length === 0) return "";
    return parts.join("\n");
  } catch (err: any) {
    console.error("[memory] Error getting relevant memories:", err.message);
    return "";
  }
}

// ─── Memory Stats ────────────────────────────────────────────

export async function getMemoryStats(): Promise<{
  total: number;
  active: number;
  expired: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}> {
  if (!rawSql) return { total: 0, active: 0, expired: 0, byType: {}, bySource: {} };

  try {
    const [total] = await rawSql`SELECT COUNT(*) as count FROM memories`;
    const [active] = await rawSql`SELECT COUNT(*) as count FROM memories WHERE valid_until IS NULL`;
    const [expired] = await rawSql`SELECT COUNT(*) as count FROM memories WHERE valid_until IS NOT NULL`;

    const byType = await rawSql`
      SELECT type, COUNT(*) as count FROM memories WHERE valid_until IS NULL GROUP BY type
    `;
    const bySource = await rawSql`
      SELECT source, COUNT(*) as count FROM memories WHERE valid_until IS NULL GROUP BY source
    `;

    return {
      total: Number(total.count),
      active: Number(active.count),
      expired: Number(expired.count),
      byType: Object.fromEntries(byType.map((r: any) => [r.type, Number(r.count)])),
      bySource: Object.fromEntries(bySource.map((r: any) => [r.source, Number(r.count)])),
    };
  } catch (err: any) {
    console.error("[memory] Stats error:", err.message);
    return { total: 0, active: 0, expired: 0, byType: {}, bySource: {} };
  }
}

export async function listMemories(options: {
  limit?: number;
  includeExpired?: boolean;
  type?: string;
  source?: string;
  userId?: string;
  platform?: string;
} = {}): Promise<MemoryRecord[]> {
  if (!rawSql) return [];

  const {
    limit = DEFAULT_TOP_K,
    includeExpired = false,
    type,
    source,
    userId,
    platform,
  } = options;

  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const rows = await rawSql`
    SELECT id, content, type, user_id, platform, source, access_count, metadata, valid_until, created_at, updated_at
    FROM memories
    WHERE TRUE
      ${!includeExpired ? rawSql`AND valid_until IS NULL` : rawSql``}
      ${type ? rawSql`AND type = ${type}` : rawSql``}
      ${source ? rawSql`AND source = ${source}` : rawSql``}
      ${userId ? rawSql`AND user_id = ${userId}` : rawSql``}
      ${platform ? rawSql`AND platform = ${platform}` : rawSql``}
    ORDER BY updated_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((row: any) => rowToRecord(row));
}

// ─── Consolidation (background) ──────────────────────────────

/**
 * Background consolidation pass.
 * Called during inner-life phases to merge duplicate/overlapping memories.
 * Finds clusters of highly similar memories and merges them.
 */
export async function consolidateMemories(): Promise<number> {
  if (!rawSql) return 0;

  let merged = 0;
  try {
    // Find memories that are very similar to each other
    const candidates = await rawSql`
      SELECT a.id as id_a, b.id as id_b,
             a.content as content_a, b.content as content_b,
             1 - (a.embedding <=> b.embedding) as similarity
      FROM memories a
      JOIN memories b ON a.id < b.id
      WHERE a.valid_until IS NULL AND b.valid_until IS NULL
        AND 1 - (a.embedding <=> b.embedding) > 0.9
      ORDER BY similarity DESC
      LIMIT 10
    `;

    for (const pair of candidates) {
      const mergedContent = await mergeMemoryContent(pair.content_a, pair.content_b);
      const mergedEmbedding = await generateEmbedding(mergedContent, "RETRIEVAL_DOCUMENT");
      const embStr = `[${mergedEmbedding.join(",")}]`;

      // Update the older memory (lower ID) with merged content
      await rawSql`
        UPDATE memories
        SET content = ${mergedContent}, embedding = ${embStr}::vector, updated_at = NOW()
        WHERE id = ${pair.id_a}
      `;

      // Soft-delete the newer duplicate
      await rawSql`
        UPDATE memories
        SET valid_until = NOW(), updated_at = NOW(),
            metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ merged_into: pair.id_a })}::jsonb
        WHERE id = ${pair.id_b}
      `;

      merged++;
      audit("memory", `Consolidated memories ${pair.id_a} + ${pair.id_b} (similarity: ${Number(pair.similarity).toFixed(2)})`);
    }

    if (merged > 0) {
      console.log(`[memory] Consolidated ${merged} memory pairs`);
    }
  } catch (err: any) {
    console.error("[memory] Consolidation error:", err.message);
  }

  return merged;
}

// ─── Memory Cleanup (distill long blobs into atomic facts) ─────

/**
 * Distill long markdown memories into short atomic facts.
 * Creates new fact memories and expires the original blob if replaced.
 */
export async function distillMemoryBlobs(): Promise<number> {
  if (!rawSql) return 0;

  const candidates = await rawSql`
    SELECT id, content, type, user_id, platform, source
    FROM memories
    WHERE valid_until IS NULL
      AND source != 'distilled'
      AND length(content) > 120
    ORDER BY id ASC
    LIMIT 50
  `;

  let distilled = 0;
  for (const row of candidates) {
    const raw = (row.content as string).trim();
    if (!raw) continue;
    if (raw.startsWith("```")) {
      await rawSql`UPDATE memories SET valid_until = NOW(), updated_at = NOW() WHERE id = ${row.id}`;
      distilled++;
      continue;
    }

    const facts = extractFactsFromMarkdown(row.content as string);
    if (facts.length === 0) continue;

    for (const fact of facts) {
      const inferredType = inferMemoryType(fact, row.type as string);
      await memorySave({
        content: fact,
        type: inferredType,
        userId: row.user_id ?? undefined,
        platform: row.platform ?? undefined,
        source: "distilled",
      });
    }

    // Expire the original blob after distillation
    await rawSql`UPDATE memories SET valid_until = NOW(), updated_at = NOW() WHERE id = ${row.id}`;
    distilled++;
  }

  if (distilled > 0) {
    audit("memory", `Distilled ${distilled} memory blobs into atomic facts`);
  }

  return distilled;
}

/**
 * Cleanup: expire malformed or unhelpful memories and fix types.
 */
export async function cleanupMemory(): Promise<void> {
  if (!rawSql) return;

  // Expire malformed or code-fenced entries
  await rawSql`
    UPDATE memories
    SET valid_until = NOW(), updated_at = NOW()
    WHERE valid_until IS NULL
      AND (
        content ILIKE (chr(96) || chr(96) || chr(96) || '%')
        OR content LIKE ('%' || chr(96) || chr(96) || chr(96) || '%')
      )
  `;

  // Fix identity entries that are clearly procedural
  await rawSql`
    UPDATE memories
    SET type = 'procedural', updated_at = NOW()
    WHERE valid_until IS NULL
      AND type = 'identity'
      AND (content ILIKE '%protocol%' OR content ILIKE '%project queue%' OR content ILIKE '%steps%' OR content ILIKE '%workflow%')
  `;
}

// ─── Legacy Migration (from markdown files) ───────────────────

/**
 * Migrate existing markdown memories into pgvector.
 * This runs once at startup if no migration marker exists.
 */
async function migrateLegacyMemory(): Promise<void> {
  if (!rawSql) return;

  const marker = join(DATA_DIR, ".memory_migrated");
  if (existsSync(marker)) return;

  const toInsert: { content: string; type: string; userId?: string; source: string }[] = [];

  // Global inner-life docs
  const innerDocs: Array<{ path: string; type: string; source: string }> = [
    { path: join(DATA_DIR, "reflections.md"), type: "identity", source: "inner_life" },
    { path: join(DATA_DIR, "learnings.md"), type: "fact", source: "inner_life" },
    { path: join(DATA_DIR, "ideas.md"), type: "procedural", source: "inner_life" },
    { path: join(DATA_DIR, "evolution.md"), type: "identity", source: "inner_life" },
    { path: join(DATA_DIR, "idea-garden.md"), type: "procedural", source: "inner_life" },
    { path: join(DATA_DIR, "projects.md"), type: "procedural", source: "inner_life" },
  ];

  for (const doc of innerDocs) {
    if (!existsSync(doc.path)) continue;
    try {
      const content = readFileSync(doc.path, "utf-8").trim();
      if (content.length > 20) {
        toInsert.push({ content, type: doc.type, source: doc.source });
      }
    } catch {}
  }

  // User memory.md files
  try {
    const userDirs = readdirSync(CONVERSATIONS_DIR);
    for (const userDir of userDirs) {
      const memPath = join(CONVERSATIONS_DIR, userDir, "memory.md");
      if (!existsSync(memPath)) continue;
      try {
        const content = readFileSync(memPath, "utf-8").trim();
        if (content.length > 10) {
          toInsert.push({ content, type: "fact", userId: userDir, source: "migration" });
        }
      } catch {}
    }
  } catch {}

  if (toInsert.length === 0) {
    writeFileSync(marker, new Date().toISOString(), "utf-8");
    return;
  }

  console.log(`[memory] Migrating ${toInsert.length} legacy memories...`);
  let successCount = 0;
  for (const mem of toInsert) {
    try {
      await memorySave({
        content: mem.content,
        type: mem.type as any,
        userId: mem.userId,
        source: mem.source,
      });
      successCount++;
    } catch (err: any) {
      console.error("[memory] Migration failed for entry:", err.message);
    }
  }

  if (successCount > 0) {
    writeFileSync(marker, new Date().toISOString(), "utf-8");
    console.log(`[memory] Legacy migration complete (${successCount}/${toInsert.length})`);
    audit("memory", `Legacy migration complete (${successCount}/${toInsert.length})`);
  } else {
    console.warn("[memory] Legacy migration failed — no memories inserted; will retry next boot");
    audit("memory", "Legacy migration failed — no memories inserted; will retry next boot");
  }
}

/**
 * Extract atomic facts from a markdown blob.
 */
function extractFactsFromMarkdown(markdown: string): string[] {
  const lines = markdown.split("\n").map((l) => l.trim());
  const facts: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const bullet = line.replace(/^[-*]\s+/, "");
    if (!bullet || bullet.length < 8 || bullet.length > 200) continue;
    facts.push(bullet);
    if (facts.length >= 8) break;
  }

  if (facts.length === 0 && markdown.length <= 200) {
    facts.push(markdown.trim());
  }

  return facts;
}

function inferMemoryType(fact: string, fallbackType: string): "fact" | "identity" | "procedural" | "episode" {
  const text = fact.toLowerCase();
  if (text.includes("protocol") || text.includes("steps") || text.includes("procedure") || text.includes("workflow") || text.includes("project") || text.includes("queue") || text.includes("notes:")) {
    return "procedural";
  }
  if (text.includes("i am") || text.includes("i'm") || text.includes("my identity") || text.includes("state of") || text.includes("evolving")) {
    return "identity";
  }
  if (fallbackType === "identity") return "identity";
  return "fact";
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Merge two memory contents into one.
 * If they say essentially the same thing, return the more informative one.
 * If they contain different facts, combine them concisely.
 */
async function mergeMemoryContent(existing: string, incoming: string): Promise<string> {
  // Simple heuristic: if one is a substring of the other, keep the longer one
  if (existing.includes(incoming)) return existing;
  if (incoming.includes(existing)) return incoming;

  // If both are short, just combine them
  if (existing.length + incoming.length < 300) {
    return `${existing}. Additionally: ${incoming}`;
  }

  // For longer texts, keep the more recent (incoming) but note the merge
  return `${incoming} (previously: ${existing.slice(0, 100)}...)`;
}

/** Convert a raw SQL row to a MemoryRecord */
function rowToRecord(row: any): MemoryRecord {
  return {
    id: row.id,
    content: row.content,
    type: row.type,
    userId: row.user_id,
    platform: row.platform,
    source: row.source,
    accessCount: row.access_count ?? 0,
    metadata: row.metadata,
    validUntil: row.valid_until ? new Date(row.valid_until) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    similarity: row.similarity ? Number(row.similarity) : undefined,
  };
}
