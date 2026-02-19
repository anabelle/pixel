import { expect, test, describe } from 'bun:test';
import {
  TrustDialect,
  TemporalPhase,
  TemporalMetrics,
  TextSignal,
  ZapSignal,
  TemporalSignal,
  SilenceSignal,
  TrustScore,
  TrustScoringConfig
} from './trust-types';

describe('Trust Types - Type Definitions', () => {
  describe('TrustDialect', () => {
    test('should have four modalities defined', () => {
      const dialects: TrustDialect[] = ['text', 'zap', 'temporal', 'silence'];
      expect(dialects).toHaveLength(4);
    });

    test('should accept valid trust dialect values', () => {
      const text: TrustDialect = 'text';
      const zap: TrustDialect = 'zap';
      const temporal: TrustDialect = 'temporal';
      const silence: TrustDialect = 'silence';

      expect(text).toBe('text');
      expect(zap).toBe('zap');
      expect(temporal).toBe('temporal');
      expect(silence).toBe('silence');
    });
  });

  describe('TemporalPhase', () => {
    test('should have four phases defined', () => {
      const phases: TemporalPhase[] = ['A', 'B', 'C', 'D'];
      expect(phases).toHaveLength(4);
    });

    test('should accept valid temporal phase values', () => {
      const phaseA: TemporalPhase = 'A';
      const phaseB: TemporalPhase = 'B';
      const phaseC: TemporalPhase = 'C';
      const phaseD: TemporalPhase = 'D';

      expect(phaseA).toBe('A');
      expect(phaseB).toBe('B');
      expect(phaseC).toBe('C');
      expect(phaseD).toBe('D');
    });
  });

  describe('TemporalMetrics', () => {
    test('should create valid temporal metrics', () => {
      const metrics: TemporalMetrics = {
        phase: 'B',
        minutesSinceInteraction: 75,
        isProcessing: true,
        isDisengaged: false
      };

      expect(metrics.phase).toBe('B');
      expect(metrics.minutesSinceInteraction).toBe(75);
      expect(metrics.isProcessing).toBe(true);
      expect(metrics.isDisengaged).toBe(false);
    });

    test('should represent Phase A metrics', () => {
      const metrics: TemporalMetrics = {
        phase: 'A',
        minutesSinceInteraction: 15,
        isProcessing: true,
        isDisengaged: false
      };

      expect(metrics.phase).toBe('A');
      expect(metrics.minutesSinceInteraction).toBeLessThan(30);
      expect(metrics.isProcessing).toBe(true);
    });

    test('should represent Phase D disengagement metrics', () => {
      const metrics: TemporalMetrics = {
        phase: 'D',
        minutesSinceInteraction: 250,
        isProcessing: false,
        isDisengaged: true
      };

      expect(metrics.phase).toBe('D');
      expect(metrics.minutesSinceInteraction).toBeGreaterThanOrEqual(240);
      expect(metrics.isProcessing).toBe(false);
      expect(metrics.isDisengaged).toBe(true);
    });
  });

  describe('TextSignal', () => {
    test('should create valid text signal', () => {
      const signal: TextSignal = {
        content: 'Bitcoin is sovereignty',
        timestamp: new Date().toISOString(),
        senderId: 'user1'
      };

      expect(signal.content).toBeDefined();
      expect(signal.timestamp).toBeDefined();
      expect(signal.senderId).toBeDefined();
    });

    test('should support optional metadata', () => {
      const signal: TextSignal = {
        content: 'Bitcoin Lightning Network',
        timestamp: new Date().toISOString(),
        senderId: 'user1',
        metadata: {
          length: 24,
          hasBitcoinKeywords: true,
          sentiment: 'positive'
        }
      };

      expect(signal.metadata).toBeDefined();
      expect(signal.metadata?.length).toBe(24);
      expect(signal.metadata?.hasBitcoinKeywords).toBe(true);
      expect(signal.metadata?.sentiment).toBe('positive');
    });

    test('should support all sentiment types', () => {
      const positive: TextSignal = {
        content: 'Great!',
        timestamp: new Date().toISOString(),
        senderId: 'user1',
        metadata: { sentiment: 'positive' }
      };

      const neutral: TextSignal = {
        content: 'Okay',
        timestamp: new Date().toISOString(),
        senderId: 'user1',
        metadata: { sentiment: 'neutral' }
      };

      const negative: TextSignal = {
        content: 'Bad',
        timestamp: new Date().toISOString(),
        senderId: 'user1',
        metadata: { sentiment: 'negative' }
      };

      expect(positive.metadata?.sentiment).toBe('positive');
      expect(neutral.metadata?.sentiment).toBe('neutral');
      expect(negative.metadata?.sentiment).toBe('negative');
    });
  });

  describe('ZapSignal', () => {
    test('should create valid zap signal', () => {
      const signal: ZapSignal = {
        amountSats: 1000,
        timestamp: new Date().toISOString(),
        senderId: 'user1',
        direction: 'in'
      };

      expect(signal.amountSats).toBe(1000);
      expect(signal.direction).toBe('in');
    });

    test('should support both directions', () => {
      const zapIn: ZapSignal = {
        amountSats: 500,
        timestamp: new Date().toISOString(),
        senderId: 'user1',
        direction: 'in'
      };

      const zapOut: ZapSignal = {
        amountSats: 500,
        timestamp: new Date().toISOString(),
        senderId: 'user1',
        direction: 'out'
      };

      expect(zapIn.direction).toBe('in');
      expect(zapOut.direction).toBe('out');
    });

    test('should support optional metadata', () => {
      const signal: ZapSignal = {
        amountSats: 15000,
        timestamp: new Date().toISOString(),
        senderId: 'user1',
        direction: 'in',
        metadata: {
          isSmall: false,
          isMedium: false,
          isLarge: true
        }
      };

      expect(signal.metadata?.isSmall).toBe(false);
      expect(signal.metadata?.isMedium).toBe(false);
      expect(signal.metadata?.isLarge).toBe(true);
    });
  });

  describe('TemporalSignal', () => {
    test('should create valid temporal signal', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const signal: TemporalSignal = {
        interactionTimestamp: oneHourAgo.toISOString(),
        currentTime: now.toISOString()
      };

      expect(signal.interactionTimestamp).toBeDefined();
      expect(signal.currentTime).toBeDefined();
    });

    test('should support optional metadata', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const signal: TemporalSignal = {
        interactionTimestamp: oneHourAgo.toISOString(),
        currentTime: now.toISOString(),
        metadata: {
          lastActivityBefore: '2026-01-09T10:00:00Z',
          nextActivityAfter: '2026-01-09T12:00:00Z'
        }
      };

      expect(signal.metadata?.lastActivityBefore).toBeDefined();
      expect(signal.metadata?.nextActivityAfter).toBeDefined();
    });
  });

  describe('SilenceSignal', () => {
    test('should create valid silence signal', () => {
      const now = new Date();
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const signal: SilenceSignal = {
        silenceDurationMinutes: 30,
        lastInteractionTimestamp: thirtyMinAgo.toISOString(),
        currentTime: now.toISOString()
      };

      expect(signal.silenceDurationMinutes).toBe(30);
      expect(signal.lastInteractionTimestamp).toBeDefined();
      expect(signal.currentTime).toBeDefined();
    });

    test('should support optional metadata', () => {
      const now = new Date();
      const fortyFiveMinAgo = new Date(now.getTime() - 45 * 60 * 1000);

      const signal: SilenceSignal = {
        silenceDurationMinutes: 45,
        lastInteractionTimestamp: fortyFiveMinAgo.toISOString(),
        currentTime: now.toISOString(),
        metadata: {
          expectedResponseWindow: 60,
          averageResponseTime: 45
        }
      };

      expect(signal.metadata?.expectedResponseWindow).toBe(60);
      expect(signal.metadata?.averageResponseTime).toBe(45);
    });
  });

  describe('TrustScore', () => {
    test('should create valid trust score', () => {
      const score: TrustScore = {
        overallScore: 0.75,
        confidence: 0.8,
        breakdown: {
          text: 0.8,
          zap: 0.7,
          temporal: 0.75,
          silence: 0.7
        },
        phase: 'B',
        insights: ['Strong engagement detected']
      };

      expect(score.overallScore).toBe(0.75);
      expect(score.confidence).toBe(0.8);
      expect(score.breakdown.text).toBe(0.8);
      expect(score.breakdown.zap).toBe(0.7);
      expect(score.breakdown.temporal).toBe(0.75);
      expect(score.breakdown.silence).toBe(0.7);
      expect(score.phase).toBe('B');
      expect(score.insights).toHaveLength(1);
    });

    test('should validate score bounds', () => {
      const score: TrustScore = {
        overallScore: 0.95,
        confidence: 1.0,
        breakdown: {
          text: 0.9,
          zap: 0.85,
          temporal: 1.0,
          silence: 0.8
        },
        phase: 'B',
        insights: []
      };

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(1.0);
      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1.0);
    });

    test('should have valid breakdown for all modalities', () => {
      const score: TrustScore = {
        overallScore: 0.6,
        confidence: 0.75,
        breakdown: {
          text: 0.7,
          zap: 0.6,
          temporal: 0.5,
          silence: 0.6
        },
        phase: 'C',
        insights: ['Extended processing']
      };

      expect(Object.keys(score.breakdown)).toEqual(['text', 'zap', 'temporal', 'silence']);
    });
  });

  describe('TrustScoringConfig', () => {
    test('should create valid configuration', () => {
      const config: TrustScoringConfig = {
        weights: {
          text: 0.3,
          zap: 0.25,
          temporal: 0.25,
          silence: 0.2
        },
        thresholds: {
          phaseA: 30,
          phaseB: 120,
          phaseC: 240,
          phaseD: Infinity
        },
        zapThresholds: {
          small: 100,
          medium: 1000,
          large: 10000
        }
      };

      expect(config.weights.text + config.weights.zap + config.weights.temporal + config.weights.silence).toBe(1.0);
      expect(config.thresholds.phaseA).toBe(30);
      expect(config.thresholds.phaseB).toBe(120);
      expect(config.thresholds.phaseC).toBe(240);
      expect(config.thresholds.phaseD).toBe(Infinity);
    });

    test('should enforce weight sum to 1.0', () => {
      const config: TrustScoringConfig = {
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
          small: 100,
          medium: 1000,
          large: 10000
        }
      };

      const sum = Object.values(config.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    test('should define temporal thresholds for all phases', () => {
      const config: TrustScoringConfig = {
        weights: {
          text: 0.25,
          zap: 0.25,
          temporal: 0.25,
          silence: 0.25
        },
        thresholds: {
          phaseA: 30,
          phaseB: 120,
          phaseC: 240,
          phaseD: Infinity
        },
        zapThresholds: {
          small: 100,
          medium: 1000,
          large: 10000
        }
      };

      expect(config.thresholds.phaseA).toBeLessThan(config.thresholds.phaseB);
      expect(config.thresholds.phaseB).toBeLessThan(config.thresholds.phaseC);
      expect(config.thresholds.phaseC).toBeLessThan(Infinity);
    });
  });

  describe('Type Integration', () => {
    test('should integrate all types for trust scoring workflow', () => {
      const baseTime = new Date();

      const textSignals: TextSignal[] = [
        {
          content: 'Bitcoin',
          timestamp: baseTime.toISOString(),
          senderId: 'user1',
          metadata: { length: 7, hasBitcoinKeywords: true }
        }
      ];

      const zapSignals: ZapSignal[] = [
        {
          amountSats: 5000,
          timestamp: baseTime.toISOString(),
          senderId: 'user1',
          direction: 'in'
        }
      ];

      const temporalSignal: TemporalSignal = {
        interactionTimestamp: new Date(baseTime.getTime() - 60 * 60 * 1000).toISOString(),
        currentTime: baseTime.toISOString()
      };

      const silenceSignal: SilenceSignal = {
        silenceDurationMinutes: 45,
        lastInteractionTimestamp: new Date(baseTime.getTime() - 45 * 60 * 1000).toISOString(),
        currentTime: baseTime.toISOString()
      };

      const config: TrustScoringConfig = {
        weights: { text: 0.3, zap: 0.25, temporal: 0.25, silence: 0.2 },
        thresholds: { phaseA: 30, phaseB: 120, phaseC: 240, phaseD: Infinity },
        zapThresholds: { small: 100, medium: 1000, large: 10000 }
      };

      expect(textSignals).toHaveLength(1);
      expect(zapSignals).toHaveLength(1);
      expect(temporalSignal).toBeDefined();
      expect(silenceSignal).toBeDefined();
      expect(config).toBeDefined();
    });
  });
});
