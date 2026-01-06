# Narrative Correlator Service

Sovereign intelligence correlation engine for the Pixel ecosystem.

## Overview

This service extracts and operationalizes the narrative correlation capability from Cycle 26.40, providing:

- Real-time narrative-economic correlation analysis
- Persistent correlation storage with JSON file backend
- REST API endpoints for querying correlations
- Health checks and operational metrics
- Insight generation based on correlation patterns

## Architecture

```
┌─────────────────┐
│  Agent Memory   │
│  (Narratives)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Narrative Correlator      │
│  - Correlation Engine     │
│  - Insight Generation     │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Correlation Store         │
│  - JSON File Storage      │
│  - Query Methods         │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  REST API                 │
│  - Health Endpoint        │
│  - Correlation Queries    │
│  - Analysis Triggers     │
└─────────────────────────────┘
```

## API Endpoints

### Health Check
```
GET /correlations/health
```

Returns service health status, uptime, and correlation statistics.

### Get Correlations
```
GET /correlations?limit=10&offset=0
```

Retrieve correlations with pagination support.

### Get Correlation by ID
```
GET /correlations/:id
```

Retrieve a specific correlation by ID.

### Get Correlations by Tag
```
GET /correlations/tag/:tag?limit=10
```

Retrieve correlations filtered by narrative tag.

### Get High-Strength Correlations
```
GET /correlations/high-strength?minStrength=0.7&limit=10
```

Retrieve correlations above a strength threshold.

### Get Statistics
```
GET /correlations/stats
```

Get overall correlation statistics and top tags.

### Get Top Tags
```
GET /correlations/tags?limit=10
```

Retrieve most frequently correlated narrative tags.

### Analyze Correlations
```
POST /correlations/analyze
Body: { narratives: [...], economicEvents: [...] }
```

Trigger correlation analysis with new data.

### Cron Run
```
POST /correlations/cron/run
```

Run scheduled correlation analysis and generate insights.

### Cleanup Old Correlations
```
DELETE /correlations/cleanup?days=7
```

Remove correlations older than specified days.

## Integration

### Agent Memory Pipeline

The correlator hooks into the agent's memory formation pipeline:

```typescript
import { NarrativeCorrelator } from './correlator';

const correlator = new NarrativeCorrelator();

// Update with new narrative events
correlator.updateNarratives(narrativeEvents);

// Update with new economic events (zaps, payments)
correlator.updateEconomicEvents(economicEvents);

// Analyze correlations
const correlations = correlator.analyzeCorrelations();

// Generate insights
const insights = correlator.generateInsights();
```

### Treasury Data Stream

The correlator connects to the treasury data stream from `pixels.json`:

```typescript
// Economic events extracted from zaps
const economicEvents = [
  {
    type: 'zap_in',
    amountSats: 42,
    timestamp: '2026-01-06T19:00:00Z',
    context: 'Pixel at (100, 200)'
  }
];
```

### Nostr Broadcast

High-strength correlations can be broadcast to Nostr:

```typescript
const highStrengthCorrelations = correlator.getTopCorrelations(5);

// Broadcast to Nostr
await nostrClient.publish({
  kind: 1,
  content: JSON.stringify(highStrengthCorrelations)
});
```

## Configuration

Service configuration via environment variables:

- `PORT`: Service port (default: 3004)
- `NODE_ENV`: Environment (development/production)
- `DATA_PATH`: Path to correlation storage (default: /data)

## Deployment

Build and start with Docker Compose:

```bash
docker compose up -d narrative-correlator
```

Verify health:

```bash
curl http://localhost:3004/correlations/health
```

## Cron Job

Add to crontab for automated correlation runs:

```cron
0 */6 * * * curl -X POST http://localhost:3004/correlations/cron/run
```

## Metrics

The service tracks:

- Total correlations
- Average correlation strength
- High/medium/low strength distribution
- Economic event type distribution
- Top narrative tags
- Service uptime

## Storage

Correlations are persisted to `/data/narrative-correlations.json` in JSON format:

```json
[
  {
    "id": "1704585600-abc123",
    "narrative": {
      "id": "timeline-001",
      "tags": ["sovereign-value-extraction"],
      "content": "...",
      "timestamp": "2026-01-06T19:00:00Z"
    },
    "economicEvent": {
      "type": "zap_in",
      "amountSats": 42,
      "timestamp": "2026-01-06T19:00:00Z"
    },
    "correlation": "Zap aligned with sovereign Bitcoin narrative",
    "strength": 0.7,
    "createdAt": "2026-01-06T19:00:00Z"
  }
]
```

## Development

Install dependencies:

```bash
cd /pixel/services/narrative-correlator
npm install
```

Run in development mode:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Migration from Worker Artifacts

The narrative correlation logic from `intelligence-reporter.ts` has been extracted:

- `TreasuryNarrativeCorrelator` → `NarrativeCorrelator` class
- `intelligence-types.ts` → `types.ts`
- File-based storage → `CorrelationStore` with JSON backend
- CLI interface → REST API endpoints
- Report generation → Insight generation + stats

## Monitoring

Service health can be monitored via:

1. **Health endpoint**: `/correlations/health`
2. **Docker healthcheck**: Configured in docker-compose.yml
3. **Syntropy integration**: Syntropy can query stats via API
4. **Logs**: Output to stdout/stderr for Docker logging

## Future Enhancements

- PostgreSQL backend for correlations (currently JSON file)
- Real-time correlation via WebSocket
- Correlation quality metrics over time
- Machine learning for correlation improvement
- Nostr integration for insight broadcasting
