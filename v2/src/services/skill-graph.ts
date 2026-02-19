/**
 * Skill Graph Service — Arscontexta implementation for Pixel
 *
 * Wiki links become active navigation, MOCs organize domains,
 * progressive disclosure loads relevant skills based on context hint.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";

// ─── Types ──────────────────────────────────────────────────────

export interface SkillNode {
  path: string;           // relative path from skills root (e.g., "domains/sales/my-claim.md")
  title: string;          // derived from filename or frontmatter title
  description: string;    // from YAML frontmatter description
  kind: "claim" | "moc" | "note" | "observation" | "tension";
  topics: string[];       // from YAML frontmatter topics
  links: string[];        // extracted [[wiki-links]] from content
  content: string;        // full markdown content
  mtime: number;          // last modified time for cache invalidation
}

export interface SkillGraph {
  nodes: Map<string, SkillNode>;     // path → node
  index: Map<string, Set<string>>;   // topic/link → paths
  mtime: number;                     // graph build time
}

// ─── Configuration ──────────────────────────────────────────────

const SKILLS_DIR = process.env.SKILLS_DIR || "/app/external/pixel/skills/arscontexta";
const MARKETPLACE_DIR = process.env.MARKETPLACE_DIR || "/app/external/pixel/skills";
const CACHE_PATH = process.env.SKILL_GRAPH_CACHE || "/app/data/skill-graph-cache.json";
const WIKI_LINK_REGEX = /\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g;  // [[link]] or [[link|display]]

interface SkillSource {
  path: string;
  type: "arscontexta" | "marketplace";
}

const SKILL_SOURCES: SkillSource[] = [
  { path: SKILLS_DIR, type: "arscontexta" },
  { path: MARKETPLACE_DIR, type: "marketplace" },
];

// ─── Global Cache ───────────────────────────────────────────────

let _graph: SkillGraph | null = null;
let _graphPromise: Promise<SkillGraph> | null = null;

// ─── Core Functions ─────────────────────────────────────────────

/**
 * Get or build the skill graph.
 * Uses cached version if available and fresh.
 */
export async function getSkillGraph(): Promise<SkillGraph> {
  if (_graph) return _graph;

  if (_graphPromise) return _graphPromise;

  _graphPromise = buildSkillGraph();
  _graph = await _graphPromise;
  _graphPromise = null;
  return _graph;
}

/**
 * Force rebuild the skill graph (e.g., after skill updates).
 */
export async function rebuildSkillGraph(): Promise<SkillGraph> {
  _graph = null;
  _graphPromise = null;
  return getSkillGraph();
}

/**
 * Build skill graph from filesystem.
 */
async function buildSkillGraph(): Promise<SkillGraph> {
  const startTime = Date.now();
  const nodes = new Map<string, SkillNode>();
  const index = new Map<string, Set<string>>();

  // Check for cached version
  if (existsSync(CACHE_PATH)) {
    try {
      const cached = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
      if (cached.nodes && cached.index && cached.mtime) {
        // Check if cache is still fresh (any file newer than cache?)
        const cacheTime = cached.mtime;
        let needsRebuild = false;

        const checkDir = (dir: string) => {
          if (!existsSync(dir)) return;
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              checkDir(fullPath);
            } else if (entry.name.endsWith(".md")) {
              const stat = statSync(fullPath);
              if (stat.mtimeMs > cacheTime) {
                needsRebuild = true;
                return;
              }
            }
          }
        };

        checkDir(SKILLS_DIR);
        checkDir(MARKETPLACE_DIR);

        if (!needsRebuild) {
          // Use cached version
          for (const node of cached.nodes) {
            nodes.set(node.path, node);
          }
          for (const [key, paths] of cached.index) {
            index.set(key, new Set(paths));
          }
          console.log(`[skill-graph] Loaded from cache (${nodes.size} nodes, ${Date.now() - startTime}ms)`);
          return { nodes, index, mtime: cached.mtime };
        }
      }
    } catch (e: any) {
      console.log(`[skill-graph] Cache invalid, rebuilding: ${e.message}`);
    }
  }

  // Build from scratch
  for (const source of SKILL_SOURCES) {
    if (!existsSync(source.path)) continue;
    
    if (source.type === "arscontexta") {
      scanDir(source.path, "", nodes, index);
    } else if (source.type === "marketplace") {
      scanMarketplaceDir(source.path, nodes, index);
    }
  }

  const graph: SkillGraph = { nodes, index, mtime: Date.now() };

  // Save cache
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify({
      nodes: Array.from(nodes.values()),
      index: Array.from(index.entries()).map(([k, v]) => [k, Array.from(v)]),
      mtime: graph.mtime,
    }), "utf8");
  } catch (e: any) {
    console.error(`[skill-graph] Failed to save cache: ${e.message}`);
  }

  console.log(`[skill-graph] Built ${nodes.size} nodes, ${index.size} index entries (${Date.now() - startTime}ms)`);
  return graph;
}

