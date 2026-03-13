import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { join, relative } from "path";

export interface SelfLearningConfig {
  enabled: boolean;
  autoAfterTask: boolean;
  injectLastN: number;
  maxMessagesForReflection: number;
  maxLearnings: number;
  maxCoreItems: number;
  storage: {
    mode: "project" | "global";
    projectPath: string;
    globalPath: string;
  };
  git: {
    enabled: boolean;
    autoCommit: boolean;
  };
  context: {
    enabled: boolean;
    includeCore: boolean;
    includeLatestMonthly: boolean;
    includeLastNDaily: number;
    maxChars: number;
    instructionMode: "off" | "advisory" | "strict";
  };
  model?: {
    provider?: string;
    id?: string;
  };
}

export interface SelfLearningReflection {
  mistakes: string[];
  fixes: string[];
}

interface CoreItem {
  key: string;
  text: string;
  kind: "learning" | "watchout";
  hits: number;
  score: number;
  firstSeen: string;
  lastSeen: string;
}

interface CoreIndex {
  version: 1;
  updatedAt: string;
  items: CoreItem[];
}

const DEFAULT_CONFIG: SelfLearningConfig = {
  enabled: true,
  autoAfterTask: true,
  injectLastN: 5,
  maxMessagesForReflection: 8,
  maxLearnings: 8,
  maxCoreItems: 20,
  storage: {
    mode: "project",
    projectPath: "data/openviking/agent/skills/self-learning-memory",
    globalPath: "~/.pi/agent/self-learning-memory",
  },
  git: {
    enabled: true,
    autoCommit: true,
  },
  context: {
    enabled: true,
    includeCore: true,
    includeLatestMonthly: false,
    includeLastNDaily: 0,
    maxChars: 12000,
    instructionMode: "strict",
  },
  model: {
    provider: "google",
    id: "gemini-2.5-flash",
  },
};

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T extends Record<string, any>>(base: T, overrides: Record<string, any>): T {
  const merged: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const baseValue = merged[key];
    if (isRecord(baseValue) && isRecord(value)) {
      merged[key] = deepMerge(baseValue, value);
    } else {
      merged[key] = value;
    }
  }
  return merged as T;
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function compactText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 16)).trimEnd()}\n...(truncated)`;
}

function projectRoot(): string {
  return process.cwd();
}

function expandHome(value: string): string {
  if (value === "~") return process.env.HOME ?? value;
  if (value.startsWith("~/")) return join(process.env.HOME ?? "/root", value.slice(2));
  return value;
}

function settingsPath(): string {
  return join(projectRoot(), ".pi", "settings.json");
}

function readSettingsRoot(): Record<string, any> {
  return readJson<Record<string, any>>(settingsPath(), {});
}

export function getSelfLearningConfig(): SelfLearningConfig {
  const settings = readSettingsRoot();
  const overrides = isRecord(settings.selfLearning) ? settings.selfLearning : {};
  return deepMerge(DEFAULT_CONFIG, overrides);
}

export function getSelfLearningRoot(config = getSelfLearningConfig()): string {
  return config.storage.mode === "global"
    ? expandHome(config.storage.globalPath)
    : join(projectRoot(), config.storage.projectPath);
}

function dailyDir(root: string): string {
  return join(root, "daily");
}

function monthlyDir(root: string): string {
  return join(root, "monthly");
}

function coreDir(root: string): string {
  return join(root, "core");
}

function coreFile(root: string): string {
  return join(coreDir(root), "CORE.md");
}

function longTermFile(root: string): string {
  return join(root, "long-term-memory.md");
}

function coreIndexFile(root: string): string {
  return join(coreDir(root), "index.json");
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function isDirectoryEmpty(dir: string): boolean {
  if (!existsSync(dir)) return true;
  try {
    return readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}

function copyRecursive(src: string, dest: string): void {
  const srcStat = statSync(src);
  if (srcStat.isDirectory()) {
    ensureDir(dest);
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
    return;
  }

  ensureDir(join(dest, ".."));
  copyFileSync(src, dest);
}

function migrateLegacyProjectSelfLearningRoot(root: string): void {
  const legacyRoot = join(projectRoot(), ".pi", "self-learning-memory");
  if (root === legacyRoot) return;
  if (!existsSync(legacyRoot)) return;
  if (!isDirectoryEmpty(root)) return;

  copyRecursive(legacyRoot, root);
}

function ensureMemoryFiles(root: string): void {
  ensureDir(root);
  ensureDir(dailyDir(root));
  ensureDir(monthlyDir(root));
  ensureDir(coreDir(root));

  const readmePath = join(root, "README.md");
  if (!existsSync(readmePath)) {
    writeFileSync(readmePath, "# Self-learning memory\n\nManaged by Pixel's self-learning runtime.\n", "utf-8");
  }

  if (!existsSync(coreFile(root))) {
    writeFileSync(coreFile(root), "# Core Learnings\n\n## High-value learnings\n- (none yet)\n\n## Watch-outs\n- (none yet)\n", "utf-8");
  }

  if (!existsSync(longTermFile(root))) {
    writeFileSync(longTermFile(root), "# Long-term Memory\n\n## All learnings\n- (none yet)\n\n## All watch-outs\n- (none yet)\n", "utf-8");
  }

  if (!existsSync(coreIndexFile(root))) {
    writeFileSync(
      coreIndexFile(root),
      `${JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), items: [] }, null, 2)}\n`,
      "utf-8",
    );
  }
}

function runGit(root: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf-8",
    timeout: 30000,
  });

  return {
    ok: !result.error && result.status === 0,
    stdout: result.stdout || "",
    stderr: [result.stderr || "", result.error?.message || ""].filter(Boolean).join("\n"),
  };
}

function normalizeKey(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function todayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function timeKey(date: Date): string {
  return `${date.toISOString().slice(11, 16)} UTC`;
}

function normalizeList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const text = entry.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  const firstNewline = trimmed.indexOf("\n");
  const lastFence = trimmed.lastIndexOf("```");
  if (firstNewline === -1 || lastFence <= firstNewline) return trimmed;
  return trimmed.slice(firstNewline + 1, lastFence).trim();
}

