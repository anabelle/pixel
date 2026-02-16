/**
 * Pixel V2 — Entry Point
 *
 * One brain, many doors.
 * Boot sequence: Database → Hono HTTP server → Connectors
 */

// ─── GLOBAL ERROR HANDLERS ───────────────────────────────────
// Prevent unhandled errors from crashing the process (pi-agent-core
// can emit errors outside promise chains in its internal stream IIFE)
process.on("unhandledRejection", (reason: any) => {
  console.error("[process] Unhandled rejection:", reason?.message ?? reason);
});
process.on("uncaughtException", (err: Error) => {
  console.error("[process] Uncaught exception:", err.message);
  // Don't exit — let the agent keep running
});

import { Hono } from "hono";
import { serve } from "bun";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq } from "drizzle-orm";
import postgres from "postgres";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { promptWithHistory, extractText } from "./agent.js";
import { generateImage } from "./services/image-gen.js";
import { uploadToBlossom } from "./services/blossom.js";
import * as schema from "./db.js";
import { startTelegram } from "./connectors/telegram.js";
import { startNostr } from "./connectors/nostr.js";
import { startWhatsApp, repairWhatsApp, getWhatsAppStatus, getWhatsAppQr } from "./connectors/whatsapp.js";
import { getConversationStats } from "./conversations.js";
import { initLightning, createInvoice, verifyPayment, getWalletInfo } from "./services/lightning.js";
import { initRevenue, recordRevenue, getRevenueStats } from "./services/revenue.js";
import { initUsers, getUserStats } from "./services/users.js";
import { startHeartbeat, getHeartbeatStatus, stopHeartbeat } from "./services/heartbeat.js";
import { l402 } from "./services/l402.js";
import { getInnerLifeStatus } from "./services/inner-life.js";
import { audit, getRecentAudit } from "./services/audit.js";
import { startDigest, alertOwner, getDigestStatus, stopDigest } from "./services/digest.js";
import { startOutreach, getOutreachStatus, stopOutreach } from "./services/outreach.js";
import { startJobs, enqueueJob, getRecentJobs, stopJobs, markRunningJobsFailed } from "./services/jobs.js";
import { costMonitor } from "./services/cost-monitor.js";
import { startScheduler as startReminders, initReminders, getReminderStats } from "./services/reminders.js";
import { initMemory, getMemoryStats, listMemories } from "./services/memory.js";
import { decodeOwnerPubkeyHex, NostrAuthError, verifyNip98AuthorizationHeader } from "./services/nostr-auth.js";

// ============================================================
// Configuration
// ============================================================

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/pixel_v2";
const DATA_DIR = process.env.INNER_LIFE_DIR ?? "./data";
const SKILLS_DIR = process.env.SKILLS_DIR ?? "./skills";
const CONVERSATIONS_DIR = process.env.DATA_DIR ?? "./conversations";

// Dashboard privacy: public metrics by default, sensitive details behind NIP-07+NIP-98 owner auth
const DASHBOARD_OWNER_NPUB =
  process.env.DASHBOARD_OWNER_NPUB ??
  "npub1m3hxtn6auzjfdwux4cpzrpzt8dyt60dzvs7dm08rfes82jk9hxtseudltp";
let DASHBOARD_OWNER_PUBKEY_HEX: string | null = null;
try {
  DASHBOARD_OWNER_PUBKEY_HEX = decodeOwnerPubkeyHex(DASHBOARD_OWNER_NPUB);
} catch {
  DASHBOARD_OWNER_PUBKEY_HEX = null;
}

// ============================================================
// Database
// ============================================================

const sql = postgres(DATABASE_URL);
const db = drizzle(sql, { schema });

// ============================================================
// Hono HTTP Server
// ============================================================

const app = new Hono();

function getRequestOrigin(c: any): string {
  const proto = c.req.header("x-forwarded-proto") ?? c.req.header("x-forwarded-scheme") ?? "http";
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "localhost";
  return `${proto}://${host}`;
}

