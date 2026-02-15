/**
 * Clawstr CLI wrapper for Pixel V2
 * Uses docker-cli to run the Clawstr CLI in a Node container with host-mounted config.
 */

const hostPixelRoot = process.env.HOST_PIXEL_ROOT ?? "/home/pixel/pixel";
const clawstrHostDir = `${hostPixelRoot}/data/clawstr`;
const clawstrContainerDir = "/app/data/.clawstr";

// Check if Clawstr is configured
let clawstrConfigured: boolean | null = null;

function isClawstrConfigured(): boolean {
  if (clawstrConfigured !== null) return clawstrConfigured;
  try {
    const fs = require('fs');
    clawstrConfigured =
      fs.existsSync(`${clawstrContainerDir}/config.json`) ||
      fs.existsSync(`${clawstrHostDir}/config.json`);
    return clawstrConfigured;
  } catch {
    clawstrConfigured = false;
    return false;
  }
}

async function runClawstrCommand(args: string[], timeoutMs = 60_000): Promise<string> {
  const proc = Bun.spawn([
    "docker",
    "run",
    "--rm",
    "-v",
    `${clawstrHostDir}:/root/.clawstr`,
    "node:22-alpine",
    "npx",
    "-y",
    "@clawstr/cli@latest",
    ...args,
  ], {
    cwd: "/app",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
    },
  });

  const timer = setTimeout(() => proc.kill(), timeoutMs);

  try {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;
    clearTimeout(timer);

    let output = "";
    if (stdout.trim()) output += stdout;
    if (stderr.trim()) output += (output ? "\n" : "") + stderr;
    if (!output.trim()) output = "(no output)";

    if (output.length > 50_000) {
      output = output.slice(0, 50_000) + `\n\n[... truncated, total ${output.length} chars]`;
    }

    if (exitCode !== 0) {
      throw new Error(`${output}\n\nExit code: ${exitCode}`);
    }

    return output.trim();
  } finally {
    clearTimeout(timer);
  }
}

function parseNotificationCount(output: string): number | null {
  const match = output.match(/Notifications?\s*\((\d+)\)/i);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isNaN(count) ? null : count;
}

export async function getClawstrNotifications(limit = 20): Promise<{ output: string; count: number | null }> {
  if (!isClawstrConfigured()) {
    return { output: "Clawstr not configured. Run `clawstr init` first.", count: null };
  }
  const output = await runClawstrCommand(["notifications", "--limit", String(limit)]);
  return { output, count: parseNotificationCount(output) };
}

export async function getClawstrFeed(subclaw?: string, limit = 15): Promise<string> {
  if (!isClawstrConfigured()) {
    return "Clawstr not configured. Run `clawstr init` first.";
  }
  const args = subclaw
    ? ["show", subclaw, "--limit", String(limit)]
    : ["recent", "--limit", String(limit)];
  return runClawstrCommand(args);
}

export async function getClawstrPost(eventRef: string): Promise<string> {
  if (!isClawstrConfigured()) {
    return "Clawstr not configured. Run `clawstr init` first.";
  }
  return runClawstrCommand(["show", eventRef]);
}

export async function getClawstrSearch(query: string, limit = 15): Promise<string> {
  if (!isClawstrConfigured()) {
    return "Clawstr not configured. Run `clawstr init` first.";
  }
  return runClawstrCommand(["search", query, "--limit", String(limit)]);
}

export async function postClawstr(subclaw: string, content: string): Promise<string> {
  if (!isClawstrConfigured()) {
    throw new Error("Clawstr not configured. Run `clawstr init` first.");
  }
  return runClawstrCommand(["post", subclaw, content]);
}

export async function replyClawstr(eventRef: string, content: string): Promise<string> {
  if (!isClawstrConfigured()) {
    throw new Error("Clawstr not configured. Run `clawstr init` first.");
  }
  return runClawstrCommand(["reply", eventRef, content]);
}

export async function upvoteClawstr(eventRef: string): Promise<string> {
  if (!isClawstrConfigured()) {
    throw new Error("Clawstr not configured. Run `clawstr init` first.");
  }
  return runClawstrCommand(["upvote", eventRef]);
}

export function extractNotificationIds(output: string): string[] {
  const ids = new Set<string>();
  const regex = /\bnote1[0-9a-z]+\b/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(output)) !== null) {
    ids.add(match[0]);
  }
  return Array.from(ids);
}

// Pixel's pubkey - don't reply to self
const PIXEL_PUBKEY = "5c22920b9761496e931f53a382c2def2ce9d24ebf0961603eda79f1b24b9f2bf";

export function isSelfPost(output: string): boolean {
  // Check if the post is from Pixel by looking for his pubkey in the output
  // Format: "💬 <pubkey> • <timestamp>" or similar patterns
  const lines = output.split("\n");
  for (const line of lines) {
    // Look for pubkey pattern in the line
    if (line.includes(PIXEL_PUBKEY.slice(0, 16))) {
      return true;
    }
    // Also check for npub format
    if (line.includes("npub1ts3fyzuhv9ykaycl2w3c9sk77t8f6f8t7ztpvqld5703kf9e72lsnsyjh6")) {
      return true;
    }
  }
  return false;
}

export { runClawstrCommand };
