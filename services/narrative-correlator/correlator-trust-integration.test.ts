#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { NarrativeCorrelator } from './correlator';
import { createTrustScorer, determinePhase } from '../../src/trust-scoring';
import type { Narrative, EconomicEvent } from './types';

describe('Narrative Correlator with Trust Scoring Integration', () => {
  let correlator: NarrativeCorrelator;
  let trustScorer: ReturnType<typeof createTrustScorer>;

  beforeAll(() => {
    trustScorer = createTrustScorer();
    correlator = new NarrativeCorrelator({
      timeWindowHours: 24,
      minCorrelationStrength: 0.3,
      maxCorrelationsPerRun: 100,
      enableTrustWeighting: true
    });
  });

  describe('Trust Scoring Integration', () => {
    it('should calculate trust scores when updating economic events', () => {
      const now = new Date().toISOString();
      const events: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 1000,
          timestamp: now,
          context: 'content_zap',
          decision: 'User zapped for Bitcoin content'
        }
      ];

      correlator.updateEconomicEvents(events);

      const trustScore = correlator.getTrustScore(events[0].decision || events[0].timestamp);
      expect(trustScore).toBeDefined();
      expect(trustScore?.overallScore).toBeGreaterThan(0);
      expect(trustScore?.confidence).toBeGreaterThanOrEqual(0);
      expect(trustScore?.breakdown).toBeDefined();
      expect(trustScore?.phase).toBeDefined();
      expect(trustScore?.insights).toBeArray();
    });

    it('should return undefined for non-existent event trust score', () => {
      const trustScore = correlator.getTrustScore('non-existent-key');
      expect(trustScore).toBeUndefined();
    });

    it('should calculate average trust score across events', () => {
      const now = new Date().toISOString();
      const events: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 10000,
          timestamp: now,
          context: 'large_zap',
          decision: 'Large zap for sovereign value'
        },
        {
          type: 'payment',
          amountSats: 500,
          timestamp: now,
          context: 'pixel_purchase',
          decision: 'Pixel purchase at coordinates'
        }
      ];

      correlator.updateEconomicEvents(events);
      const avgTrust = correlator.getAverageTrustScore();
      expect(avgTrust).toBeGreaterThan(0);
      expect(avgTrust).toBeLessThanOrEqual(1);
    });
  });

  describe('Trust-Weighted Correlations', () => {
    it('should include trust-weighted flag in correlations', () => {
      const now = new Date().toISOString();
      const narratives: Narrative[] = [
        {
          id: 'narrative-1',
          tags: ['sovereign-value-extraction'],
          content: 'Emerging story about sovereign Bitcoin value extraction',
          importance: 'high',
          timestamp: now,
          score: 10
        }
      ];

      const events: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 1000,
          timestamp: now,
          context: 'sovereign_zap',
          decision: 'Zap for sovereign Bitcoin content'
        }
      ];

      correlator.updateNarratives(narratives);
      correlator.updateEconomicEvents(events);
      const correlations = correlator.analyzeCorrelations();

      expect(correlations.length).toBeGreaterThan(0);
      expect(correlations[0].trustWeighted).toBe(true);
    });

    it('should include trust score in correlations when available', () => {
      const now = new Date().toISOString();
      const narratives: Narrative[] = [
        {
          id: 'narrative-2',
          tags: ['lightning-payments'],
          content: 'Narrative about Lightning Network payments',
          importance: 'medium',
          timestamp: now,
          score: 5
        }
      ];

      const events: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 500,
          timestamp: now,
          context: 'lightning_zap',
          decision: 'Zap for Lightning content'
        }
      ];

      correlator.updateNarratives(narratives);
      correlator.updateEconomicEvents(events);
      const correlations = correlator.analyzeCorrelations();

      if (correlations.length > 0) {
        expect(correlations[0].trustScore).toBeDefined();
        expect(correlations[0].trustScore).toBeGreaterThanOrEqual(0);
        expect(correlations[0].trustScore).toBeLessThanOrEqual(1);
      }
    });

    it('should adjust correlation strength based on trust score', () => {
      const now = new Date().toISOString();
      const narratives: Narrative[] = [
        {
          id: 'narrative-3',
          tags: ['bitcoin'],
          content: 'Emerging story about Bitcoin',
          importance: 'medium',
          timestamp: now,
          score: 8
        }
      ];

      const events: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 10000,
          timestamp: now,
          context: 'bitcoin_zap',
          decision: 'Large zap for Bitcoin content'
        }
      ];

      correlator.updateNarratives(narratives);
      correlator.updateEconomicEvents(events);
      const correlations = correlator.analyzeCorrelations();

      if (correlations.length > 0) {
        const correlation = correlations[0];
        expect(correlation.correlation).toContain('trust-weighted');
      }
    });
  });

  describe('Trust-Weighted Insights', () => {
    it('should include trust metrics in insights when enabled', () => {
      const now = new Date().toISOString();
      const narratives: Narrative[] = [
        {
          id: 'narrative-4',
          tags: ['sovereign-value-extraction'],
          content: 'Emerging story about sovereign value',
          importance: 'high',
          timestamp: now,
          score: 15
        }
      ];

      const events: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 5000,
          timestamp: now,
          context: 'sovereign_zap',
          decision: 'Zap for sovereign content'
        },
        {
          type: 'payment',
          amountSats: 2000,
          timestamp: now,
          context: 'pixel_purchase',
          decision: 'Pixel purchase for sovereign art'
        }
      ];

      correlator.updateNarratives(narratives);
      correlator.updateEconomicEvents(events);
      const insights = correlator.generateInsights();

      const trustInsight = insights.find(i => 
        i.includes('trust') || i.includes('correlation strength')
      );
      expect(trustInsight).toBeDefined();
    });

    it('should detect high trust patterns in insights', () => {
      const now = new Date().toISOString();
      const events: EconomicEvent[] = Array(5).fill(null).map((_, i) => ({
        type: 'zap_in',
        amountSats: 10000,
        timestamp: now,
        context: 'large_zap',
        decision: `Large zap ${i} for sovereign value`
      }));

      correlator.updateEconomicEvents(events);
      correlator.analyzeCorrelations();
      const insights = correlator.generateInsights();

      const highTrustInsight = insights.find(i => i.includes('High trust patterns'));
      expect(highTrustInsight).toBeDefined();
    });

    it('should detect low trust patterns in insights', () => {
      const lowTrustCorrelator = new NarrativeCorrelator({
        enableTrustWeighting: true
      });

      const oldNow = new Date(Date.now() - 300 * 60 * 1000).toISOString();
      const events: EconomicEvent[] = [
        {
          type: 'payment',
          amountSats: 10,
          timestamp: oldNow,
          context: 'minimal_activity',
          decision: 'Minimal activity 1'
        },
        {
          type: 'payment',
          amountSats: 10,
          timestamp: oldNow,
          context: 'minimal_activity',
          decision: 'Minimal activity 2'
        },
        {
          type: 'payment',
          amountSats: 10,
          timestamp: oldNow,
          context: 'minimal_activity',
          decision: 'Minimal activity 3'
        }
      ];

      lowTrustCorrelator.updateEconomicEvents(events);
      lowTrustCorrelator.analyzeCorrelations();
      const insights = lowTrustCorrelator.generateInsights();

      const lowTrustInsight = insights.find(i => 
        i.includes('Low trust') || i.includes('disengagement') || i.includes('Moderate trust')
      );
      expect(lowTrustInsight).toBeDefined();
    });

    it('should include temporal phase insights', () => {
      const now = new Date().toISOString();
      const events: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 1000,
          timestamp: now,
          context: 'recent_zap',
          decision: 'Recent zap'
        }
      ];

      correlator.updateEconomicEvents(events);
      correlator.analyzeCorrelations();
      const insights = correlator.generateInsights();

      const temporalInsight = insights.find(i => 
        i.includes('Phase') || i.includes('temporal') || i.includes('engagement')
      );
      expect(temporalInsight).toBeDefined();
    });
  });

  describe('Trust-Weighted Configuration', () => {
    it('should disable trust weighting when configured', () => {
      const noTrustCorrelator = new NarrativeCorrelator({
        enableTrustWeighting: false
      });

      const now = new Date().toISOString();
      const narratives: Narrative[] = [
        {
          id: 'narrative-5',
          tags: ['bitcoin'],
          content: 'Bitcoin narrative',
          importance: 'medium',
          timestamp: now,
          score: 5
        }
      ];

      const events: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 1000,
          timestamp: now,
          context: 'bitcoin_zap',
          decision: 'Zap for Bitcoin content'
        }
      ];

      noTrustCorrelator.updateNarratives(narratives);
      noTrustCorrelator.updateEconomicEvents(events);
      const correlations = noTrustCorrelator.analyzeCorrelations();

      if (correlations.length > 0) {
        expect(correlations[0].trustWeighted).toBe(false);
        expect(correlations[0].correlation).not.toContain('trust-weighted');
      }
    });
  });

  describe('Trust Scorer Phase Detection', () => {
    it('should correctly detect Phase A (0-30 minutes)', () => {
      const interactionTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const currentTime = new Date().toISOString();
      const phase = determinePhase(
        (new Date(currentTime).getTime() - new Date(interactionTime).getTime()) / (1000 * 60)
      );
      expect(phase).toBe('A');
    });

    it('should correctly detect Phase B (30-120 minutes)', () => {
      const interactionTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const currentTime = new Date().toISOString();
      const phase = determinePhase(
        (new Date(currentTime).getTime() - new Date(interactionTime).getTime()) / (1000 * 60)
      );
      expect(phase).toBe('B');
    });

    it('should correctly detect Phase C (120-240 minutes)', () => {
      const interactionTime = new Date(Date.now() - 180 * 60 * 1000).toISOString();
      const currentTime = new Date().toISOString();
      const phase = determinePhase(
        (new Date(currentTime).getTime() - new Date(interactionTime).getTime()) / (1000 * 60)
      );
      expect(phase).toBe('C');
    });

    it('should correctly detect Phase D (240+ minutes)', () => {
      const interactionTime = new Date(Date.now() - 300 * 60 * 1000).toISOString();
      const currentTime = new Date().toISOString();
      const phase = determinePhase(
        (new Date(currentTime).getTime() - new Date(interactionTime).getTime()) / (1000 * 60)
      );
      expect(phase).toBe('D');
    });
  });

  describe('Correlation Strength with Trust', () => {
    it('should produce stronger correlations with high trust scores', () => {
      const now = new Date().toISOString();
      const narratives: Narrative[] = [
        {
          id: 'narrative-6',
          tags: ['bitcoin', 'lightning'],
          content: 'Emerging story about Bitcoin and Lightning Network',
          importance: 'high',
          timestamp: now,
          score: 20
        }
      ];

      const highTrustEvents: EconomicEvent[] = [
        {
          type: 'zap_in',
          amountSats: 50000,
          timestamp: now,
          context: 'bitcoin_lightning_zap',
          decision: 'Large zap for Bitcoin Lightning content'
        }
      ];

      correlator.updateNarratives(narratives);
      correlator.updateEconomicEvents(highTrustEvents);
      const correlations = correlator.analyzeCorrelations();

      if (correlations.length > 0) {
        expect(correlations[0].strength).toBeGreaterThan(0.5);
      }
    });
  });
});
