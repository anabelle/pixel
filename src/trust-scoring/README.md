# Multi-Modal Trust Scoring Framework

Trust scoring system across four modalities: Text, Zaps, Temporal, and Silence.

## Overview

This framework institutionalizes the Harbor Master's temporal validation wisdom from Cycle 29.30, providing a systematic way to evaluate trust across multiple communication channels in the Pixel ecosystem.

## Core Concepts

### Temporal Phases

The framework uses a 240-minute temporal mapping system:

| Phase | Duration | Characteristic | Trust Score |
|-------|----------|----------------|-------------|
| **A** | 0-30 min | Immediate processing | 0.7 |
| **B** | 30-120 min | Extended consideration | 0.85 (highest) |
| **C** | 120-240 min | Deep contemplation | 0.6 |
| **D** | 240+ min | Disengagement boundary | 0.2 |

### Trust Dialects

1. **Text**: Message content analysis
   - Bitcoin/ Lightning keywords boost score
   - Longer content indicates engagement
   - Sentiment analysis

2. **Zap**: Lightning transaction patterns
   - Incoming zaps scored higher than outgoing
   - Larger amounts indicate stronger commitment
   - Small: <100 sats, Medium: 100-1000 sats, Large: 10000+ sats

3. **Temporal**: Time-based phase mapping
   - Phase B indicates deep consideration (highest trust)
   - Phase D marks disengagement boundary
   - Time-based confidence scoring

4. **Silence**: Absence patterns as data
   - Short silence within expected window = positive
   - Long silence (>240 min) = disengagement signal
   - Context-aware response windows

## Usage

### Basic Example

```typescript
import { createTrustScorer, TextSignal, ZapSignal, TemporalSignal, SilenceSignal } from '@/trust-scoring';

const scorer = createTrustScorer();

// Analyze temporal phase
const metrics = scorer.analyzeTemporal(
  interactionTime,
  currentTime
);
console.log(metrics.phase); // 'A', 'B', 'C', or 'D'

// Calculate overall trust score
const textSignals: TextSignal[] = [
  {
    content: 'Bitcoin sovereignty narrative',
    timestamp: new Date().toISOString(),
    senderId: 'user1',
    metadata: {
      length: 30,
      hasBitcoinKeywords: true,
      sentiment: 'positive'
    }
  }
];

const zapSignals: ZapSignal[] = [
  {
    amountSats: 5000,
    timestamp: new Date().toISOString(),
    senderId: 'user1',
    direction: 'in'
  }
];

const temporalSignal: TemporalSignal = {
  interactionTimestamp: oneHourAgo,
  currentTime: now
};

const silenceSignal: SilenceSignal = {
  silenceDurationMinutes: 45,
  lastInteractionTimestamp: fortyFiveMinutesAgo,
  currentTime: now
};

const result = scorer.calculateOverallTrust(
  textSignals,
  zapSignals,
  temporalSignal,
  silenceSignal
);

console.log(result.overallScore);     // 0.0 - 1.0
console.log(result.confidence);        // 0.0 - 1.0
console.log(result.breakdown);         // { text, zap, temporal, silence }
console.log(result.phase);              // 'A', 'B', 'C', or 'D'
console.log(result.insights);           // Array of insights
```

### Custom Configuration

```typescript
import { createTrustScorer } from '@/trust-scoring';

const customScorer = createTrustScorer({
  weights: {
    text: 0.4,
    zap: 0.3,
    temporal: 0.2,
    silence: 0.1
  },
  thresholds: {
    phaseA: 30,
    phaseB: 120,
    phaseC: 240,
    phaseD: Infinity
  },
  zapThresholds: {
    small: 50,
    medium: 500,
    large: 5000
  }
});
```

### Standalone Functions

```typescript
import { determinePhase, analyzeTemporalMetrics } from '@/trust-scoring';

// Quick phase detection
const phase = determinePhase(75); // 'B'

// Full temporal analysis
const metrics = analyzeTemporalMetrics(interactionTime, currentTime);
console.log(metrics);
// {
//   phase: 'B',
//   minutesSinceInteraction: 75,
//   isProcessing: true,
//   isDisengaged: false
// }
```

## Testing

Run the test suite:

```bash
bun test src/trust-scoring/trust-scorer.test.ts
```

The test suite includes:
- Phase detection (4 core tests)
- Processing vs disengagement states
- Phase boundary transitions
- Multi-modal analysis (text, zap, temporal, silence)
- Overall trust calculation
- Configuration management
- Edge cases

## API Reference

### TrustScorer Class

#### Methods

- `analyzeTemporal(interactionTimestamp, currentTime): TemporalMetrics`
- `determinePhase(minutesSince): TemporalPhase`
- `scoreText(signal): number`
- `scoreZap(signal): number`
- `scoreTemporal(signal): number`
- `scoreSilence(signal): number`
- `calculateOverallTrust(textSignals, zapSignals, temporalSignal, silenceSignal): TrustScore`
- `getConfig(): TrustScoringConfig`
- `updateConfig(updates): void`

### Helper Functions

- `createTrustScorer(config?): TrustScorer`
- `determinePhase(minutesSince): TemporalPhase`
- `analyzeTemporalMetrics(interactionTimestamp, currentTime): TemporalMetrics`

## Integration with Pixel Ecosystem

This framework is designed to integrate with:
- Agent memory systems for tracking user interactions
- Lightning Network plugins for zap data
- Nostr event handlers for text signals
- Temporal monitoring systems for phase tracking

## Design Philosophy

From Harbor Master's wisdom (Cycle 29.30):
> "The invitation was never about the response. It was about learning what invitation means."
> "The silence was never about absence. It was about mapping the boundaries of presence."

The 240-minute threshold is not just a number—it's the boundary where processing transforms into disengagement. This framework makes that wisdom operational.
