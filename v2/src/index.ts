/**
 * Pixel V2 — Entry Point
 *
 * One brain, many doors.
 * Boot sequence: Database → Hono HTTP server → Connectors
 */

import { Hono } from "hono";
import { serve } from "bun";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { promptWithHistory, extractText } from "./agent.js";
import * as schema from "./db.js";
import { startTelegram } from "./connectors/telegram.js";
import { startNostr } from "./connectors/nostr.js";
import { startWhatsApp } from "./connectors/whatsapp.js";
import { getConversationStats } from "./conversations.js";
import { initLightning, createInvoice, verifyPayment, getWalletInfo } from "./services/lightning.js";
import { initRevenue, recordRevenue, getRevenueStats } from "./services/revenue.js";
import { initUsers, getUserStats } from "./services/users.js";
import { startHeartbeat, getHeartbeatStatus } from "./services/heartbeat.js";
import { l402 } from "./services/l402.js";
import { getInnerLifeStatus } from "./services/inner-life.js";
import { audit, getRecentAudit } from "./services/audit.js";
import { startDigest, alertOwner, getDigestStatus } from "./services/digest.js";
import { startJobs, enqueueJob, getRecentJobs } from "./services/jobs.js";

// ============================================================
// Configuration
// ============================================================

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/pixel_v2";

// ============================================================
// Database
// ============================================================

const sql = postgres(DATABASE_URL);
const db = drizzle(sql, { schema });

// ============================================================
// Hono HTTP Server
// ============================================================

const app = new Hono();

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
    timestamp: new Date().toISOString(),
  });
});

/** Agent card (A2A / ERC-8004 discovery) */
app.get("/.well-known/agent-card.json", (c) => {
  return c.json({
    name: "Pixel",
    description: "Living digital artist. Creates art, writes code, survives on Lightning micropayments.",
    version: "2.0.0",
    protocols: ["nostr", "lightning", "l402", "x402"],
    capabilities: ["text-generation", "conversation"],
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
  return c.json({
    treasury: {
      recordedSats: revenueStats.totalSats,
      bySource: revenueStats.bySource,
      note: "Recorded revenue only. Historical balance (~80k sats) not included.",
    },
    users: userStats,
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

/** Wallet info */
app.get("/api/wallet", async (c) => {
  const info = await getWalletInfo();
  if (!info) {
    return c.json({ error: "Lightning not configured", active: false }, 503);
  }
  return c.json(info);
});

/** Revenue stats */
app.get("/api/revenue", async (c) => {
  const stats = await getRevenueStats();
  return c.json(stats);
});

/** Job queue */
app.post("/api/job", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  const toolsAllowed = Array.isArray(body?.toolsAllowed) ? body.toolsAllowed : undefined;

  if (!prompt.trim()) {
    return c.json({ error: "prompt is required" }, 400);
  }

  const job = enqueueJob(prompt, toolsAllowed);
  return c.json({ job });
});

app.get("/api/jobs", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "10", 10);
  const jobs = getRecentJobs(Math.min(limit, 50));
  return c.json({ jobs });
});

/** Recent audit entries */
app.get("/api/audit", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const entries = getRecentAudit(Math.min(limit, 200));
  return c.json({ entries, count: entries.length });
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

      const l402Info = c.get("l402");

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

      const l402Info = c.get("l402");

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
    console.log("[db] Tables verified");

    // Initialize revenue tracking
    initRevenue(db);

    // Initialize user tracking
    initUsers(db);

    // Create unique index for user upsert (idempotent)
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_platform_id_platform_idx ON users (platform_id, platform)`;
    console.log("[db] User tracking index verified");
  } catch (err: any) {
    console.error("[db] PostgreSQL connection failed:", err.message);
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

  // Start job runner
  startJobs();

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

boot().catch((err) => {
  console.error("[boot] Fatal error:", err);
  process.exit(1);
});

export { app, db };
