# Infrastructure Research: Hono, Drizzle, Caddy

> Researched: 2026-02-09

---

## Hono v4.11.9

### Stats
- Repo: `honojs/hono` (28.7k stars)
- License: MIT
- Runtime: Bun, Node.js, Deno, Cloudflare Workers, AWS Lambda, etc.
- Size: Ultra-lightweight (~14KB core)

### Why Hono (not Express)
- TypeScript-first, type-safe middleware
- Multi-runtime (Bun native, no adapter needed)
- Built-in WebSocket support for Bun
- Middleware composition matches our payment middleware needs
- RPC-style type inference for client SDKs

### Bun Entry Point Pattern
```typescript
// IMPORTANT: Export both fetch and websocket for Bun
export default {
  port: 4000,
  fetch: app.fetch,
  websocket, // from upgradeWebSocket helper
};
```

### App Structure (best practice)
```typescript
// Use app.route() for sub-apps, NOT controllers
import { Hono } from "hono";

const app = new Hono();
const api = new Hono();
const webhooks = new Hono();

api.get("/health", (c) => c.json({ status: "ok" }));
api.post("/chat", (c) => { /* ... */ });

webhooks.post("/telegram", (c) => { /* ... */ });
webhooks.post("/instagram", (c) => { /* ... */ });

app.route("/api", api);
app.route("/webhooks", webhooks);
```

### Custom Middleware (for L402/x402)
```typescript
import { createMiddleware } from "hono/factory";

const l402Middleware = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth || !auth.startsWith("L402 ")) {
    // Create invoice, return 402
    c.header("WWW-Authenticate", `L402 invoice="...", macaroon="..."`);
    return c.text("Payment Required", 402);
  }
  // Verify preimage + macaroon
  await next();
});
```

### WebSocket (for canvas real-time updates)
```typescript
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";

const app = new Hono();

app.get("/ws", upgradeWebSocket(() => ({
  onMessage(event, ws) {
    ws.send(`Echo: ${event.data}`);
  },
  onOpen(event, ws) {
    console.log("Client connected");
  },
})));
```

### Gotchas
1. **CORS + WebSocket conflict**: Don't apply CORS middleware on WebSocket routes (immutable headers error)
2. **Bun export**: Must export `{ fetch: app.fetch, websocket }`, not just `export default app`
3. **Middleware order matters**: Auth middleware before route handlers

---

## Drizzle ORM v1.0 RC

### Stats
- Repo: `drizzle-team/drizzle-orm` (32.7k stars)
- License: Apache-2.0
- TypeScript-first, zero runtime overhead
- "If you know SQL, you know Drizzle"

### PostgreSQL Driver for Bun
```typescript
// Use postgres.js (recommended for Bun)
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);
```

### Schema Definition
```typescript
import { pgTable, text, integer, timestamp, jsonb, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  platform: text("platform").notNull(), // "telegram" | "whatsapp" | "nostr" | "http"
  platformId: text("platform_id").notNull(),
  displayName: text("display_name"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const revenue = pgTable("revenue", {
  id: uuid("id").defaultRandom().primaryKey(),
  protocol: text("protocol").notNull(), // "dvm" | "l402" | "x402" | "zap" | "canvas"
  platform: text("platform").notNull(),
  amountMsats: integer("amount_msats").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pixels = pgTable("pixels", {
  id: integer("id").primaryKey(), // pixel position
  color: text("color").notNull(),
  author: text("author"),
  paidMsats: integer("paid_msats"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### JSONB Columns
```typescript
// Type-safe JSONB with runtime validation
import { z } from "zod";

const MetadataSchema = z.object({
  platform: z.string(),
  messageId: z.string().optional(),
});

// In queries:
const result = await db.select().from(users);
// result[0].metadata is typed as Record<string, any>
// Validate at boundaries: MetadataSchema.parse(result[0].metadata)
```

### Migration Workflow
```bash
# Generate SQL migration from schema changes
bunx drizzle-kit generate

# Apply migrations to database
bunx drizzle-kit migrate

# NEVER use push in production
# bunx drizzle-kit push  # dev-only!
```

### drizzle.config.ts
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Gotchas
1. **`postgres.js` prepared statements**: Can cause issues in some environments. Use `prepare: false` if needed.
2. **`push` is dev-only**: Never use `drizzle-kit push` in production. Always use `generate` + `migrate`.
3. **JSONB typing**: `.$type<T>()` provides TypeScript types but NO runtime validation. Pair with Zod.
4. **Build order**: `npm run check` requires `npm run build` first (for `.d.ts` files).

---

## Caddy v2.10.2

### Stats
- Repo: `caddyserver/caddy` (69.7k stars)
- License: Apache-2.0
- Written in Go
- Docker: `caddy:2-alpine` (~40MB image)
- Memory: ~20-50MB runtime

### Why Caddy (not Nginx + Certbot)

| Feature | Nginx + Certbot | Caddy |
|---------|----------------|-------|
| Auto-HTTPS | Manual certbot cron | Automatic (built-in) |
| Config | 149 lines of nginx.conf | ~20 lines of Caddyfile |
| DNS resolution | `resolver 127.0.0.11` hack | Not needed |
| WebSocket proxy | `proxy_set_header Upgrade` | Transparent (zero config) |
| Container restart 502s | Requires DNS hack | Not an issue |
| SSL renewal | Certbot container + 12h cron | Built-in ACME |
| Memory | ~20MB + certbot | ~20-50MB |

### Caddyfile for V2
```caddyfile
pixel.xx.kg {
    reverse_proxy pixel:4000
}

ln.pixel.xx.kg {
    # API routes
    handle /api/* {
        reverse_proxy pixel:4000
    }
    
    # WebSocket for canvas (transparent, no special config)
    handle /socket.io/* {
        reverse_proxy pixel:4000
    }
    
    # Canvas frontend
    handle {
        reverse_proxy web:4001
    }
}
```

That's it. ~15 lines replaces 149 lines of nginx.conf + certbot container + certbot cron.

### Docker Setup
```yaml
caddy:
  image: caddy:2-alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data      # TLS certificates (MUST persist)
    - caddy_config:/config  # Runtime config
  restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
```

### Gotchas
1. **Persist `caddy_data` volume**: Contains TLS certificates. Losing this = rate limit issues with Let's Encrypt
2. **DNS must point to server**: Caddy validates domain ownership via ACME. DNS A records must be correct before first start.
3. **Port 80 must be open**: ACME HTTP challenge requires port 80 (even though traffic is HTTPS on 443).
4. **No `docker compose logs caddy` issues**: Unlike nginx, Caddy logs normally to stdout.
