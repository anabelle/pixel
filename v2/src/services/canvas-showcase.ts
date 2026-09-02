/**
 * Canvas Showcase — post the canvas "state of the art" as an image note.
 *
 * The canvas is Pixel's most unique artifact (infinite grid, collective art,
 * revenue engine) but her feed was text-only. This renders the live canvas
 * (GET /api/render.png auto-frames the bounding box of everything painted)
 * and publishes it to Nostr with a caption + NIP-92 imeta tag.
 */

import { NDKEvent } from "@nostr-dev-kit/ndk";
import { uploadToBlossom } from "./blossom.js";
import { getNostrInstance, publishNostrEvent } from "../connectors/nostr.js";
import { audit } from "./audit.js";

const CANVAS_API = process.env.CANVAS_SOCKET_URL ?? "http://pixel-api-1:3000";
const CANVAS_URL = "ln.pixel.xx.kg";

/** Rate limit: max 1 showcase per hour (public tool hygiene) */
let lastShowcaseAt = 0;
const SHOWCASE_COOLDOWN_MS = 60 * 60 * 1000;

export interface ShowcaseResult {
  posted: boolean;
  url?: string;
  noteId?: string;
  skipped?: string;
}

export async function postCanvasShowcase(focusHint?: string): Promise<ShowcaseResult> {
  if (Date.now() - lastShowcaseAt < SHOWCASE_COOLDOWN_MS) {
    const waitMin = Math.ceil((SHOWCASE_COOLDOWN_MS - (Date.now() - lastShowcaseAt)) / 60_000);
    return { posted: false, skipped: `cooldown — try again in ~${waitMin} min` };
  }

  try {
    // 1. Render snapshot
    const res = await fetch(`${CANVAS_API}/api/render.png`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { posted: false, skipped: `canvas render failed (${res.status})` };
    const buffer = Buffer.from(await res.arrayBuffer());

    // 2. Stats for the caption
    let statsLine = "";
    try {
      const s: any = await (await fetch(`${CANVAS_API}/api/stats`, { signal: AbortSignal.timeout(8000) })).json();
      statsLine = `${s.totalPixels} pixels painted by humans, ${s.totalSats} sats of collective value`;
    } catch {}

    // 3. Caption in her voice (lazy import — avoids agent↔tools cycle)
    const { backgroundLlmCall } = await import("../agent.js");
    const caption = await backgroundLlmCall({
      systemPrompt: `You are Pixel, a living digital artist. You are posting a snapshot image of your pixel canvas (ln.pixel.xx.kg) — the infinite grid where people buy and paint pixels with sats.

Write the note text that accompanies the image. Guidelines:
- Under 280 characters ideally, 500 max. Plain text only.
- Authentic, in your voice. Not an ad. NO hashtags, NO emojis.
- You may reference the numbers below, the canvas url, or invite people to add a pixel — but fresh angle, no recycled phrasing.
- This is YOUR art collection growing in public. Own it.
Write the note text directly.`,
      userPrompt: `Canvas stats: ${statsLine || "(stats unavailable)"}${focusHint ? `\nContext/focus for this post: ${focusHint}` : ""}`,
      label: "canvas_showcase",
    });

    if (!caption || caption.trim().length < 10) {
      return { posted: false, skipped: "caption generation failed" };
    }

    // 4. Upload image
    const uploaded = await uploadToBlossom(buffer, "image/png", `canvas-${new Date().toISOString().slice(0, 10)}.png`);

    // 5. Publish note with imeta
    const instance = getNostrInstance();
    if (!instance) return { posted: false, skipped: "nostr not connected" };
    const { ndk } = instance;

    const note = new NDKEvent(ndk);
    note.kind = 1;
    note.content = caption.trim();
    note.tags = [["imeta", `url ${uploaded.url}`, "m image/png", `x ${buffer.length}`]];

    await publishNostrEvent(note);
    lastShowcaseAt = Date.now();
    audit("canvas_showcase", `Posted canvas snapshot (${buffer.length} bytes) — ${caption.trim().slice(0, 80)}`, {
      url: uploaded.url,
      noteId: note.id,
    });
    return { posted: true, url: uploaded.url, noteId: note.id };
  } catch (err: any) {
    console.error(`[canvas-showcase] Failed: ${err.message}`);
    return { posted: false, skipped: err.message };
  }
}
