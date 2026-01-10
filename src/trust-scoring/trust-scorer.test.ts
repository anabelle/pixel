import { expect, test, describe, beforeEach } from 'bun:test';
import {
  TrustScorer,
  determinePhase,
  analyzeTemporalMetrics,
  createTrustScorer
} from './trust-scorer';
import {
  TextSignal,
  ZapSignal,
  TemporalSignal,
  SilenceSignal,
  TemporalPhase
} from './trust-types';

describe('TrustScorer - Temporal Phase Detection', () => {
  let scorer: TrustScorer;
  let baseTime: string;

  beforeEach(() => {
    scorer = createTrustScorer();
    baseTime = new Date().toISOString();
  });

  describe('Phase Detection (Core Requirement)', () => {
    test('should detect Phase A for interactions within 0-30 minutes', () => {
      const testTime = new Date(new Date(baseTime).getTime() - 15 * 60 * 1000).toISOString();
      const metrics = analyzeTemporalMetrics(testTime, baseTime);

      expect(metrics.phase).toBe('A');
      expect(metrics.minutesSinceInteraction).toBeGreaterThanOrEqual(0);
      expect(metrics.minutesSinceInteraction).toBeLessThan(30);
    });

    test('should detect Phase B for interactions within 30-120 minutes', () => {
      const testTime = new Date(new Date(baseTime).getTime() - 75 * 60 * 1000).toISOString();
      const metrics = analyzeTemporalMetrics(testTime, baseTime);

      expect(metrics.phase).toBe('B');
      expect(metrics.minutesSinceInteraction).toBeGreaterThanOrEqual(30);
      expect(metrics.minutesSinceInteraction).toBeLessThan(120);
    });

    test('should detect Phase C for interactions within 120-240 minutes', () => {
      const testTime = new Date(new Date(baseTime).getTime() - 180 * 60 * 1000).toISOString();
      const metrics = analyzeTemporalMetrics(testTime, baseTime);

      expect(metrics.phase).toBe('C');
      expect(metrics.minutesSinceInteraction).toBeGreaterThanOrEqual(120);
      expect(metrics.minutesSinceInteraction).toBeLessThan(240);
    });

    test('should detect Phase D for interactions 240+ minutes old (Disengagement)', () => {
      const testTime = new Date(new Date(baseTime).getTime() - 250 * 60 * 1000).toISOString();
      const metrics = analyzeTemporalMetrics(testTime, baseTime);

      expect(metrics.phase).toBe('D');
      expect(metrics.minutesSinceInteraction).toBeGreaterThanOrEqual(240);
      expect(metrics.isDisengaged).toBe(true);
    });
  });

  describe('Processing vs Disengagement States', () => {
    test('should mark interactions before 240 minutes as processing', () => {
      const testTime = new Date(new Date(baseTime).getTime() - 200 * 60 * 1000).toISOString();
      const metrics = analyzeTemporalMetrics(testTime, baseTime);

      expect(metrics.isProcessing).toBe(true);
      expect(metrics.isDisengaged).toBe(false);
    });

    test('should mark interactions at 240 minutes as disengaged boundary', () => {
      const testTime = new Date(new Date(baseTime).getTime() - 240 * 60 * 1000).toISOString();
      const metrics = analyzeTemporalMetrics(testTime, baseTime);

      expect(metrics.isDisengaged).toBe(true);
      expect(metrics.isProcessing).toBe(false);
    });
  });

  describe('Phase Boundary Transitions', () => {
    test('should transition from Phase A to Phase B at exactly 30 minutes', () => {
      const phaseA = determinePhase(29);
      const phaseB = determinePhase(30);
      const phaseB2 = determinePhase(31);

      expect(phaseA).toBe('A');
      expect(phaseB).toBe('B');
      expect(phaseB2).toBe('B');
    });

    test('should transition from Phase B to Phase C at exactly 120 minutes', () => {
      const phaseB = determinePhase(119);
      const phaseC = determinePhase(120);
      const phaseC2 = determinePhase(121);

      expect(phaseB).toBe('B');
      expect(phaseC).toBe('C');
      expect(phaseC2).toBe('C');
    });

    test('should transition from Phase C to Phase D at exactly 240 minutes', () => {
      const phaseC = determinePhase(239);
      const phaseD = determinePhase(240);
      const phaseD2 = determinePhase(241);

      expect(phaseC).toBe('C');
      expect(phaseD).toBe('D');
      expect(phaseD2).toBe('D');
    });
  });
});