function extractFirstJsonObject(text: string): string | undefined {
  const input = stripCodeFence(text);
  const start = input.indexOf("{");
  if (start === -1) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return input.slice(start, i + 1);
    }
  }
  return undefined;
}

export function parseSelfLearningReflection(raw: string, maxItems: number): SelfLearningReflection | undefined {
  const candidates = [stripCodeFence(raw), extractFirstJsonObject(raw)].filter((value): value is string => !!value);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const mistakes = normalizeList(parsed.mistakes, maxItems);
      const fixes = normalizeList(parsed.fixes, maxItems);
      if (mistakes.length === 0 && fixes.length === 0) continue;
      return { mistakes, fixes };
    } catch {
      continue;
    }
  }
  return undefined;
}

export function buildSelfLearningReflectionPrompt(conversationText: string, config: SelfLearningConfig): string {
  return [
    "You are extracting self-learning notes from a completed agent turn.",
    "Focus on mistakes, friction, and the fixes that worked.",
    "Return STRICT JSON only with this schema:",
    '{"mistakes":["..."],"fixes":["..."]}',
    `Keep each list to at most ${config.maxLearnings} concise items.`,
    "Do not summarize accomplishments unless they encode a reusable fix.",
    "Prefer prevention-oriented wording.",
    "",
    "<conversation>",
    conversationText,
    "</conversation>",
  ].join("\n");
}

function loadCoreIndex(root: string): CoreIndex {
  ensureMemoryFiles(root);
  const parsed = readJson<CoreIndex>(coreIndexFile(root), {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: [],
  });

  return {
    version: 1,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    items: Array.isArray(parsed.items)
      ? parsed.items
          .filter((item) => isRecord(item))
          .map((item) => ({
            key: String(item.key || "").trim(),
            text: String(item.text || "").trim(),
            kind: item.kind === "watchout" ? "watchout" : "learning",
            hits: Number(item.hits) > 0 ? Number(item.hits) : 1,
            score: Number(item.score) > 0 ? Number(item.score) : 1,
            firstSeen: String(item.firstSeen || new Date().toISOString()),
            lastSeen: String(item.lastSeen || new Date().toISOString()),
          }))
          .filter((item) => item.key && item.text)
      : [],
  };
}

function writeCoreIndex(root: string, index: CoreIndex): string {
  writeFileSync(coreIndexFile(root), `${JSON.stringify(index, null, 2)}\n`, "utf-8");
  return coreIndexFile(root);
}

function sortCoreItems(items: CoreItem[]): CoreItem[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.hits !== a.hits) return b.hits - a.hits;
    return b.lastSeen.localeCompare(a.lastSeen);
  });
}

