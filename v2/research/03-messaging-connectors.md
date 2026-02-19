# Messaging Platform Connectors Research

> Researched: 2026-02-09

## Implementation Order
1. **Telegram** (easiest, minutes to set up, official API)
2. **WhatsApp** (medium, QR auth, ban risk, but 2B users)
3. **Instagram** (hardest, weeks of Meta verification, deprioritize)

---

## Telegram: grammY

### Decision: grammY over Telegraf
- grammY: 3.3k stars, Bot API 9.4 (current), TypeScript-first, Bun-native, active
- Telegraf: 9.1k stars, Bot API 7.1 (2 years behind), last release Feb 2024, staling

### Package: `grammy`
- License: MIT
- Memory: ~20-30MB
- Auth: Bot token from @BotFather (just a string, no session management)
- Bun: Yes (explicitly supported)

### Minimum Viable Connector (~30 lines)
```typescript
import { Bot } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command("start", (ctx) => ctx.reply("Hello! I'm Pixel."));

bot.on("message:text", async (ctx) => {
  const response = await agent.processMessage(ctx.message.text, {
    userId: ctx.from.id.toString(),
    platform: "telegram",
  });
  await ctx.reply(response);
});

bot.start(); // long polling
```

### Webhook Mode (for production behind Caddy)
```typescript
import { webhookCallback } from "grammy";
// Mount on Hono:
app.post("/webhook/telegram", webhookCallback(bot, "std/http"));
```

### Key Features
- Sessions plugin (persist conversation state)
- Conversations plugin (multi-step dialogs)
- Auto-retry on flood limits
- Inline keyboards, menus
- File/photo/voice handling

### Gotchas
- Almost none. Telegram bots are the easiest platform to build for.
- Rate limit: 30 msgs/sec to same chat, 20 msgs/min to same group

---

## WhatsApp: Baileys

### Decision: Baileys over whatsapp-web.js
- Baileys: 8.1k stars, pure WebSocket, Bun-native, ~50-100MB RAM
- whatsapp-web.js: 21.1k stars, but runs Puppeteer/Chromium (~300-500MB RAM), not Bun-compatible

### Package: `@whiskeysockets/baileys`
- Version: v7.x (v7.0.0-rc.9)
- License: MIT
- Auth: QR code scan (no API tokens)
- Bun: Yes (explicitly listed)

### Minimum Viable Connector (~60 lines)
```typescript
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";

const { state, saveCreds } = await useMultiFileAuthState("./wa-auth");
const sock = makeWASocket({ auth: state });

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
  if (qr) console.log("Scan QR:", qr); // render with qrcode-terminal
  if (connection === "close") {
    const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
    if (shouldReconnect) reconnect();
  }
});

sock.ev.on("messages.upsert", async ({ messages }) => {
  const msg = messages[0];
  if (!msg.key.fromMe && msg.message?.conversation) {
    const response = await agent.processMessage(msg.message.conversation, {
      userId: msg.key.remoteJid!,
      platform: "whatsapp",
    });
    await sock.sendMessage(msg.key.remoteJid!, { text: response });
  }
});
```

### Critical Challenges
1. **QR Code Auth**: First connection requires physical phone scan. Must display QR somehow (terminal, web page, Telegram notification to admin).
2. **Ban Risk**: WhatsApp detects unofficial clients. Avoid bulk messaging, rapid rates, bot-like patterns. No guarantees.
3. **Session Persistence**: Auth state must survive restarts. `useMultiFileAuthState` writes to disk. Can implement custom store (Postgres, Redis).
4. **Reconnection**: Manual handling required. Must watch `connection.update` events.
5. **Breaking Changes**: v7.0 had multiple breaking changes. Protocol is reverse-engineered.
6. **No Official API**: This is unofficial. WhatsApp Business API exists but requires Meta Business verification (same as Instagram).

### Plan
- Budget 2x the estimated time (not "50-100 lines" as V2 AGENTS.md claimed)
- Core connector: ~150-200 lines including reconnection, session management, error handling
- Implement in Week 3

---

## Instagram: Meta Graph API

### The Hard Truth
Instagram DM automation is **bureaucratically blocked**, not technically blocked.

### Requirements (before writing a single line of code)
1. Meta Developer Account
2. Meta Business Portfolio
3. Instagram Professional Account (Business or Creator)
4. Facebook Page linked to Instagram account
5. App Review for `instagram_manage_messages` permission
6. Business Verification by Meta (days to weeks)
7. HTTPS webhook endpoint

### Limitations
- **24-hour messaging window**: Can only respond within 24h of user's last message
- **No proactive messaging**: Cannot initiate conversations
- **Personal accounts excluded**: Must be Professional
- **No unofficial alternatives**: All unmaintained, extremely ban-prone

### Code (once you have access)
```typescript
// Webhook to receive messages
app.post("/webhook/instagram", async (c) => {
  const body = await c.req.json();
  const { sender, message } = body.entry[0].messaging[0];
  
  const response = await agent.processMessage(message.text, {
    userId: sender.id,
    platform: "instagram",
  });
  
  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: sender.id },
      message: { text: response },
    }),
  });
  return c.text("OK");
});
```

### Verdict
**Deprioritize to Month 2 or later.** The Meta Business verification process alone could take weeks. The 24-hour window and no-proactive-messaging rules make it less useful for an AI agent anyway. Focus on Telegram and WhatsApp first.

---

## Connector Architecture Pattern

All connectors follow the same pattern:

```
Platform SDK/API
  |
  v
Connector (adapter layer, ~50-200 lines)
  - Receives platform-specific message
  - Extracts: text, userId, platform, metadata
  - Calls: agent.processMessage(text, context)
  - Returns: response in platform format
  |
  v
Agent Core (pi-agent-core)
  - Conversation management
  - Tool calling
  - LLM interaction
  |
  v
Response back through connector
```

### Shared Context Object
```typescript
interface MessageContext {
  userId: string;
  platform: "telegram" | "whatsapp" | "instagram" | "nostr" | "http";
  conversationId?: string;
  metadata?: Record<string, any>;
}
```
