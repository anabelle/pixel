# Intelligence Reporting System

Automated intelligence report generation for Sovereign Intelligence Enhancement in the Pixel ecosystem.

## Overview

The Intelligence Reporting System provides automated daily and weekly intelligence reports that combine treasury activity with narrative tracking and correlation analysis. This enables the agent to:

- Track economic decisions (treasury flow, zaps, payments)
- Monitor geopolitical narratives and events
- Analyze correlations between narratives and economic actions
- Generate actionable insights for autonomous decision-making

## Components

### 1. Core Modules

- **`src/workers/intelligence-reporter.ts`**: Main reporting engine
  - Generates daily and weekly reports
  - Fetches data from PostgreSQL memories and pixels.json
  - Correlates treasury events with narrative events
  - Writes reports to `/pixel/data/intelligence-reports/`

- **`src/utils/treasury-narrative-correlator.ts`**: Correlation logic
  - Analyzes time-windowed correlations between narratives and treasury decisions
  - Computes correlation strength based on tag matching and content analysis
  - Identifies successful economic decisions aligned with narratives

- **`src/workers/intelligence-types.ts`**: TypeScript type definitions
  - `NarrativeEvent`: Geopolitical events and narratives
  - `TreasuryEvent`: Economic decisions (zaps, payments, tips)
  - `CorrelationData`: Links between narratives and economic actions
  - `DailyReport` / `WeeklyReport`: Report structure definitions

### 2. CLI Scripts

- **`scripts/generate-daily-report.sh`**: Bash wrapper for cron job integration
  - Automated daily report generation
  - Error handling and logging

## Usage

### Manual Report Generation

```bash
# Generate daily report
bun run /pixel/src/workers/intelligence-reporter.ts daily

# Generate weekly report
bun run /pixel/src/workers/intelligence-reporter.ts weekly

# Or use the shell script
/pixel/scripts/generate-daily-report.sh
```

### Automated Scheduling (Cron)

To schedule automated daily reports, add to crontab:

```cron
# Run daily report at midnight UTC
0 0 * * * /pixel/scripts/generate-daily-report.sh >> /pixel/logs/intelligence-reports.log 2>&1

# Run weekly report on Sunday at 1 AM UTC
0 1 * * 0 bun run /pixel/src/workers/intelligence-reporter.ts weekly >> /pixel/logs/intelligence-reports.log 2>&1
```

## Data Sources

### Narratives (PostgreSQL)

Queries the `memories` table in `pixel_agent` database for timeline-type events:

```sql
SELECT id, content, created_at 
FROM memories 
WHERE type = 'messages' AND content->'data'->>'type' = 'timeline' 
ORDER BY created_at DESC LIMIT 50;
```

### Treasury (pixels.json)

Reads pixel data from `/pixel/data/pixels.json`:
- Extracts zap events (incoming/outgoing)
- Calculates total treasury balance
- Fallback to CONTINUITY.md if pixels.json unavailable

## Report Structure

### Daily Report

```json
{
  "reportId": "timestamp-random",
  "date": "YYYY-MM-DD",
  "summary": "Day X - Treasury: Y sats, Tracked: Z narratives, Key correlations: [list]",
  "treasury": {
    "totalSats": 79014,
    "zapsReceived": 9,
    "zapsSent": 3,
    "netFlow": 462
  },
  "narratives": {
    "tracked": 50,
    "newEvents": 14,
    "topTags": ["sovereign-value-extraction", "geopolitical-bitcoin-utility", ...]
  },
  "correlations": [
    {
      "narrative": { ... },
      "economicDecision": { ... },
      "correlation": "Zap aligned with sovereign Bitcoin narrative",
      "strength": 0.7
    }
  ],
  "insights": [
    "Strong narrative-economy alignment detected",
    "Sovereign value extraction narrative remains dominant"
  ]
}
```

### Weekly Report

```json
{
  "reportId": "timestamp-random",
  "weekStart": "YYYY-MM-DD",
  "weekEnd": "YYYY-MM-DD",
  "summary": "Week Summary - Avg Treasury: X sats, Trending: Y, Z, W",
  "dailyBreakdown": [...],  // Array of daily reports
  "patterns": {
    "trendingNarratives": ["tag1", "tag2", ...],
    "successfulDecisions": [...],  // Top correlations from week
    "emergingPatterns": ["pattern1", "pattern2", ...]
  },
  "recommendations": [
    "Continue current strategy - treasury-narrative alignment producing positive results",
    "Increase content production around sovereign Bitcoin utility narratives"
  ]
}
```

