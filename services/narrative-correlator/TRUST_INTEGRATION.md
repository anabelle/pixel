# Trust-Weighted Narrative Correlator Integration

## Overview

The narrative correlator now integrates with the trust-scoring system to produce trust-weighted correlations and insights. This allows the organism to make decisions based on its own trust patterns.

## Architecture

### Components

1. **Trust Scoring System** (`/pixel/src/trust-scoring/`)
   - Multi-modal trust analysis (text, zap, temporal, silence)
   - Phase detection (A: 0-30min, B: 30-120min, C: 120-240min, D: 240min+)
   - Trust score calculation with confidence metrics

2. **Narrative Correlator** (`/pixel/services/narrative-correlator/`)
   - Correlates narratives with economic events
   - Now uses trust scoring to weight correlations
   - Generates trust-weighted insights

3. **Narrative Correlator Bridge** (`/pixel/services/pipeline/narrative-correlator-bridge.ts`)
   - Extracts narratives from PostgreSQL database
   - Extracts economic events from API
   - Posts to correlator service for analysis

## Integration Pattern

### Data Flow

```
PostgreSQL (memories) 
    → NarrativeCorrelatorBridge 
    → NarrativeCorrelator (with TrustScorer)
    → Trust-Weighted Correlations & Insights
```

### Trust-Weighted Correlation Process

1. **Extract Data**: Bridge pulls narratives and economic events
2. **Calculate Trust**: Correlator calls trust scorer on each event
3. **Weight Correlations**: Correlation strength adjusted by trust score
4. **Generate Insights**: Trust metrics included in narrative insights

### Trust Score Integration

When `enableTrustWeighting` is enabled:

```typescript
const trustWeight = 0.3;
const trustBoost = (trustScore.overallScore - 0.5) * trustWeight;
strength = Math.min(Math.max(strength + trustBoost, 0), 1.0);
correlation += ` (trust-weighted: ${(trustScore.overallScore * 100).toFixed(0)}%)`;
```

**Effect**:
- High trust (>0.7): Boosts correlation strength up to 21%
- Neutral trust (0.5): No change to correlation strength
- Low trust (<0.3): Reduces correlation strength up to 21%

## API Changes

### Correlation Type Extension

```typescript
export interface Correlation {
  id: string;
  narrative: Narrative;
  economicEvent: EconomicEvent;
  correlation: string;
  strength: number;
  trustWeighted?: boolean;      // NEW: Whether trust weighting was applied
  trustScore?: number;          // NEW: The trust score used
  createdAt: string;
}
```

### New Methods

```typescript
// Get trust score for specific event
getTrustScore(eventKey: string): TrustScore | undefined;

// Get average trust score across all events
getAverageTrustScore(): number;
```

## Configuration

```typescript
const correlator = new NarrativeCorrelator({
  timeWindowHours: 24,
  minCorrelationStrength: 0.3,
  maxCorrelationsPerRun: 100,
  enableTrustWeighting: true  // NEW: Enable/disable trust weighting
});
```

## Trust-Weighted Insights

The correlator now generates insights that include trust metrics:

### High Trust (>70%)
```
"High trust patterns detected (85% average trust) - correlations are trust-weighted for accuracy"
```

### Moderate Trust (40-70%)
```
"Moderate trust patterns (55% average trust) - trust-weighted correlations active"
```

### Low Trust (<40%)
```
"Low trust patterns detected (35% average trust) - consider monitoring for disengagement"
```

### Temporal Phase Insights
```
"Warning: Majority of interactions in Phase D (disengagement) - trust decay detected"
"Optimal temporal engagement - majority of interactions in active processing phases (A/B)"
```

## Testing

### Integration Test Suite

Location: `/pixel/services/narrative-correlator/correlator-trust-integration.test.ts`

Coverage:
- Trust score calculation
- Trust-weighted correlations
- Trust-weighted insights
- Configuration control
- Phase detection

Run tests:
```bash
bun test /pixel/services/narrative-correlator/correlator-trust-integration.test.ts
```

### Results

- Trust scoring: 51/51 tests passing
- Bridge: 15/15 tests passing
- Trust integration: 16/16 tests passing

## Usage Example

```typescript
import { NarrativeCorrelator } from './correlator';

const correlator = new NarrativeCorrelator({
  enableTrustWeighting: true
});

// Update with narratives and events
correlator.updateNarratives(narratives);
correlator.updateEconomicEvents(events);

// Analyze correlations (now trust-weighted)
const correlations = correlator.analyzeCorrelations();

// Generate insights (now includes trust metrics)
const insights = correlator.generateInsights();

// Check trust score for specific event
const trustScore = correlator.getTrustScore(eventKey);

// Get overall trust health
const avgTrust = correlator.getAverageTrustScore();
```

## Operational Impact

### Decision Making

The organism can now:
1. **Prioritize high-trust narratives** - Stronger correlations for trusted interactions
2. **Detect disengagement** - Phase D detection via temporal patterns
3. **Adjust strategy** - Low trust patterns trigger strategy adjustments
4. **Validate trust** - Correlations include trust confidence scores

### Trust Awareness

- **Real-time trust monitoring** - Every event scored immediately
- **Temporal boundary awareness** - Phase A/B/C/D detection active
- **Economic trust tracking** - Zap amounts, directions, patterns
- **Silence analysis** - Response times and gaps monitored

## Next Steps

1. ✅ Integration complete
2. ✅ Tests passing (51+16=67 total)
3. ⏭️ Deploy to production
4. ⏭️ Monitor trust patterns in production
5. ⏭️ Tune trust weights based on production data

## Files Modified

- `/pixel/services/narrative-correlator/correlator.ts` - Trust integration
- `/pixel/services/narrative-correlator/types.ts` - Extended Correlation interface
- `/pixel/services/narrative-correlator/correlator-trust-integration.test.ts` - Integration tests

## Files Created

- `/pixel/services/narrative-correlator/TRUST_INTEGRATION.md` - This documentation

## System Status

**Cycle:** 29.36 - Integration Phase Complete
**Trust Scoring:** OPERATIONAL (51/51 tests)
**Narrative Correlator:** OPERATIONAL with trust-weighting
**Integration:** COMPLETE (16/16 integration tests passing)

---

*The organism watches itself trust-scoring while correlating narratives.*
