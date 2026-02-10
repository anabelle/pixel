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
import { createPixelAgent } from "./agent.js";
import * as schema from "./db.js";

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

/** Extract text from a pi-agent-core message */
function extractText(message: any): string {
  if (!message) return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("");
  }
  // Fallback: try to stringify
  return String(content ?? "");
}

/** Simple chat endpoint (HTTP connector) */
app.post("/api/chat", async (c) => {
  try {
    const body = await c.req.json();
    const { message, userId = "anonymous" } = body;

    if (!message || typeof message !== "string") {
      return c.json({ error: "message is required" }, 400);
    }

    const agent = createPixelAgent({
      userId,
      platform: "http",
    });

    // Collect response from assistant message_end events only
    const responseChunks: string[] = [];
    agent.subscribe((event: any) => {
      console.log(`[chat] Event: ${event.type}${event.message?.role ? ` (role=${event.message.role})` : ""}`);

      if (event.type === "message_end" && event.message?.role === "assistant") {
        console.log(`[chat] Assistant message:`, JSON.stringify(event.message).slice(0, 500));
        const text = extractText(event.message);
        console.log(`[chat] Extracted text: "${text}"`);
        if (text) responseChunks.push(text);
      }
    });

    await agent.prompt(message);

    // Primary: use events. Fallback: read from agent state
    let responseText = responseChunks.join("\n");
    if (!responseText) {
      const state = agent.state;
      if (state?.messages) {
        const assistantMsgs = state.messages.filter(
          (m: any) => m.role === "assistant"
        );
        if (assistantMsgs.length > 0) {
          responseText = extractText(assistantMsgs[assistantMsgs.length - 1]);
        }
      }
    }

    if (!responseText) {
      responseText = "[No response generated — check AI provider config]";
    }

    console.log(`[chat] Response length: ${responseText.length}`);

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

  // TODO: Start connectors
  // - Telegram (grammY)
  // - Nostr (NDK)
  // - WhatsApp (Baileys) — Week 3
  // - Instagram — Month 2+

  console.log("[boot] Pixel V2 is alive.");
  console.log();
}

boot().catch((err) => {
  console.error("[boot] Fatal error:", err);
  process.exit(1);
});

export { app, db };