async function requireOwnerNostrAuth(c: any, next: any) {
  if (!DASHBOARD_OWNER_PUBKEY_HEX) {
    return c.json({ error: "Dashboard owner not configured" }, 503);
  }

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  try {
    const url = new URL(c.req.url);
    const origin = getRequestOrigin(c);
    const requestUrl = url.pathname + url.search;
    const method = c.req.method;

    // Only require payload tag if there is a body.
    let requestBody: string | undefined;
    if (method !== "GET" && method !== "HEAD") {
      requestBody = await c.req.raw.clone().text();
    }

    verifyNip98AuthorizationHeader(c.req.header("authorization"), {
      ownerPubkeyHex: DASHBOARD_OWNER_PUBKEY_HEX,
      requestUrl,
      requestMethod: method,
      requestBody,
      origin,
      maxSkewSeconds: 60,
    });

    return await next();
  } catch (err: any) {
    if (err instanceof NostrAuthError) {
      return c.json({ error: err.message, code: err.code }, err.status);
    }
    return c.json({ error: "Unauthorized" }, 401);
  }
}

function readTextFile(path: string, maxLen = 12000): { content: string; truncated: boolean; updatedAt: string | null } {
  if (!existsSync(path)) return { content: "", truncated: false, updatedAt: null };
  try {
    const content = readFileSync(path, "utf-8");
    const truncated = content.length > maxLen;
    const stats = statSync(path);
    return {
      content: truncated ? content.slice(0, maxLen) : content,
      truncated,
      updatedAt: stats.mtime.toISOString(),
    };
  } catch {
    return { content: "", truncated: false, updatedAt: null };
  }
}

function readJsonFile<T>(path: string): { data: T | null; updatedAt: string | null } {
  if (!existsSync(path)) return { data: null, updatedAt: null };
  try {
    const content = readFileSync(path, "utf-8");
    const stats = statSync(path);
    return { data: JSON.parse(content) as T, updatedAt: stats.mtime.toISOString() };
  } catch {
    return { data: null, updatedAt: null };
  }
}

