/**
 * Clawstr CLI wrapper for Pixel V2
 * Uses docker-cli to run the Clawstr CLI in a Node container with host-mounted config.
 */

const hostPixelRoot = process.env.HOST_PIXEL_ROOT ?? "/home/pixel/pixel";
const clawstrHostDir = `${hostPixelRoot}/data/clawstr`;

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
  const output = await runClawstrCommand(["notifications", "--limit", String(limit)]);
  return { output, count: parseNotificationCount(output) };
}

export async function getClawstrFeed(subclaw?: string, limit = 15): Promise<string> {
  const args = subclaw
    ? ["show", subclaw, "--limit", String(limit)]
    : ["recent", "--limit", String(limit)];
  return runClawstrCommand(args);
}

export async function getClawstrSearch(query: string, limit = 15): Promise<string> {
  return runClawstrCommand(["search", query, "--limit", String(limit)]);
}

export async function postClawstr(subclaw: string, content: string): Promise<string> {
  return runClawstrCommand(["post", subclaw, content]);
}

export async function replyClawstr(eventRef: string, content: string): Promise<string> {
  return runClawstrCommand(["reply", eventRef, content]);
}

export async function upvoteClawstr(eventRef: string): Promise<string> {
  return runClawstrCommand(["upvote", eventRef]);
}

export { runClawstrCommand };
