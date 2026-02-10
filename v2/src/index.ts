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
    capabilities: ["text-generation", "image-generation", "art-commission"],
    endpoints: {
      chat: "/api/chat",
      health: "/health",
    },
    identity: {
      nostr: process.env.NOSTR_PUBLIC_KEY ?? "",
      lightning: "sparepicolo55@walletofsatoshi.com",
      bitcoin: "bc1q7e33r989x03ynp6h4z04zygtslp5v8mcx535za",
    },
    pricing: {
      model: "per-request",
      currency: "sats",
      base_cost: 1,
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
  // TODO: query revenue table once populated
  return c.json({
    treasury: {
      sats: 80000,
      note: "Approximate. NWC integration pending.",
    },
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

// ============================================================
// Boot
// ============================================================

async function boot() {
  console.log("=".repeat(60));
  console.log("  PIXEL V2 — One brain, many doors.");
  console.log("=".repeat(60));
  console.log();

  // Test database connection
  try {
    const result = await sql`SELECT 1 as ok`;
    console.log("[db] PostgreSQL connected");
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

  try {
    await startWhatsApp();
  } catch (err: any) {
    console.error("[boot] WhatsApp failed to start:", err.message);
  }

  console.log("[boot] Pixel V2 is alive.");
  console.log();
}

boot().catch((err) => {
  console.error("[boot] Fatal error:", err);
  process.exit(1);
});

export { app, db };
