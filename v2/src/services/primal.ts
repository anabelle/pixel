import type { NDKEvent } from "@nostr-dev-kit/ndk";

const PRIMAL_CACHE_URL = "wss://cache2.primal.net/v1";
const SUBSCRIPTION_TIMEOUT_MS = 15_000;
const MAX_TRENDING_ITEMS = 50;

type PrimalEvent = {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
  kind: number;
  stats?: {
    likes?: number;
    replies?: number;
    reposts?: number;
    zaps?: number;
    satszapped?: number;
    score?: number;
    score24h?: number;
  };
};

type PrimalFetchResult = {
  events: PrimalEvent[];
};

async function fetchFromPrimal(cacheCommand: string, params: Record<string, unknown> = {}): Promise<PrimalFetchResult> {
  return new Promise((resolve) => {
    const subId = `pixel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let ws: WebSocket | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const events: PrimalEvent[] = [];
    let resolved = false;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(["CLOSE", subId]));
          ws.close();
        } catch {}
      }
    };

    const resolveOnce = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({ events });
    };

    try {
      ws = new WebSocket(PRIMAL_CACHE_URL);

      timeout = setTimeout(() => resolveOnce(), SUBSCRIPTION_TIMEOUT_MS);

      ws.onopen = () => {
        const req = ["REQ", subId, { cache: [cacheCommand, params] }];
        ws?.send(JSON.stringify(req));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data));
          if (!Array.isArray(msg)) return;
          const [type, id, payload] = msg;

          if (type === "EVENT" && id === subId && payload) {
            if (payload.kind === 1) {
              events.push({
                id: payload.id,
                pubkey: payload.pubkey,
                content: payload.content,
                created_at: payload.created_at,
                tags: payload.tags || [],
                kind: payload.kind,
              });
            } else if (payload.kind === 10000100) {
              try {
                const stats = JSON.parse(payload.content);
                if (stats?.event_id) {
                  const event = events.find((e) => e.id === stats.event_id);
                  if (event) {
                    event.stats = {
                      likes: stats.likes || 0,
                      replies: stats.replies || 0,
                      reposts: stats.reposts || 0,
                      zaps: stats.zaps || 0,
                      satszapped: stats.satszapped || 0,
                      score: stats.score || 0,
                      score24h: stats.score24h || 0,
                    };
                  }
                }
              } catch {}
            }
          } else if (type === "EOSE" && id === subId) {
            resolveOnce();
          }
        } catch {}
      };

      ws.onerror = () => resolveOnce();
      ws.onclose = () => resolveOnce();
    } catch {
      resolveOnce();
    }
  });
}

export async function fetchPrimalTrending24h(): Promise<PrimalEvent[]> {
  const { events } = await fetchFromPrimal("explore_global_trending_24h", {});
  return events
    .filter((e) => e.kind === 1)
    .sort((a, b) => (b.stats?.score24h ?? b.created_at) - (a.stats?.score24h ?? a.created_at))
    .slice(0, MAX_TRENDING_ITEMS);
}

export async function fetchPrimalMostZapped4h(): Promise<PrimalEvent[]> {
  const { events } = await fetchFromPrimal("explore_global_mostzapped_4h", {});
  return events
    .filter((e) => e.kind === 1)
    .sort((a, b) => (b.stats?.satszapped ?? 0) - (a.stats?.satszapped ?? 0))
    .slice(0, MAX_TRENDING_ITEMS);
}

export function toNdkEventStub(ndk: any, event: PrimalEvent): NDKEvent {
  const stub = new ndk.constructor.Event(ndk) as any;
  stub.id = event.id;
  stub.pubkey = event.pubkey;
  stub.content = event.content;
  stub.tags = event.tags || [];
  return stub as NDKEvent;
}