/**
 * Recursively scan directory for .md files.
 */
function scanDir(dir: string, prefix: string, nodes: Map<string, SkillNode>, index: Map<string, Set<string>>): void {
  if (!existsSync(dir)) return;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      scanDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name, nodes, index);
    } else if (entry.name.endsWith(".md")) {
      const node = parseSkillFile(fullPath, prefix);
      if (node) {
        nodes.set(node.path, node);

        // Index by topics
        for (const topic of node.topics) {
          addToIndex(index, topic.toLowerCase(), node.path);
        }

        // Index by links
        for (const link of node.links) {
          addToIndex(index, link.toLowerCase(), node.path);
        }

        // Index by title
        addToIndex(index, node.title.toLowerCase(), node.path);
      }
    }
  }
}

/**
 * Scan marketplace skills directory (each skill is a dir with SKILL.md).
 */
function scanMarketplaceDir(dir: string, nodes: Map<string, SkillNode>, index: Map<string, Set<string>>): void {
  if (!existsSync(dir)) return;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = join(dir, entry.name);
    const skillFile = join(skillDir, "SKILL.md");
    
    if (!existsSync(skillFile)) continue;

    const node = parseMarketplaceSkill(skillDir, entry.name);
    if (node) {
      nodes.set(node.path, node);

      // Index by title
      addToIndex(index, node.title.toLowerCase(), node.path);
      
      // Index by description keywords
      const descWords = node.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const word of descWords) {
        addToIndex(index, word, node.path);
      }

      // Index by links
      for (const link of node.links) {
        addToIndex(index, link.toLowerCase(), node.path);
      }
    }
  }
}

/**
 * Parse a marketplace skill (directory with SKILL.md).
 */
function parseMarketplaceSkill(dirPath: string, skillName: string): SkillNode | null {
  try {
    const skillFile = join(dirPath, "SKILL.md");
    const content = readFileSync(skillFile, "utf8");
    const stat = statSync(skillFile);

    const { metadata, body } = parseFrontmatter(content);
    const links = extractWikiLinks(body);

    const title = metadata.name || skillName.replace(/-/g, " ");
    const description = metadata.description || "";

    return {
      path: `marketplace/${skillName}`,
      title,
      description,
      kind: "note",
      topics: [],
      links,
      content: body,
      mtime: stat.mtimeMs,
    };
  } catch (e: any) {
    console.error(`[skill-graph] Failed to parse marketplace skill ${dirPath}: ${e.message}`);
    return null;
  }
}

/**
 * Parse a skill markdown file.
 */
function parseSkillFile(fullPath: string, prefix: string): SkillNode | null {
  try {
    const content = readFileSync(fullPath, "utf8");
    const stat = statSync(fullPath);

    const { metadata, body } = parseFrontmatter(content);
    const links = extractWikiLinks(body);

    const filename = basename(fullPath, ".md");
    const relPath = prefix ? `${prefix}/${filename}.md` : `${filename}.md`;

    // Determine kind from path or frontmatter
    let kind: SkillNode["kind"] = "note";
    if (relPath.includes("/observations/")) kind = "observation";
    else if (relPath.includes("/tensions/")) kind = "tension";
    else if (filename === "index") kind = "moc";
    else if (metadata.kind) kind = metadata.kind;
    else if (metadata.claim) kind = "claim";

    return {
      path: relPath,
      title: metadata.title || filename.replace(/-/g, " "),
      description: metadata.description || "",
      kind,
      topics: metadata.topics || [],
      links,
      content: body,
      mtime: stat.mtimeMs,
    };
  } catch (e: any) {
    console.error(`[skill-graph] Failed to parse ${fullPath}: ${e.message}`);
    return null;
  }
}

/**
 * Parse YAML frontmatter from markdown.
 */
function parseFrontmatter(content: string): { metadata: Record<string, any>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: content };
  }

  const yaml = match[1];
  const body = match[2];
  const metadata: Record<string, any> = {};

  // Simple YAML parser (handles basic key: value pairs)
  for (const line of yaml.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value: any = line.slice(colonIdx + 1).trim();

    // Handle arrays (simple [item1, item2] syntax)
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, ""));
    } else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }

    metadata[key] = value;
  }

  return { metadata, body };
}

/**
 * Extract wiki links from content.
 */
function extractWikiLinks(content: string): string[] {
  const links: string[] = [];
  let match;
  const regex = new RegExp(WIKI_LINK_REGEX.source, "g");
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return [...new Set(links)];
}

/**
 * Add entry to reverse index.
 */
function addToIndex(index: Map<string, Set<string>>, key: string, path: string): void {
  const existing = index.get(key);
  if (existing) {
    existing.add(path);
  } else {
    index.set(key, new Set([path]));
  }
}