function updateCoreIndex(root: string, reflection: SelfLearningReflection, nowIso: string): CoreIndex {
  const index = loadCoreIndex(root);
  const map = new Map(index.items.map((item) => [item.key, item]));
  const updates = [
    ...reflection.fixes.map((text) => ({ text, kind: "learning" as const })),
    ...reflection.mistakes.map((text) => ({ text: `Avoid: ${text}`, kind: "watchout" as const })),
  ];

  for (const update of updates) {
    const text = update.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const key = normalizeKey(text);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        text,
        kind: update.kind,
        hits: 1,
        score: 1,
        firstSeen: nowIso,
        lastSeen: nowIso,
      });
      continue;
    }
    existing.text = text;
    existing.kind = update.kind;
    existing.hits += 1;
    existing.score += 1 + Math.min(existing.hits * 0.1, 1);
    existing.lastSeen = nowIso;
  }

  index.updatedAt = nowIso;
  index.items = [...map.values()];
  writeCoreIndex(root, index);
  return index;
}

function renderCore(root: string, index: CoreIndex, maxItems: number): string {
  const sorted = sortCoreItems(index.items);
  const learnings = sorted.filter((item) => item.kind === "learning").slice(0, Math.max(1, Math.ceil(maxItems / 2)));
  const watchouts = sorted.filter((item) => item.kind === "watchout").slice(0, Math.max(1, Math.floor(maxItems / 2)));

  const content = [
    "# Core Learnings",
    "",
    `Last updated: ${index.updatedAt}`,
    "",
    "## High-value learnings",
    ...(learnings.length > 0 ? learnings.map((item) => `- ${item.text}`) : ["- (none yet)"]),
    "",
    "## Watch-outs",
    ...(watchouts.length > 0 ? watchouts.map((item) => `- ${item.text.replace(/^Avoid:\s*/i, "")}`) : ["- (none yet)"]),
    "",
  ].join("\n");

  writeFileSync(coreFile(root), content, "utf-8");
  return coreFile(root);
}

function renderLongTermMemory(root: string, index: CoreIndex): string {
  const sorted = sortCoreItems(index.items);
  const learnings = sorted.filter((item) => item.kind === "learning");
  const watchouts = sorted.filter((item) => item.kind === "watchout");

  const content = [
    "# Long-term Memory",
    "",
    `Last updated: ${index.updatedAt}`,
    "",
    "## All learnings",
    ...(learnings.length > 0 ? learnings.map((item) => `- ${item.text}`) : ["- (none yet)"]),
    "",
    "## All watch-outs",
    ...(watchouts.length > 0 ? watchouts.map((item) => `- ${item.text.replace(/^Avoid:\s*/i, "")}`) : ["- (none yet)"]),
    "",
  ].join("\n");

  writeFileSync(longTermFile(root), content, "utf-8");
  return longTermFile(root);
}