## Integration Points

### Agent Memory

Reports can be written back to agent memory for context awareness:

```typescript
// From intelligence-reporter.ts
await this.writeReportToAgentMemory(report);
```

### Nostr Posting (Optional)

To post key insights to Nostr, integrate with the agent's Nostr plugin:

```typescript
// Post summary to Nostr
const nostrInsight = report.summary.substring(0, 280); // NIP-1 limit
await agent.plugins.nostr.post(nostrInsight);
```

## Configuration

### Time Windows

Adjust correlation analysis time windows in `intelligence-reporter.ts`:

```typescript
const timeWindowHours = 24;  // Default: 24 hours
const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
const correlations = correlator.analyzeCorrelations(timeWindowHours);
```

### Report Limits

Control report data volume:

```typescript
// Maximum narratives per report
const MAX_NARRATIVES = 50;

// Maximum treasury events
const MAX_TREASURY_EVENTS = 100;

// Correlation threshold
const CORRELATION_THRESHOLD = 0.3;
```

## Monitoring

### Report Logs

```bash
# List all generated reports
ls -la /pixel/data/intelligence-reports/

# View latest daily report
cat /pixel/data/intelligence-reports/daily-*.json | tail -1 | jq .

# Check weekly patterns
cat /pixel/data/intelligence-reports/weekly-*.json | jq '.patterns'
```

### Validation

Verify report integrity:

```bash
# Check JSON validity
for f in /pixel/data/intelligence-reports/*.json; do
  jq empty "$f" || echo "Invalid: $f"
done
```

## Troubleshooting

### Empty Reports

If reports show 0 treasury or 0 narratives:

1. **Check PostgreSQL connection**:
   ```bash
   docker exec pixel-postgres-1 psql -U postgres -d pixel_agent -c "SELECT COUNT(*) FROM memories;"
   ```

2. **Verify pixels.json exists**:
   ```bash
   ls -la /pixel/data/pixels.json
   ```

3. **Check CONTINUITY.md for fallback**:
   ```bash
   grep "Treasury:" /pixel/CONTINUITY.md
   ```

### Correlation Threshold

Adjust sensitivity if too many/few correlations detected:

```typescript
// In treasury-narrative-correlator.ts
if (correlation.strength >= 0.3) {  // Lower = more correlations
  correlations.push(correlation);
}
```

## Architecture

### Data Flow

```
1. IntelligenceReporter.generateDailyReport()
   ↓
2. Fetch Narratives (PostgreSQL)
   + Fetch Treasury Events (pixels.json)
   + Get Current Balance (pixels.json or CONTINUITY.md)
   ↓
3. TreasuryNarrativeCorrelator.analyzeCorrelations()
   ↓
4. Generate Insights
   + Identify patterns
   + Calculate trends
   ↓
5. Save Report (JSON to /pixel/data/intelligence-reports/)
```

### Brain/Hands Separation

This system follows the Syntropy Brain/Hands pattern:
- **Syntropy (Brain)**: Spawns workers for report generation
- **Worker (Hands)**: Executes `intelligence-reporter.ts` via Opencode
- **No Self-Modification**: Reports are read-only, no code changes

## Future Enhancements

### Planned Features

1. **Nostr Integration**: Auto-post high-importance insights
2. **Machine Learning**: Improve correlation strength prediction
3. **Anomaly Detection**: Alert on unusual economic patterns
4. **Decision Recommendations**: Suggest actions based on correlations
5. **Historical Analysis**: Track long-term narrative-economy cycles

### Integration Opportunities

- **Agent Character**: Use reports to inform social responses
- **Treasury Management**: Automated decisions based on narrative signals
- **Narrative Expansion**: Add new tracking tags dynamically
- **Economic Strategy**: Optimize zap tipping based on correlation success

## Dependencies

- **Node.js/Bun**: Runtime environment
- **PostgreSQL**: Agent memory storage (via Docker)
- **TypeScript**: Type-safe development
- **fs/promises**: File system operations (native)

## License

Part of the Pixel ecosystem - Sovereign Intelligence Enhancement, Cycle 26.39.

---

**Status**: ✅ OPERATIONAL
**Last Updated**: 2026-01-06
**Cycle**: 26.39 - Sovereign Intelligence Enhancement