// ─── Discovery Functions ────────────────────────────────────────

/**
 * Discover relevant skills based on a conversation hint.
 * Returns matched nodes with progressive disclosure.
 */
export function discoverRelevantSkills(graph: SkillGraph, hint: string): SkillNode[] {
  if (!hint || hint.length < 3) return [];

  const hintLower = hint.toLowerCase();
  const words = hintLower.split(/\s+/).filter(w => w.length > 3);

  const matchedPaths = new Set<string>();

  // Direct wiki link matches and word-in-key matches
  for (const word of words) {
    const paths = graph.index.get(word);
    if (paths) {
      for (const p of paths) matchedPaths.add(p);
    }
    // Also match keys that contain this word (e.g., "[[sales]]" contains "sales")
    for (const [key, keyPaths] of graph.index) {
      const keyClean = key.replace(/\[\[|\]\]/g, "").toLowerCase();
      if (keyClean === word || keyClean.includes(word)) {
        for (const p of keyPaths) matchedPaths.add(p);
      }
    }
  }

  // Substring matches on titles and topics
  for (const [key, paths] of graph.index) {
    if (hintLower.includes(key)) {
      for (const p of paths) matchedPaths.add(p);
    }
  }

  // Get nodes, prioritize claims and MOCs
  const nodes: SkillNode[] = [];
  for (const path of matchedPaths) {
    const node = graph.nodes.get(path);
    if (node && node.kind !== "observation" && node.kind !== "tension") {
      nodes.push(node);
    }
  }

  // Sort: MOCs first, then claims, then notes
  nodes.sort((a, b) => {
    const order = { moc: 0, claim: 1, note: 2, observation: 3, tension: 4 };
    return (order[a.kind] || 2) - (order[b.kind] || 2);
  });

  return nodes.slice(0, 8); // Limit to 8 relevant skills
}

/**
 * Resolve a wiki link to a node path.
 */
export function resolveWikiLink(link: string, graph: SkillGraph): string | null {
  const linkLower = link.toLowerCase();

  // Exact match
  const exact = graph.index.get(linkLower);
  if (exact && exact.size > 0) {
    return Array.from(exact)[0];
  }

  // Fuzzy match (substring)
  for (const [key, paths] of graph.index) {
    if (key.includes(linkLower) || linkLower.includes(key)) {
      if (paths.size > 0) return Array.from(paths)[0];
    }
  }

  return null;
}

/**
 * Traverse MOC and return linked nodes.
 */
export function traverseMOC(graph: SkillGraph, mocPath: string): SkillNode[] {
  const moc = graph.nodes.get(mocPath);
  if (!moc || moc.kind !== "moc") return [];

  const nodes: SkillNode[] = [];
  for (const link of moc.links) {
    const resolvedPath = resolveWikiLink(link, graph);
    if (resolvedPath) {
      const node = graph.nodes.get(resolvedPath);
      if (node) nodes.push(node);
    }
  }

  return nodes;
}

// ─── Formatting Functions ───────────────────────────────────────

/**
 * Format a skill node for injection into prompts.
 * Progressive disclosure: description first, full content optionally.
 */
export function formatSkillForInjection(node: SkillNode, fullContent: boolean = false): string {
  if (fullContent) {
    return `## ${node.title}\n\n${node.content}`;
  }

  // Progressive disclosure: description + links
  let result = `## ${node.title}\n`;
  if (node.description) {
    result += `${node.description}\n`;
  }
  if (node.topics.length > 0) {
    result += `Topics: ${node.topics.join(", ")}\n`;
  }
  if (node.links.length > 0) {
    result += `Related: ${node.links.slice(0, 5).map(l => `[[${l}]]`).join(", ")}\n`;
  }
  return result;
}

/**
 * Format multiple skills for injection.
 */
export function formatSkillsForInjection(nodes: SkillNode[], maxChars: number = 4000): string {
  const parts: string[] = [];
  let totalChars = 0;

  for (const node of nodes) {
    const formatted = formatSkillForInjection(node);
    if (totalChars + formatted.length > maxChars) break;
    parts.push(formatted);
    totalChars += formatted.length;
  }

  return parts.join("\n\n---\n\n");
}

// ─── Stats ──────────────────────────────────────────────────────

export function getSkillGraphStats(): {
  nodeCount: number;
  indexSize: number;
  byKind: Record<string, number>;
} {
  if (!_graph) {
    return { nodeCount: 0, indexSize: 0, byKind: {} };
  }

  const byKind: Record<string, number> = {};
  for (const node of _graph.nodes.values()) {
    byKind[node.kind] = (byKind[node.kind] || 0) + 1;
  }

  return {
    nodeCount: _graph.nodes.size,
    indexSize: _graph.index.size,
    byKind,
  };
}