describe('TrustScorer - Multi-Modal Analysis', () => {
  let scorer: TrustScorer;
  let baseTime: string;

  beforeEach(() => {
    scorer = createTrustScorer();
    baseTime = new Date().toISOString();
  });

  describe('Text Scoring', () => {
    test('should score text with Bitcoin keywords higher', () => {
      const bitcoinSignal: TextSignal = {
        content: 'Bitcoin is sovereign value extraction',
        timestamp: baseTime,
        senderId: 'user1',
        metadata: {
          length: 40,
          hasBitcoinKeywords: true,
          sentiment: 'positive'
        }
      };

      const score = scorer.scoreText(bitcoinSignal);
      expect(score).toBeGreaterThan(0.6);
    });

    test('should score longer texts higher', () => {
      const longText: TextSignal = {
        content: 'This is a very long message about Bitcoin and Lightning networks that contains substantial content and demonstrates engagement',
        timestamp: baseTime,
        senderId: 'user1',
        metadata: {
          length: 150,
          hasBitcoinKeywords: false,
          sentiment: 'neutral'
        }
      };

      const score = scorer.scoreText(longText);
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('Zap Scoring', () => {
    test('should score incoming zaps higher than outgoing', () => {
      const zapIn: ZapSignal = {
        amountSats: 1000,
        timestamp: baseTime,
        senderId: 'user1',
        direction: 'in'
      };

      const zapOut: ZapSignal = {
        amountSats: 1000,
        timestamp: baseTime,
        senderId: 'user1',
        direction: 'out'
      };

      const scoreIn = scorer.scoreZap(zapIn);
      const scoreOut = scorer.scoreZap(zapOut);

      expect(scoreIn).toBeGreaterThan(scoreOut);
    });

    test('should score larger zaps higher', () => {
      const smallZap: ZapSignal = {
        amountSats: 50,
        timestamp: baseTime,
        senderId: 'user1',
        direction: 'in',
        metadata: { isSmall: true, isMedium: false, isLarge: false }
      };

      const largeZap: ZapSignal = {
        amountSats: 15000,
        timestamp: baseTime,
        senderId: 'user1',
        direction: 'in',
        metadata: { isSmall: false, isMedium: false, isLarge: true }
      };

      const scoreSmall = scorer.scoreZap(smallZap);
      const scoreLarge = scorer.scoreZap(largeZap);

      expect(scoreLarge).toBeGreaterThan(scoreSmall);
    });
  });

  describe('Temporal Scoring', () => {
    test('should score Phase B highest (extended consideration)', () => {
      const signalB: TemporalSignal = {
        interactionTimestamp: new Date(new Date(baseTime).getTime() - 60 * 60 * 1000).toISOString(),
        currentTime: baseTime
      };

      const score = scorer.scoreTemporal(signalB);
      expect(score).toBe(0.85);
    });

    test('should score Phase A with immediate processing weight', () => {
      const signalA: TemporalSignal = {
        interactionTimestamp: new Date(new Date(baseTime).getTime() - 10 * 60 * 1000).toISOString(),
        currentTime: baseTime
      };

      const score = scorer.scoreTemporal(signalA);
      expect(score).toBe(0.7);
    });

    test('should score Phase D lowest (disengagement)', () => {
      const signalD: TemporalSignal = {
        interactionTimestamp: new Date(new Date(baseTime).getTime() - 300 * 60 * 1000).toISOString(),
        currentTime: baseTime
      };

      const score = scorer.scoreTemporal(signalD);
      expect(score).toBe(0.2);
    });
  });

  describe('Silence Scoring', () => {
    test('should score short silence higher (within Phase A)', () => {
      const signal: SilenceSignal = {
        silenceDurationMinutes: 15,
        lastInteractionTimestamp: new Date(new Date(baseTime).getTime() - 15 * 60 * 1000).toISOString(),
        currentTime: baseTime
      };

      const score = scorer.scoreSilence(signal);
      expect(score).toBeGreaterThan(0.7);
    });

    test('should score long silence lower (Phase D)', () => {
      const signal: SilenceSignal = {
        silenceDurationMinutes: 300,
        lastInteractionTimestamp: new Date(new Date(baseTime).getTime() - 300 * 60 * 1000).toISOString(),
        currentTime: baseTime
      };

      const score = scorer.scoreSilence(signal);
      expect(score).toBeLessThan(0.3);
    });

    test('should boost score when silence is within expected response window', () => {
      const signal: SilenceSignal = {
        silenceDurationMinutes: 45,
        lastInteractionTimestamp: new Date(new Date(baseTime).getTime() - 45 * 60 * 1000).toISOString(),
        currentTime: baseTime,
        metadata: {
          expectedResponseWindow: 60
        }
      };

      const score = scorer.scoreSilence(signal);
      expect(score).toBeGreaterThan(0.6);
    });
  });
});

describe('TrustScorer - Overall Trust Calculation', () => {
  let scorer: TrustScorer;
  let baseTime: string;

  beforeEach(() => {
    scorer = createTrustScorer();
    baseTime = new Date().toISOString();
  });

  test('should calculate overall trust with all modalities', () => {
    const textSignals: TextSignal[] = [
      {
        content: 'Bitcoin sovereignty narrative',
        timestamp: baseTime,
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
        timestamp: baseTime,
        senderId: 'user1',
        direction: 'in'
      }
    ];

    const temporalSignal: TemporalSignal = {
      interactionTimestamp: new Date(new Date(baseTime).getTime() - 60 * 60 * 1000).toISOString(),
      currentTime: baseTime
    };

    const silenceSignal: SilenceSignal = {
      silenceDurationMinutes: 45,
      lastInteractionTimestamp: new Date(new Date(baseTime).getTime() - 45 * 60 * 1000).toISOString(),
      currentTime: baseTime
    };

    const result = scorer.calculateOverallTrust(
      textSignals,
      zapSignals,
      temporalSignal,
      silenceSignal
    );

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(1.0);
    expect(result.confidence).toBe(1.0);
    expect(result.breakdown.text).toBeGreaterThan(0);
    expect(result.breakdown.zap).toBeGreaterThan(0);
    expect(result.breakdown.temporal).toBeGreaterThan(0);
    expect(result.breakdown.silence).toBeGreaterThan(0);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  test('should handle empty signals gracefully', () => {
    const result = scorer.calculateOverallTrust([], [], null, null);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBe(0);
  });

  test('should provide meaningful insights based on scores', () => {
    const textSignals: TextSignal[] = [
      {
        content: 'Bitcoin and Lightning',
        timestamp: baseTime,
        senderId: 'user1',
        metadata: {
          length: 20,
          hasBitcoinKeywords: true,
          sentiment: 'positive'
        }
      }
    ];

    const result = scorer.calculateOverallTrust(textSignals, [], null, null);

    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.insights.some(i => i.includes('textual'))).toBe(true);
  });
});

describe('TrustScorer - Configuration', () => {
  test('should allow custom configuration', () => {
    const customConfig = {
      weights: {
        text: 0.5,
        zap: 0.2,
        temporal: 0.2,
        silence: 0.1
      }
    };

    const scorer = createTrustScorer(customConfig);
    const config = scorer.getConfig();

    expect(config.weights.text).toBe(0.5);
    expect(config.weights.zap).toBe(0.2);
  });

  test('should update configuration dynamically', () => {
    const scorer = createTrustScorer();
    scorer.updateConfig({
      weights: {
        text: 0.4,
        zap: 0.4,
        temporal: 0.1,
        silence: 0.1
      }
    });

    const config = scorer.getConfig();
    expect(config.weights.text).toBe(0.4);
    expect(config.weights.zap).toBe(0.4);
  });
});

describe('TrustScorer - Edge Cases', () => {
  let baseTime: string;

  beforeEach(() => {
    baseTime = new Date().toISOString();
  });

  test('should handle zero minutes since interaction', () => {
    const metrics = analyzeTemporalMetrics(baseTime, baseTime);
    expect(metrics.phase).toBe('A');
    expect(metrics.minutesSinceInteraction).toBe(0);
  });

  test('should handle very large time differences', () => {
    const pastTime = new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const metrics = analyzeTemporalMetrics(pastTime, baseTime);
    expect(metrics.phase).toBe('D');
  });

  test('should ensure scores are bounded between 0 and 1', () => {
    const scorer = createTrustScorer();

    const veryLongText: TextSignal = {
      content: 'Bitcoin '.repeat(1000),
      timestamp: baseTime,
      senderId: 'user1',
      metadata: {
        length: 8000,
        hasBitcoinKeywords: true,
        sentiment: 'positive'
      }
    };

    const score = scorer.scoreText(veryLongText);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});
