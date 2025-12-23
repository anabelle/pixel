# LNPixels API Reference

The LNPixels API is a Lightning-native backend for collaborative pixel art.

## Base URL
`http://localhost:3000/api` (Local)
`https://ln.pixel.xx.kg/api` (Production)

## Endpoints

### 🎨 Pixels

#### `GET /pixels`
Fetch pixels within a specific rectangle.
- **Query Params**:
  - `x1`, `y1`: Top-left coordinates
  - `x2`, `y2`: Bottom-right coordinates
- **Returns**: `Array<Pixel>`

### ⚡ Invoices & Payments

#### `POST /invoices`
Create an invoice for a single pixel.
- **Body**: `{ x: number, y: number, color: string, letter?: string }`
- **Returns**: `{ invoice: string, payment_hash: string, amount: number, id: string, isMock: boolean }`

#### `POST /invoices/pixels`
Create a bulk invoice for a specific set of pixels.
- **Body**: `{ pixels: Array<{ x, y, color, letter? }> }`
- **Returns**: `{ invoice: string, payment_hash: string, amount: number, pixelCount: number, id: string, quoteId: string, isMock: boolean }`
- **Max pixels**: 1000 (configurable via MAX_BULK_PIXELS env var)

#### `POST /invoices/bulk` (Rectangle)
Create a bulk invoice for a rectangular area.
- **Body**: `{ x1, y1, x2, y2, color, letters?: string }`
- **Returns**: `{ invoice: string, payment_hash: string, amount: number, pixelCount: number, id: string, quoteId: string, isMock: boolean }`
- **Max pixels**: 1000 (configurable via MAX_RECT_PIXELS env var)
- **Letters mapping**: Assigned left-to-right, top-to-bottom across rectangle

### 📈 Activity & Stats

#### `GET /activity`
Get recent activity feed.
- **Query Params**: `limit` (default 20, max 100)
- **Returns**: `{ events: Array<Activity> }`

#### `GET /stats`
Get real-time canvas statistics (total pixels, total sats, unique buyers).
- **Returns**: `{ totalPixels: number, totalSats: number, recentActivityCount: number, recentSats: number, uniqueBuyers: number, lastUpdated: number }`

## Pricing Rules
- **Basic/Black Pixel**: 1 sat
- **Colored Pixel**: 10 sats
- **Letter Pixel**: 100 sats
- **Overwrite**: 2x previous price or base price (whichever is higher)

## Webhooks
- `POST /nakapay`: Handles incoming payment confirmations from NakaPay with signature verification and replay protection.

## WebSocket Events
- `pixel.update`: Single pixel update
- `activity.append`: Activity feed append (includes bulk purchase summaries)
- `payment.confirmed`: Payment confirmation event
