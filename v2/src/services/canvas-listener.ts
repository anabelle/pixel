/**
 * Canvas Listener — Real-time pixel sale notifications from V1 canvas
 *
 * Connects to V1's Socket.IO server and listens for pixel purchase events.
 * Records revenue and notifies Pixel so it can react.
 */

import { io, Socket } from "socket.io-client";
import { recordRevenue } from "./revenue.js";
import { audit } from "./audit.js";

// Canvas API URL — V1 canvas at pixel-api-1:3000
const CANVAS_SOCKET_URL = process.env.CANVAS_SOCKET_URL ?? "http://pixel-api-1:3000";
const CANVAS_NAMESPACE = "/api";

let socket: Socket | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 5000;

// Debounce tracking for revenue events (avoid duplicates within 5s window)
const recentPayments = new Map<string, number>();
const PAYMENT_DEBOUNCE_MS = 5000;

// Reference to promptWithHistory — set by startCanvasListener
let notifyPixelFn: ((message: string, userId: string) => Promise<string>) | null = null;

export interface CanvasActivity {
  x?: number;
  y?: number;
  color?: string;
  letter?: string;
  sats?: number;
  payment_hash?: string;
  created_at?: number;
  type?: string;
  summary?: string;
  pixelCount?: number;
  totalSats?: number;
}

/**
 * Start listening to canvas events.
 * @param notifyPixel - Function to notify Pixel when events occur
 */
export function startCanvasListener(
  notifyPixel: (message: string, userId: string) => Promise<string>
): void {
  if (socket?.connected) {
    console.log("[canvas-listener] Already connected");
    return;
  }

  notifyPixelFn = notifyPixel;
  connect();
}

