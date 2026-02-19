/**
 * Server Registry — multi-server SSH management + authorization
 *
 * Loads config from /app/servers.json (baked into container image).
 * Handles:
 *  - Server resolution (host, user, key, wp_path, capabilities)
 *  - Authorization (global admins, per-server users/groups, tool tiers)
 *  - Command safety (per-server + global blocklists)
 *
 * Config structure:
 *   global_admins: string[]          — userIds with full access to everything
 *   tool_tiers.public: string[]      — tool names available to all users
 *   tool_tiers.server_admin: string[] — tools only for admins (global + per-server)
 *   servers.<name>: ServerEntry       — per-server config with authorized_users/groups
 *
 * Adding a new server:
 *   1. Add entry to servers.json under "servers"
 *   2. Add <NAME>_SSH_KEY to .env
 *   3. Add DNS to extra_hosts in docker-compose.yml (if behind CDN)
 *   4. Rebuild container
 */

import { readFileSync } from "fs";
import type { AgentTool } from "@mariozechner/pi-agent-core";

// ─── Types ────────────────────────────────────────────────────

export interface ServerEntry {
  label: string;
  host: string;
  user: string;
  key_env: string;
  wp_path: string | null;
  capabilities: string[];
  authorized_users: string[];
  authorized_groups: string[];
  blocked_patterns: string[];
}

interface RegistryConfig {
  global_admins: string[];
  tool_tiers: {
    public: string[];
    server_admin: string[];
  };
  servers: Record<string, ServerEntry>;
}

// ─── Registry Loading ─────────────────────────────────────────

let _config: RegistryConfig | null = null;

/** Load and cache the full config (servers + auth) */
function loadConfig(): RegistryConfig {
  if (_config) return _config;

  // Try file first (baked into container image via Dockerfile COPY)
  try {
    const raw = readFileSync("/app/servers.json", "utf-8");
    _config = JSON.parse(raw) as RegistryConfig;
    return _config;
  } catch {
    // ignore
  }

  // Try env var fallback
  const envJson = process.env.SERVERS_REGISTRY;
  if (envJson) {
    try {
      _config = JSON.parse(envJson) as RegistryConfig;
      return _config;
    } catch (e) {
      console.error("[server-registry] Failed to parse SERVERS_REGISTRY env var:", e);
    }
  }

  // Empty defaults — everything locked down, no servers
  _config = { global_admins: [], tool_tiers: { public: [], server_admin: [] }, servers: {} };
  return _config;
}

// ─── Server Resolution ────────────────────────────────────────

/** Look up a server by name. Returns null if not found. */
export function resolveServer(name: string): (ServerEntry & { name: string }) | null {
  const config = loadConfig();
  const entry = config.servers[name];
  if (!entry) return null;
  return { ...entry, name };
}

/** Get list of server names and labels (safe to expose to LLM — no keys) */
export function listServers(): Array<{ name: string; label: string; host: string; user: string; capabilities: string[]; wp_path: string | null }> {
  const config = loadConfig();
  return Object.entries(config.servers).map(([name, entry]) => ({
    name,
    label: entry.label,
    host: entry.host,
    user: entry.user,
    capabilities: entry.capabilities,
    wp_path: entry.wp_path,
  }));
}

/** Resolve the SSH private key for a server entry */
export function resolveServerKey(entry: ServerEntry): string | undefined {
  return process.env[entry.key_env];
}

// ─── Authorization ────────────────────────────────────────────

/** Check if a userId is a global admin (full access to everything) */
export function isGlobalAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  const config = loadConfig();
  return config.global_admins.includes(userId);
}

/** Check if a userId is authorized to access a specific server */
export function isServerAuthorized(serverName: string, userId: string | undefined): boolean {
  if (!userId) return false;

  // Global admins can access all servers
  if (isGlobalAdmin(userId)) return true;

  const entry = resolveServer(serverName);
  if (!entry) return false;

  // Direct user authorization
  if (entry.authorized_users.includes(userId)) return true;

  // Group authorization — if the userId is a group that's authorized
  if (entry.authorized_groups.includes(userId)) return true;

  return false;
}

/**
 * Check if a userId has elevated (server_admin) access.
 * True for: global admins, users authorized on ANY server, members of authorized groups.
 */
export function isElevatedUser(userId: string | undefined): boolean {
  if (!userId) return false;
  if (isGlobalAdmin(userId)) return true;

  const config = loadConfig();
  for (const server of Object.values(config.servers)) {
    if (server.authorized_users.includes(userId)) return true;
    if (server.authorized_groups.includes(userId)) return true;
  }

  return false;
}

/**
 * Check if a userId should get priority model access.
 * True for: global admins, users authorized on ANY server, members of authorized groups.
 */
export function isPriorityUser(userId: string | undefined): boolean {
  if (!userId) return false;
  if (isGlobalAdmin(userId)) return true;

  const config = loadConfig();
  for (const server of Object.values(config.servers)) {
    if (server.authorized_users.includes(userId)) return true;
    if (server.authorized_groups.includes(userId)) return true;
  }

  return false;
}

/**
 * Filter tools based on the caller's authorization level.
 *
 * - Global admins & server admins: get ALL tools (public + server_admin)
 * - Public users: get only tools listed in tool_tiers.public
 *
 * Tools not listed in any tier are treated as server_admin (safe default).
 */
export function getPermittedTools<T extends { name: string }>(
  userId: string | undefined,
  allTools: T[]
): T[] {
  // Elevated users (global admins + anyone authorized on any server) get everything
  if (isElevatedUser(userId)) return allTools;

  // Public users get only public-tier tools
  const config = loadConfig();
  const publicTools = new Set(config.tool_tiers.public);

  return allTools.filter(tool => publicTools.has(tool.name));
}

// ─── Command Safety ───────────────────────────────────────────

/** Check if a command matches any blocked pattern for a server */
export function isCommandBlocked(serverName: string, command: string): string | null {
  const entry = resolveServer(serverName);
  if (!entry) return null;

  for (const pattern of entry.blocked_patterns) {
    try {
      const regex = new RegExp(pattern, "i");
      if (regex.test(command)) {
        return `Command blocked by safety rule on server "${serverName}": matches pattern /${pattern}/i`;
      }
    } catch {
      // Invalid regex in config — skip
    }
  }
  return null;
}

/** Global blocklist — always checked regardless of server config */
const GLOBAL_BLOCKED = [
  /mkfs\s/i,
  /dd\s+if=\/dev/i,
  />\s*\/dev\/sd/i,
  /chmod\s+-R\s+777\s+\//i,
  /:(){ :\|:& };:/,  // fork bomb
];

export function isCommandGloballyBlocked(command: string): string | null {
  for (const regex of GLOBAL_BLOCKED) {
    if (regex.test(command)) {
      return `Command blocked by global safety rule: matches ${regex.toString()}`;
    }
  }
  return null;
}