function sanitizeAlarmMessage(message: string): string {
  return message.replace(/\[ALARM[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
}

/** Health check */
app.get("/health", (c) => {
  return c.json({
    status: "alive",
    version: "2.0.0",
    name: "pixel",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    heartbeat: getHeartbeatStatus(),
    innerLife: getInnerLifeStatus(),
    digest: getDigestStatus(),
    outreach: getOutreachStatus(),
    whatsapp: getWhatsAppStatus(),
    timestamp: new Date().toISOString(),
  });
});

/** WhatsApp re-pairing endpoint — clears auth, reconnects in specified mode */
app.post("/api/whatsapp/repair", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const mode = body?.mode === "pairing" ? "pairing" : "qr";
  console.log(`[http] WhatsApp re-pair requested (mode: ${mode})`);
  const result = await repairWhatsApp(mode);
  return c.json(result);
});

/** WhatsApp status endpoint */
app.get("/api/whatsapp/status", (c) => {
  return c.json(getWhatsAppStatus());
});

/** WhatsApp QR code scanning page — renders QR for phone to scan */
app.get("/api/whatsapp/qr", (c) => {
  const { qr, timestamp, expired } = getWhatsAppQr();
  const status = getWhatsAppStatus();

  // If already connected, show success
  if (status.registered) {
    return c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pixel WhatsApp</title>
<style>body{font-family:system-ui;max-width:500px;margin:40px auto;padding:20px;text-align:center;background:#0a0a0a;color:#e0e0e0}
.ok{color:#4caf50;font-size:2em}p{color:#888}</style></head>
<body><div class="ok">✅ WhatsApp Connected</div><p>Already paired and running.</p>
<p><a href="/api/whatsapp/status" style="color:#64b5f6">View status</a></p></body></html>`);
  }

  // Serve QR scanning page with auto-refresh
  return c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pixel WhatsApp — Scan QR</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:500px;margin:40px auto;padding:20px;text-align:center;background:#0a0a0a;color:#e0e0e0}
h1{font-size:1.4em;margin-bottom:4px}
.sub{color:#888;font-size:0.9em;margin-bottom:24px}
#qr-container{background:#fff;border-radius:12px;padding:20px;display:inline-block;margin:16px 0;min-height:264px;min-width:264px;position:relative}
#qr-container canvas{display:block}
.waiting{color:#888;padding:100px 20px;font-size:0.95em}
.status{margin-top:16px;padding:10px;border-radius:8px;font-size:0.85em}
.status.ok{background:#1b3a1b;color:#4caf50}
.status.wait{background:#3a3a1b;color:#ffc107}
.status.err{background:#3a1b1b;color:#ef5350}
.instructions{text-align:left;background:#1a1a1a;padding:16px;border-radius:8px;margin-top:20px;font-size:0.9em;line-height:1.6}
.instructions ol{margin:8px 0;padding-left:20px}
.age{color:#666;font-size:0.8em;margin-top:8px}
a{color:#64b5f6}
</style>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
</head>
<body>
<h1>🟢 Pixel WhatsApp</h1>
<p class="sub">Scan the QR code with your phone to link</p>

<div id="qr-container">
  <div class="waiting" id="qr-waiting">Waiting for QR code...</div>
</div>
<div id="age" class="age"></div>
<div id="status" class="status wait">Connecting...</div>

<div class="instructions">
  <strong>How to scan:</strong>
  <ol>
    <li>Open <strong>WhatsApp</strong> on your phone</li>
    <li>Go to <strong>Settings → Linked Devices</strong></li>
    <li>Tap <strong>Link a Device</strong></li>
    <li>Point your camera at the QR code above</li>
  </ol>
</div>

<script>
let lastQr = "";
let pollInterval = null;

async function poll() {
  try {
    // Check status first
    // Detect base path: if accessed via /v2/, use that prefix
    const base = location.pathname.startsWith("/v2/") ? "/v2" : "";
    const statusRes = await fetch(base + "/api/whatsapp/status");
    const st = await statusRes.json();

    if (st.registered) {
      document.getElementById("status").className = "status ok";
      document.getElementById("status").textContent = "✅ Connected! WhatsApp is linked.";
      document.getElementById("qr-container").innerHTML = '<div class="waiting" style="color:#4caf50">✅ Paired successfully!</div>';
      document.getElementById("age").textContent = "";
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      return;
    }

    // Fetch QR data
    const qrRes = await fetch(base + "/api/whatsapp/qr/data");
    const data = await qrRes.json();

    if (data.qr && !data.expired) {
      if (data.qr !== lastQr) {
        lastQr = data.qr;
        document.getElementById("qr-waiting").style.display = "none";
        // Clear previous canvas
        const container = document.getElementById("qr-container");
        const oldCanvas = container.querySelector("canvas");
        if (oldCanvas) oldCanvas.remove();
        const canvas = document.createElement("canvas");
        container.appendChild(canvas);
        QRCode.toCanvas(canvas, data.qr, { width: 264, margin: 0, color: { dark: "#000", light: "#fff" } });
      }
      const age = Math.round((Date.now() - data.timestamp) / 1000);
      document.getElementById("age").textContent = "QR age: " + age + "s (refreshes automatically)";
      document.getElementById("status").className = "status wait";
      document.getElementById("status").textContent = "⏳ Waiting for scan...";
    } else {
      document.getElementById("status").className = "status wait";
      document.getElementById("status").textContent = "⏳ Generating new QR code...";
      document.getElementById("age").textContent = "";
    }
  } catch (err) {
    document.getElementById("status").className = "status err";
    document.getElementById("status").textContent = "Error: " + err.message;
  }
}

poll();
pollInterval = setInterval(poll, 3000);
<\/script>
</body></html>`);
});

/** WhatsApp QR data endpoint (JSON — used by the QR page's JS) */
app.get("/api/whatsapp/qr/data", (c) => {
  return c.json(getWhatsAppQr());
});

/** Agent card (A2A / ERC-8004 discovery) */
app.get("/.well-known/agent-card.json", (c) => {
  return c.json({
    name: "Pixel",
    description: "Living digital artist. Creates art, writes code, survives on Lightning micropayments.",
    version: "2.0.0",
    protocols: ["nostr", "lightning", "l402", "x402"],
    capabilities: ["text-generation", "conversation", "image-generation"],
    endpoints: {
      chat: "/api/chat",
      "chat-premium": "/api/chat/premium",
      generate: "/api/generate",
      health: "/health",
    },
    identity: {
      nostr: process.env.NOSTR_PUBLIC_KEY ?? "",
      lightning: "sparepiccolo55@walletofsatoshi.com",
      bitcoin: "bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za",
    },
    pricing: {
      model: "per-request",
      currency: "sats",
      free: { chat: "/api/chat" },
      l402: {
        "chat-premium": { sats: 10, description: "Priority chat response" },
        generate: { sats: 50, description: "AI text generation" },
        "generate-image": { sats: 80, description: "AI image generation" },
      },
    },
  });
});

/** Simple chat endpoint (HTTP connector) */
app.post("/api/chat", async (c) => {
  try {
    const body = await c.req.json();
    const { message, userId = "anonymous" } = body;

    if (!message || typeof message !== "string") {
      return c.json({ error: "message is required" }, 400);
    }

    const responseText = await promptWithHistory(
      { userId, platform: "http" },
      message
    );

    if (!responseText) {
      return c.json({
        response: "[No response generated — check AI provider config]",
        userId,
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({
      response: responseText,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[chat] Error:", error);
    return c.json({ error: error.message ?? "Internal error" }, 500);
  }
});

/** Revenue stats */
app.get("/api/stats", async (c) => {
  const revenueStats = await getRevenueStats();
  const userStats = await getUserStats();
  const memStats = await getMemoryStats();
  return c.json({
    treasury: {
      recordedSats: revenueStats.totalSats,
      bySource: revenueStats.bySource,
      note: "Recorded revenue only. Historical balance (~80k sats) not included.",
    },
    users: userStats,
    memory: memStats,
    containers: 4,
    version: "2.0.0",
  });
});

/** User conversation stats */
app.get("/api/user/:userId/stats", async (c) => {
  const userId = c.req.param("userId");
  const stats = getConversationStats(userId);
  return c.json(stats);
});

/** Create a Lightning invoice */
app.post("/api/invoice", async (c) => {
  try {
    const body = await c.req.json();
    const { amountSats = 100, comment } = body;

    if (typeof amountSats !== "number" || amountSats < 1) {
      return c.json({ error: "amountSats must be a positive number" }, 400);
    }

    const invoice = await createInvoice(amountSats, comment ?? "Pixel payment");
    if (!invoice) {
      return c.json({ error: "Failed to create invoice — Lightning not configured" }, 503);
    }

    return c.json(invoice);
  } catch (error: any) {
    console.error("[invoice] Error:", error.message);
    return c.json({ error: error.message }, 500);
  }
});

/** Verify a Lightning payment */
app.get("/api/invoice/:paymentHash/verify", async (c) => {
  const paymentHash = c.req.param("paymentHash");
  const result = await verifyPayment(paymentHash);

  // Record revenue if payment is confirmed
  if (result.paid && result.amountSats) {
    await recordRevenue({
      source: "http",
      amountSats: result.amountSats,
      txHash: paymentHash,
      description: result.description ?? "HTTP invoice payment",
    }).catch(() => {}); // Non-blocking
  }

  return c.json(result);
});


/** Cost monitoring — track AI model usage and savings */
app.get("/api/costs", (c) => {
  const report = costMonitor.getReport();
  return c.json(report);
});

/** Job queue */
app.post("/api/job", requireOwnerNostrAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  const toolsAllowed = Array.isArray(body?.toolsAllowed) ? body.toolsAllowed : undefined;

  if (!prompt.trim()) {
    return c.json({ error: "prompt is required" }, 400);
  }

  const job = enqueueJob(prompt, toolsAllowed);
  return c.json({ job });
});

/** Recent audit entries (public — operational telemetry, no secrets) */
app.get("/api/audit", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const entries = getRecentAudit(Math.min(limit, 200));
  return c.json({ entries, count: entries.length });
});

/** Audit summary (safe for public) */
app.get("/api/audit/summary", (c) => {
  const entries = getRecentAudit(200);
  const byType: Record<string, number> = {};
  const lastByType: Record<string, string> = {};
  for (const e of entries) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
    lastByType[e.type] = e.ts;
  }
  const last = entries.length ? entries[entries.length - 1] : null;
  return c.json({ count: entries.length, byType, lastByType, lastTs: last?.ts ?? null });
});

/** Conversation log for a user (JSONL) */
app.get("/api/conversations/:userId", requireOwnerNostrAuth, (c) => {
  const userId = c.req.param("userId");
  const limitRaw = parseInt(c.req.query("limit") ?? "50", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);
  const safeId = userId.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  const logPath = join(CONVERSATIONS_DIR, safeId, "log.jsonl");

  if (!existsSync(logPath)) {
    return c.json({ messages: [], count: 0, userId: safeId });
  }

  try {
    const lines = readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
    const parsed = lines
      .map((line) => {
        try {
          return JSON.parse(line) as { ts: string; platform?: string; user?: string; assistant?: string };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is { ts: string; platform?: string; user?: string; assistant?: string } => !!entry);
    const slice = parsed.slice(-limit).reverse();
    const messages = slice.map((entry) => ({
      ts: entry.ts,
      platform: entry.platform ?? "",
      user: entry.user ?? "",
      assistant: entry.assistant ?? "",
    }));

    return c.json({ messages, count: messages.length, userId: safeId });
  } catch {
    return c.json({ messages: [], count: 0, userId: safeId });
  }
});

// ============================================================
// Dashboard Data Endpoints (read-only)
// ============================================================

/** Inner life documents + idea garden + projects */
app.get("/api/inner-life", requireOwnerNostrAuth, (c) => {
  const reflections = readTextFile(join(DATA_DIR, "reflections.md"));
  const learnings = readTextFile(join(DATA_DIR, "learnings.md"));
  const ideas = readTextFile(join(DATA_DIR, "ideas.md"));
  const evolution = readTextFile(join(DATA_DIR, "evolution.md"));
  const ideaGarden = readTextFile(join(DATA_DIR, "idea-garden.md"));
  const projects = readTextFile(join(DATA_DIR, "projects.md"));

  return c.json({
    reflections,
    learnings,
    ideas,
    evolution,
    ideaGarden,
    projects,
    status: getInnerLifeStatus(),
  });
});

/** Heartbeat status + raw heartbeat state file */
app.get("/api/heartbeat", requireOwnerNostrAuth, (c) => {
  const state = readJsonFile<Record<string, unknown>>(join(DATA_DIR, "heartbeat.json"));
  return c.json({
    status: getHeartbeatStatus(),
    state: state.data,
    updatedAt: state.updatedAt,
  });
});

/** Heartbeat summary (safe for public) */
app.get("/api/heartbeat/summary", (c) => {
  return c.json({ status: getHeartbeatStatus() });
});

/** Memory list (active by default) */
app.get("/api/memories", requireOwnerNostrAuth, async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const includeExpired = c.req.query("includeExpired") === "true";
  const type = c.req.query("type") ?? undefined;
  const source = c.req.query("source") ?? undefined;
  const userId = c.req.query("userId") ?? undefined;
  const platform = c.req.query("platform") ?? undefined;

  const memories = await listMemories({
    limit,
    includeExpired,
    type,
    source,
    userId,
    platform,
  });

  return c.json({
    memories,
    count: memories.length,
    includeExpired,
  });
});

/** Reminders list + stats */
app.get("/api/reminders", requireOwnerNostrAuth, async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const status = c.req.query("status") ?? "active";
  const userId = c.req.query("userId") ?? undefined;
  const platform = c.req.query("platform") ?? undefined;

  let reminders: any[] = [];
  let stats: Record<string, number> = {};
  if (db) {
    const filters = [status ? eq(schema.reminders.status, status) : undefined].filter(Boolean);
    if (userId) filters.push(eq(schema.reminders.userId, userId));
    if (platform) filters.push(eq(schema.reminders.platform, platform));

    reminders = await db
      .select()
      .from(schema.reminders)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(schema.reminders.dueAt))
      .limit(Math.min(limit, 200));

    try {
      const rows = await sql`SELECT status, COUNT(*) as count FROM reminders GROUP BY status`;
      stats = Object.fromEntries(rows.map((r: any) => [r.status, Number(r.count)]));
    } catch {
      stats = {};
    }
  }

  const sanitized = reminders.map((r) => ({
    ...r,
    rawMessage: sanitizeAlarmMessage(String(r.rawMessage ?? "")),
  }));

  return c.json({
    reminders: sanitized,
    count: sanitized.length,
    stats: Object.keys(stats).length ? stats : getReminderStats(),
  });
});

/** Cost history from disk (7 days) */
app.get("/api/costs/history", (c) => {
  const history = readJsonFile<{ entries?: unknown[]; lastSaved?: string }>(join(DATA_DIR, "costs.json"));
  return c.json({
    history: history.data ?? { entries: [] },
    updatedAt: history.updatedAt,
  });
});

/** Skills metadata + list of skill files */
app.get("/api/skills", (c) => {
  const meta = readJsonFile<Record<string, unknown>>(join(DATA_DIR, "skills.json"));
  let skills: { name: string; updatedAt: string | null }[] = [];

  if (existsSync(SKILLS_DIR)) {
    try {
      skills = readdirSync(SKILLS_DIR)
        .filter((file) => file.endsWith(".md"))
        .map((file) => {
          const full = join(SKILLS_DIR, file);
          try {
            const stats = statSync(full);
            return { name: file, updatedAt: stats.mtime.toISOString() };
          } catch {
            return { name: file, updatedAt: null };
          }
        });
    } catch {}
  }

  return c.json({
    meta: meta.data,
    updatedAt: meta.updatedAt,
    skills,
    count: skills.length,
  });
});

/** Pixel's recent Nostr posts (public) */
app.get("/api/posts", (c) => {
  const limitRaw = parseInt(c.req.query("limit") ?? "20", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 50);
  const postsPath = join(DATA_DIR, "nostr-posts.jsonl");

  if (!existsSync(postsPath)) {
    return c.json({ posts: [], count: 0 });
  }

  try {
    const lines = readFileSync(postsPath, "utf-8").split("\n").filter(Boolean);
    const parsed = lines
      .map((line) => {
        try {
          return JSON.parse(line) as { ts: number; content: string; type: string };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is { ts: number; content: string; type: string } => !!entry);

    // Return newest first, capped to limit
    const posts = parsed.slice(-limit).reverse();
    return c.json({ posts, count: posts.length, total: parsed.length });
  } catch {
    return c.json({ posts: [], count: 0 });
  }
});

/** Trending Nostr signals from heartbeat */
app.get("/api/trends", (c) => {
  const trends = readJsonFile<Record<string, unknown>>(join(DATA_DIR, "nostr-trends.json"));
  return c.json({
    trends: trends.data,
    updatedAt: trends.updatedAt,
  });
});

// ============================================================
// Sensitive existing endpoints
// ============================================================

/** Wallet info (sensitive) */
app.get("/api/wallet", requireOwnerNostrAuth, async (c) => {
  const info = await getWalletInfo();
  if (!info) {
    return c.json({ error: "Lightning not configured", active: false }, 503);
  }
  return c.json(info);
});

/** Revenue stats (sensitive: includes recent descriptions) */
app.get("/api/revenue", requireOwnerNostrAuth, async (c) => {
  const stats = await getRevenueStats();
  return c.json(stats);
});

/** Revenue summary (safe for public) */
app.get("/api/revenue/summary", async (c) => {
  const stats = await getRevenueStats();
  return c.json({ totalSats: stats.totalSats, bySource: stats.bySource });
});

/** Jobs list (sensitive: prompts + outputs) */
app.get("/api/jobs", requireOwnerNostrAuth, (c) => {
  const limit = parseInt(c.req.query("limit") ?? "10", 10);
  const jobs = getRecentJobs(Math.min(limit, 50));
  return c.json({ jobs });
});

/** Jobs summary (safe for public) */
app.get("/api/jobs/summary", (c) => {
  const jobs = getRecentJobs(50);
  const byStatus: Record<string, number> = {};
  let lastCompletedAt: number | null = null;
  for (const j of jobs) {
    byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
    if (typeof j.completedAt === "number") {
      lastCompletedAt = Math.max(lastCompletedAt ?? 0, j.completedAt);
    }
  }
  return c.json({ count: jobs.length, byStatus, lastCompletedAt: lastCompletedAt ? new Date(lastCompletedAt).toISOString() : null });
});

// ============================================================
// L402-Gated Premium Endpoints
// ============================================================

/** Premium chat — L402-gated at 10 sats per request */
app.post(
  "/api/chat/premium",
  l402({
    sats: 10,
    description: "Pixel premium chat — priority response",
    onPayment: (info) => {
      console.log(`[l402] Payment verified: ${info.amountSats} sats for ${info.endpoint}`);
    },
  }),
  async (c) => {
    try {
      const body = await c.req.json();
      const { message, userId = "anonymous" } = body;

      if (!message || typeof message !== "string") {
        return c.json({ error: "message is required" }, 400);
      }

      const responseText = await promptWithHistory(
        { userId, platform: "http-premium" },
        message
      );

      const l402Info = (c as any).get("l402") as { paymentHash?: string; amountSats?: number } | undefined;

      return c.json({
        response: responseText ?? "[No response generated]",
        userId,
        premium: true,
        payment: {
          paymentHash: l402Info?.paymentHash,
          amountSats: l402Info?.amountSats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[chat/premium] Error:", error);
      return c.json({ error: error.message ?? "Internal error" }, 500);
    }
  }
);

/** Text generation — L402-gated at 50 sats per request */
app.post(
  "/api/generate",
  l402({
    sats: 50,
    description: "Pixel AI text generation",
    onPayment: (info) => {
      console.log(`[l402] Generation paid: ${info.amountSats} sats`);
    },
  }),
  async (c) => {
    try {
      const body = await c.req.json();
      const { prompt, userId = "anonymous", maxLength } = body;

      if (!prompt || typeof prompt !== "string") {
        return c.json({ error: "prompt is required" }, 400);
      }

      // Use a generation-specific system context
      const genPrompt = `Generate the following (be creative, original, and concise):\n\n${prompt}`;
      const responseText = await promptWithHistory(
        { userId: `gen-${userId}`, platform: "http-generate" },
        genPrompt
      );

      const l402Info = (c as any).get("l402") as { paymentHash?: string; amountSats?: number } | undefined;

      return c.json({
        result: responseText ?? "[No response generated]",
        prompt,
        payment: {
          paymentHash: l402Info?.paymentHash,
          amountSats: l402Info?.amountSats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[generate] Error:", error);
      return c.json({ error: error.message ?? "Internal error" }, 500);
    }
  }
);

/** Image generation — L402-gated at 80 sats per request */
app.post(
  "/api/generate/image",
  l402({
    sats: 80,
    description: "Pixel AI image generation",
    onPayment: (info) => {
      console.log(`[l402] Image generation paid: ${info.amountSats} sats`);
    },
  }),
  async (c) => {
    try {
      const body = await c.req.json();
      const { prompt, model, ratio, size, upload = true, userId = "anonymous" } = body ?? {};

      if (!prompt || typeof prompt !== "string") {
        return c.json({ error: "prompt is required" }, 400);
      }

      const image = await generateImage(prompt, { model, ratio, size });

      let url: string | null = null;
      if (upload) {
        const uploaded = await uploadToBlossom(image.buffer, image.mimeType);
        url = uploaded.url;
      }

      const l402Info = (c as any).get("l402") as { paymentHash?: string; amountSats?: number } | undefined;

      return c.json({
        prompt,
        model: image.modelUsed,
        mimeType: image.mimeType,
        bytes: image.buffer.byteLength,
        path: image.path ?? null,
        url,
        payment: {
          paymentHash: l402Info?.paymentHash,
          amountSats: l402Info?.amountSats,
        },
        timestamp: new Date().toISOString(),
        userId,
      });
    } catch (error: any) {
      console.error("[generate/image] Error:", error);
      return c.json({ error: error.message ?? "Internal error" }, 500);
    }
  }
);

// ============================================================
// Boot
// ============================================================

async function boot() {
  console.log("=".repeat(60));
  console.log("  PIXEL V2 — One brain, many doors.");
  console.log("=".repeat(60));
  console.log();
  audit("boot", "Pixel V2 starting...");

  // Test database connection
  try {
    const result = await sql`SELECT 1 as ok`;
    console.log("[db] PostgreSQL connected");

    // Ensure tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS revenue (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        amount_sats BIGINT,
        amount_usd NUMERIC(10,4),
        user_id TEXT,
        description TEXT,
        tx_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        platform_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        display_name TEXT,
        memory_md TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        message_count INTEGER DEFAULT 0 NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        platform_chat_id TEXT,
        raw_message TEXT NOT NULL,
        due_at TIMESTAMPTZ NOT NULL,
        repeat_pattern TEXT,
        repeat_count INTEGER,
        fires_remaining INTEGER,
        last_fired_at TIMESTAMPTZ,
        status TEXT DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at) WHERE status = 'active'`;
    await sql`
      CREATE TABLE IF NOT EXISTS user_links (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        linked_user_id TEXT,
        linked_platform TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `;
    console.log("[db] Tables verified");

    // Initialize revenue tracking
    initRevenue(db);

    // Initialize user tracking
    initUsers(db);

    // Initialize reminder service
    initReminders(db);

    // Initialize memory system (pgvector)
    await initMemory(db, sql);

    // Create unique index for user upsert (idempotent)
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_platform_id_platform_idx ON users (platform_id, platform)`;
    console.log("[db] User tracking index verified");
  } catch (err: any) {
    console.error("[db] PostgreSQL connection failed:", err.message);
    if (err?.stack) {
      console.error("[db] PostgreSQL connection stack:", err.stack);
    }
    console.error("[db] Will continue without database — some features unavailable");
  }

  // Start HTTP server
  console.log(`[http] Starting Hono server on port ${PORT}`);

  serve({
    fetch: app.fetch,
    port: PORT,
  });

  console.log(`[http] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[http] Health: http://0.0.0.0:${PORT}/health`);
  console.log(`[http] Agent card: http://0.0.0.0:${PORT}/.well-known/agent-card.json`);
  console.log();

  // Initialize Lightning
  try {
    const lnOk = await initLightning();
    if (lnOk) {
      console.log("[boot] Lightning ready — invoices enabled");
    }
  } catch (err: any) {
    console.error("[boot] Lightning init failed:", err.message);
  }

  // Start connectors
  try {
    await startTelegram();
  } catch (err: any) {
    console.error("[boot] Telegram failed to start:", err.message);
  }

  try {
    console.log("[boot] Starting Nostr connector...");
    await startNostr();
  } catch (err: any) {
    console.error("[boot] Nostr failed to start:", err.message);
    console.error("[boot] Nostr stack:", err.stack);
  }

  // Start heartbeat AFTER Nostr (needs NDK instance)
  startHeartbeat();

  // Start digest/notification service
  startDigest();

  // Start proactive outreach (owner pings)
  startOutreach();

  // Start job runner
  startJobs();

  // Start reminder scheduler
  startReminders();

  try {
    await startWhatsApp();
  } catch (err: any) {
    console.error("[boot] WhatsApp failed to start:", err.message);
  }

  console.log("[boot] Pixel V2 is alive.");
  console.log();
  audit("boot", "Pixel V2 is alive — all services started");
  alertOwner("boot", "Pixel V2 just booted — all services started").catch(() => {});
}

// ============================================================
// Graceful Shutdown
// ============================================================

let shuttingDown = false;

function gracefulShutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] Received ${signal}, shutting down gracefully...`);

  // Stop accepting new work
  stopJobs();
  stopHeartbeat();
  stopDigest();
  stopOutreach();

  // Mark any in-flight jobs as failed so they don't get stuck
  try {
    markRunningJobsFailed(`Process shutdown (${signal})`);
  } catch (err: any) {
    console.error("[shutdown] Failed to mark running jobs:", err.message);
  }

  audit("shutdown", `Graceful shutdown on ${signal}`);
  console.log("[shutdown] Cleanup complete, exiting.");

  // Give a moment for audit write, then exit
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

boot().catch((err) => {
  console.error("[boot] Fatal error:", err);
  process.exit(1);
});

export { app, db };