function renderMonthlySummary(root: string, index: CoreIndex, date: Date): string {
  const month = monthKey(date);
  const monthItems = sortCoreItems(index.items).filter((item) => item.lastSeen.startsWith(month));
  const learnings = monthItems.filter((item) => item.kind === "learning").slice(0, 8);
  const watchouts = monthItems.filter((item) => item.kind === "watchout").slice(0, 8);
  const filePath = join(monthlyDir(root), `${month}.md`);

  const content = [
    `# ${month}`,
    "",
    "## Most important learnings",
    ...(learnings.length > 0 ? learnings.map((item) => `- ${item.text}`) : ["- (none yet this month)"]),
    "",
    "## Recurring issues",
    ...(watchouts.length > 0 ? watchouts.map((item) => `- ${item.text.replace(/^Avoid:\s*/i, "")}`) : ["- (none yet this month)"]),
    "",
  ].join("\n");

  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function commitMemoryFiles(root: string, files: string[], config: SelfLearningConfig): void {
  if (!config.git.enabled || !config.git.autoCommit) return;
  const relativeFiles = files.map((file) => relative(root, file)).filter((file) => file && !file.startsWith(".."));
  if (relativeFiles.length === 0) return;
  runGit(root, ["add", ...relativeFiles]);
  const status = runGit(root, ["status", "--porcelain"]);
  if (!status.ok || !status.stdout.trim()) return;
  runGit(root, ["commit", "-m", "chore(memory): update self-learning memory"]);
}

export function ensureSelfLearningInstalled(config = getSelfLearningConfig()): { root: string } {
  const root = getSelfLearningRoot(config);
  migrateLegacyProjectSelfLearningRoot(root);
  ensureMemoryFiles(root);
  if (config.git.enabled && !existsSync(join(root, ".git"))) {
    runGit(root, ["init"]);
  }
  return { root };
}

export function recordSelfLearningReflection(
  reflection: SelfLearningReflection,
  meta: { userId: string; platform: string; source?: string },
  config = getSelfLearningConfig(),
): { root: string; dailyFile: string; coreFile: string; monthlyFile: string; longTermFile: string } {
  const { root } = ensureSelfLearningInstalled(config);
  const now = new Date();
  const nowIso = now.toISOString();
  const dailyFile = join(dailyDir(root), `${todayKey(now)}.md`);
  const heading = `## ${timeKey(now)} - ${meta.source ?? "turn"} (${meta.platform}/${meta.userId})`;
  const entry = [
    heading,
    "",
    "### What went wrong",
    ...(reflection.mistakes.length > 0 ? reflection.mistakes.map((item) => `- ${item}`) : ["- (none)"]),
    "",
    "### How it was fixed",
    ...(reflection.fixes.length > 0 ? reflection.fixes.map((item) => `- ${item}`) : ["- (none)"]),
    "",
  ].join("\n");

  appendFileSync(dailyFile, `${entry}\n`, "utf-8");

  const index = updateCoreIndex(root, reflection, nowIso);
  const renderedCore = renderCore(root, index, config.maxCoreItems);
  const renderedLongTerm = renderLongTermMemory(root, index);
  const renderedMonthly = renderMonthlySummary(root, index, now);
  const renderedIndex = writeCoreIndex(root, index);
  commitMemoryFiles(root, [dailyFile, renderedCore, renderedLongTerm, renderedMonthly, renderedIndex], config);

  return {
    root,
    dailyFile,
    coreFile: renderedCore,
    monthlyFile: renderedMonthly,
    longTermFile: renderedLongTerm,
  };
}

function latestDailyFiles(root: string, take: number): string[] {
  if (take <= 0 || !existsSync(dailyDir(root))) return [];
  return readdirSync(dailyDir(root))
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .sort()
    .slice(-take)
    .map((name) => join(dailyDir(root), name));
}

function latestMonthlyFile(root: string): string | undefined {
  if (!existsSync(monthlyDir(root))) return undefined;
  return readdirSync(monthlyDir(root))
    .filter((name) => /^\d{4}-\d{2}\.md$/.test(name))
    .sort()
    .map((name) => join(monthlyDir(root), name))
    .at(-1);
}

function readText(filePath: string): string {
  if (!existsSync(filePath)) return "";
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function getSelfLearningPromptContext(config = getSelfLearningConfig()): string {
  if (!config.enabled || !config.context.enabled) return "";

  const { root } = ensureSelfLearningInstalled(config);
  const sections: string[] = [];
  const maxChars = Math.max(2000, config.context.maxChars || 12000);
  const toProjectRelative = (filePath: string) => relative(projectRoot(), filePath) || filePath;

  if (config.context.includeCore && existsSync(coreFile(root))) {
    sections.push(`## ${toProjectRelative(coreFile(root))}\n${compactText(readText(coreFile(root)).trim(), Math.floor(maxChars / 2))}`);
  }

  for (const file of latestDailyFiles(root, Math.max(0, config.context.includeLastNDaily || 0))) {
    sections.push(`## ${toProjectRelative(file)}\n${compactText(readText(file).trim(), Math.floor(maxChars / 3))}`);
  }

  if (config.context.includeLatestMonthly) {
    const monthly = latestMonthlyFile(root);
    if (monthly) {
      sections.push(`## ${toProjectRelative(monthly)}\n${compactText(readText(monthly).trim(), Math.floor(maxChars / 3))}`);
    }
  }

  if (sections.length === 0) return "";

  const policy = config.context.instructionMode === "strict"
    ? [
        "You MUST consult self-learning memory when the user asks about prior fixes, repeated mistakes, historical decisions, or regressions.",
        `Start with ${toProjectRelative(coreFile(root))}, then consult daily or monthly logs if needed.`,
      ].join(" ")
    : config.context.instructionMode === "advisory"
      ? `Consult self-learning memory at ${toProjectRelative(root)} when history matters.`
      : "";

  return compactText(["## Self-learning memory", policy, ...sections].filter(Boolean).join("\n\n"), maxChars);
}