function connect(): void {
  if (isConnecting || socket?.connected) return;
  isConnecting = true;

  const url = `${CANVAS_SOCKET_URL}${CANVAS_NAMESPACE}`;
  console.log(`[canvas-listener] Connecting to ${url}...`);

  socket = io(url, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY_MS,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log(`[canvas-listener] Connected to V1 canvas (socket id: ${socket?.id})`);
    reconnectAttempts = 0;
    isConnecting = false;
  });

  socket.on("disconnect", (reason) => {
    console.log(`[canvas-listener] Disconnected: ${reason}`);
    isConnecting = false;
  });

  socket.on("connect_error", (err) => {
    console.error(`[canvas-listener] Connection error: ${err.message}`);
    isConnecting = false;
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[canvas-listener] Max reconnect attempts reached, stopping`);
    }
  });

  // Listen for activity events (pixel purchases, etc.)
  socket.on("activity.append", (activity: CanvasActivity) => {
    console.log("[canvas-listener] Received activity.append:", JSON.stringify(activity));
    handleCanvasActivity(activity);
  });

  // Listen for pixel updates (individual pixel changes)
  socket.on("pixel.update", (pixel: any) => {
    console.log("[canvas-listener] Received pixel.update:", JSON.stringify(pixel));
    // pixel.update events don't have payment info, so we rely on activity.append for revenue
  });

  // Listen for payment confirmations
  socket.on("payment.confirmed", (payment: any) => {
    console.log("[canvas-listener] Received payment.confirmed:", JSON.stringify(payment));
    handlePaymentConfirmed(payment);
  });
}

/**
 * Handle canvas activity events — record revenue and notify Pixel
 */
async function handleCanvasActivity(activity: CanvasActivity): Promise<void> {
  // Skip non-purchase events (like generic activity)
  if (!activity.type || !["single_purchase", "bulk_purchase"].includes(activity.type)) {
    return;
  }

  // Get payment identifier for dedup
  const paymentId = activity.payment_hash || `canvas-${activity.created_at}-${activity.x}-${activity.y}`;
  
  // Check debounce
  const now = Date.now();
  const lastSeen = recentPayments.get(paymentId);
  if (lastSeen && now - lastSeen < PAYMENT_DEBOUNCE_MS) {
    console.log(`[canvas-listener] Duplicate payment ${paymentId}, skipping`);
    return;
  }
  recentPayments.set(paymentId, now);

  // Clean old entries from debounce map
  for (const [id, timestamp] of recentPayments) {
    if (now - timestamp > PAYMENT_DEBOUNCE_MS * 2) {
      recentPayments.delete(id);
    }
  }

  // Determine amount — totalSats for bulk, sats for single
  const amountSats = activity.totalSats ?? activity.sats ?? 0;
  if (amountSats <= 0) {
    console.log("[canvas-listener] Activity has no valid amount, skipping");
    return;
  }

  // Build description
  let description: string;
  if (activity.type === "bulk_purchase" && activity.pixelCount) {
    description = activity.summary || `Bulk purchase: ${activity.pixelCount} pixels`;
  } else {
    description = `Pixel (${activity.x}, ${activity.y})${activity.color ? ` ${activity.color}` : ""}${activity.letter ? ` "${activity.letter}"` : ""}`;
  }

  // Record revenue
  await recordRevenue({
    source: "canvas",
    amountSats,
    description,
    txHash: paymentId,
  });

  audit("canvas_purchase", `Canvas: ${amountSats} sats — ${description}`, {
    activity,
    paymentId,
  });

  // Notify Pixel so it can react
  if (notifyPixelFn) {
    // Approximate USD value (roughly 100k sats = $100 USD)
    const usdValue = (amountSats / 100000 * 100).toFixed(2);
    
    // Build detailed notification
    let notification: string;
    if (activity.type === "bulk_purchase" && activity.pixelCount) {
      notification = `🎨 CANVAS SALE NOTIFICATION

💰 Amount: ${amountSats} sats (~$${usdValue} USD)
📊 Pixels: ${activity.pixelCount} pixels
📍 Location: Starting at (${activity.x}, ${activity.y})
🎨 Color: ${activity.color || "various"}
🆔 Payment: ${paymentId?.slice(0, 8)}...

View at ln.pixel.xx.kg

You could thank them, check what they drew, or share this moment on Nostr!`;
    } else {
      notification = `🎨 CANVAS SALE NOTIFICATION

💰 Amount: ${amountSats} sats (~$${usdValue} USD)
📍 Pixel: (${activity.x}, ${activity.y})
🎨 Color: ${activity.color || "default"}${activity.letter ? `\n✏️ Letter: "${activity.letter}"` : ""}
🆔 Payment: ${paymentId?.slice(0, 8)}...

View at ln.pixel.xx.kg`;
    }
    
    try {
      await notifyPixelFn(notification, "canvas-system");
      console.log("[canvas-listener] Notified Pixel about canvas sale");
    } catch (err: any) {
      console.error(`[canvas-listener] Failed to notify Pixel: ${err.message}`);
    }
  }
}

/**
 * Handle payment.confirmed events as backup
 */
async function handlePaymentConfirmed(payment: any): Promise<void> {
  // This is a backup — activity.append should handle most cases
  // Only process if we haven't seen this payment via activity.append
  const paymentId = payment.paymentId || payment.payment_hash;
  if (!paymentId) return;

  const now = Date.now();
  const lastSeen = recentPayments.get(paymentId);
  if (lastSeen && now - lastSeen < PAYMENT_DEBOUNCE_MS) {
    return; // Already processed
  }

  const amountSats = payment.amount || 0;
  if (amountSats <= 0) return;

  // Mark as seen
  recentPayments.set(paymentId, now);

  // Record if not already done via activity.append
  await recordRevenue({
    source: "canvas",
    amountSats,
    description: `Canvas payment ${paymentId}`,
    txHash: paymentId,
  });
}

/**
 * Get canvas listener status
 */
export function getCanvasListenerStatus(): {
  connected: boolean;
  socketId: string | null;
  reconnectAttempts: number;
} {
  return {
    connected: socket?.connected ?? false,
    socketId: socket?.id ?? null,
    reconnectAttempts,
  };
}

/**
 * Stop the canvas listener
 */
export function stopCanvasListener(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("[canvas-listener] Stopped");
  }
}
