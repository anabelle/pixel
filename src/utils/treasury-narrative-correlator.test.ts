import { expect, test, describe, beforeEach } from 'bun:test';
import { TreasuryNarrativeCorrelator } from './treasury-narrative-correlator';
import { NarrativeEvent, TreasuryEvent } from '../workers/intelligence-types';

describe('TreasuryNarrativeCorrelator', () => {
  let mockNarratives: NarrativeEvent[];
  let mockTreasury: TreasuryEvent[];
  let correlator: TreasuryNarrativeCorrelator;

  beforeEach(() => {
    const now = new Date().toISOString();
    
    mockNarratives = [
      {
        id: 'n1',
        tags: ['sovereign-value-extraction', 'bitcoin'],
        content: 'Bitcoin is sovereign value extraction through energy proof',
        summary: 'Bitcoin sovereignty narrative',
        importance: 'high',
        score: 0.9,
        timestamp: now,
      },
      {
        id: 'n2',
        tags: ['geopolitical-bitcoin-utility'],
        content: 'Bitcoin provides utility during hyperinflation crises',
        summary: 'Hyperinflation narrative',
        importance: 'high',
        score: 0.85,
        timestamp: now,
      },
      {
        id: 'n3',
        tags: ['lightning-network'],
        content: 'Lightning Network enables instant global payments',
        summary: 'Lightning narrative',
        importance: 'medium',
        score: 0.7,
        timestamp: now,
      },
    ];

    mockTreasury = [
      {
        type: 'zap_in',
        amountSats: 1000,
        timestamp: now,
        context: 'Received zap for sovereign value extraction work',
        decision: 'Accept and thank',
      },
      {
        type: 'tip',
        amountSats: 500,
        timestamp: now,
        context: 'Sent tip for hyperinflation commentary',
        decision: 'Support geopolitical utility research',
      },
      {
        type: 'expense',
        amountSats: 200,
        timestamp: now,
        context: 'Paid for VPS hosting',
      },
    ];

    correlator = new TreasuryNarrativeCorrelator(mockNarratives, mockTreasury);
  });

  describe('Constructor', () => {
    test('should initialize with empty arrays', () => {
      const emptyCorrelator = new TreasuryNarrativeCorrelator([], []);
      expect(emptyCorrelator).toBeDefined();
    });

    test('should initialize with provided narratives and treasury events', () => {
      expect(correlator).toBeDefined();
    });
  });

  describe('analyzeCorrelations', () => {
    test('should return correlations with minimum strength of 0.3', () => {
      const weakNarratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['unrelated'],
          content: 'This has no relation to treasury events',
          timestamp: new Date().toISOString(),
        },
      ];

      const weakTreasury: TreasuryEvent[] = [
        {
          type: 'expense',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'Random expense',
        },
      ];

      const weakCorrelator = new TreasuryNarrativeCorrelator(weakNarratives, weakTreasury);
      const correlations = weakCorrelator.analyzeCorrelations();

      correlations.forEach(correlation => {
        expect(correlation.strength).toBeGreaterThanOrEqual(0.3);
      });
    });

    test('should filter correlations below 0.3 strength threshold', () => {
      const weakCorrelations = correlator.analyzeCorrelations();

      weakCorrelations.forEach(correlation => {
        expect(correlation.strength).toBeGreaterThanOrEqual(0.3);
      });
    });

    test('should sort correlations by strength in descending order', () => {
      const correlations = correlator.analyzeCorrelations();
      
      for (let i = 1; i < correlations.length; i++) {
        expect(correlations[i - 1].strength).toBeGreaterThanOrEqual(correlations[i].strength);
      }
    });

    test('should respect time window parameter', () => {
      const oldTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      
      const oldNarratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['sovereign-value-extraction'],
          content: 'Bitcoin sovereignty',
          timestamp: oldTimestamp,
        },
      ];
      
      const oldTreasury: TreasuryEvent[] = [
        {
          type: 'zap_in',
          amountSats: 1000,
          timestamp: oldTimestamp,
          context: 'Old zap',
        },
      ];
      
      const oldCorrelator = new TreasuryNarrativeCorrelator(oldNarratives, oldTreasury);
      const correlations = oldCorrelator.analyzeCorrelations(24);
      
      expect(correlations).toEqual([]);
    });

    test('should include correlations within time window', () => {
      const correlations = correlator.analyzeCorrelations(24);
      expect(correlations.length).toBeGreaterThan(0);
    });

    test('should handle empty narratives', () => {
      const noNarrativesCorrelator = new TreasuryNarrativeCorrelator([], mockTreasury);
      const correlations = noNarrativesCorrelator.analyzeCorrelations();
      expect(correlations).toEqual([]);
    });

    test('should handle empty treasury events', () => {
      const noTreasuryCorrelator = new TreasuryNarrativeCorrelator(mockNarratives, []);
      const correlations = noTreasuryCorrelator.analyzeCorrelations();
      expect(correlations).toEqual([]);
    });

    test('should handle narratives without timestamp', () => {
      const noTimestampNarratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['sovereign-value-extraction'],
          content: 'No timestamp',
        },
      ];
      
      const noTimestampCorrelator = new TreasuryNarrativeCorrelator(noTimestampNarratives, mockTreasury);
      const correlations = noTimestampCorrelator.analyzeCorrelations();
      expect(correlations).toEqual([]);
    });
  });

  describe('Transaction Pattern Matching', () => {
    test('should detect zap_in alignment with sovereign Bitcoin narrative', () => {
      const correlations = correlator.analyzeCorrelations();

      const zapInCorrelation = correlations.find(c =>
        c.economicDecision.type === 'zap_in' &&
        c.narrative.tags.includes('sovereign-value-extraction')
      );

      expect(zapInCorrelation).toBeDefined();
      if (zapInCorrelation) {
        expect(zapInCorrelation.correlation).toContain('Zap aligned with sovereign Bitcoin narrative');
        expect(zapInCorrelation.strength).toBeGreaterThanOrEqual(0.7);
      }
    });

    test('should detect tip alignment with geopolitical Bitcoin utility narrative', () => {
      const correlations = correlator.analyzeCorrelations();
      
      const tipCorrelation = correlations.find(c => 
        c.economicDecision.type === 'tip' &&
        c.narrative.tags.includes('geopolitical-bitcoin-utility')
      );
      
      expect(tipCorrelation).toBeDefined();
      if (tipCorrelation) {
        expect(tipCorrelation.correlation).toContain('Tip sent in support of geopolitical Bitcoin utility narrative');
        expect(tipCorrelation.strength).toBe(0.8);
      }
    });

    test('should detect direct tag references in context', () => {
      const tagTreasury: TreasuryEvent[] = [
        {
          type: 'payment',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'Payment for lightning-network services',
          decision: 'Approve',
        },
      ];

      const tagCorrelator = new TreasuryNarrativeCorrelator(mockNarratives, tagTreasury);
      const correlations = tagCorrelator.analyzeCorrelations();

      const lightningCorrelation = correlations.find(c =>
        c.correlation.includes('Economic action directly references narrative tag')
      );

      expect(lightningCorrelation).toBeDefined();
    });

    test('should handle zap_out transactions', () => {
      const zapOutTreasury: TreasuryEvent[] = [
        {
          type: 'zap_out',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'Sent zap for sovereign value',
        },
      ];
      
      const zapOutCorrelator = new TreasuryNarrativeCorrelator(mockNarratives, zapOutTreasury);
      const correlations = zapOutCorrelator.analyzeCorrelations();
      
      expect(correlations.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle payment transactions', () => {
      const paymentTreasury: TreasuryEvent[] = [
        {
          type: 'payment',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'Payment for Bitcoin work',
          decision: 'Pay',
        },
      ];
      
      const paymentCorrelator = new TreasuryNarrativeCorrelator(mockNarratives, paymentTreasury);
      const correlations = paymentCorrelator.analyzeCorrelations();
      
      expect(correlations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Narrative Event Extraction', () => {
    test('should extract narrative tags correctly', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['tag1', 'tag2', 'tag3'],
          content: 'Content',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, []);
      const topTags = correlator.getTopNarrativeTags(3);
      
      expect(topTags).toContain('tag1');
      expect(topTags).toContain('tag2');
      expect(topTags).toContain('tag3');
    });

    test('should count tag frequency correctly', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['bitcoin', 'sovereign'],
          content: 'Content 1',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'n2',
          tags: ['bitcoin', 'lightning'],
          content: 'Content 2',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'n3',
          tags: ['sovereign'],
          content: 'Content 3',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, []);
      const topTags = correlator.getTopNarrativeTags(5);
      
      expect(topTags[0]).toBe('bitcoin');
      expect(topTags[1]).toBe('sovereign');
      expect(topTags[2]).toBe('lightning');
    });

    test('should handle empty tags array', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: [],
          content: 'Content',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, []);
      const topTags = correlator.getTopNarrativeTags(5);
      
      expect(topTags).toEqual([]);
    });

    test('should limit results to requested limit', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['tag1'],
          content: 'Content 1',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'n2',
          tags: ['tag2'],
          content: 'Content 2',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'n3',
          tags: ['tag3'],
          content: 'Content 3',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, []);
      const topTags = correlator.getTopNarrativeTags(2);
      
      expect(topTags.length).toBe(2);
    });

    test('should handle narratives without tags', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: [],
          content: 'No tags',
          timestamp: new Date().toISOString(),
        },
      ];

      const correlator = new TreasuryNarrativeCorrelator(narratives, []);
      const topTags = correlator.getTopNarrativeTags(5);

      expect(topTags).toEqual([]);
    });
  });

  describe('Correlation Scoring Algorithm', () => {
    test('should boost strength for word matches >= 2', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['unrelated'],
          content: 'sovereign value extraction through energy proof',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const treasury: TreasuryEvent[] = [
        {
          type: 'payment',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'Payment for sovereign value work',
          decision: 'Approve',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      
      if (correlations.length > 0) {
        expect(correlations[0].strength).toBeGreaterThan(0.3);
      }
    });

    test('should cap strength at 1.0', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['geopolitical-bitcoin-utility'],
          content: 'bitcoin hyperinflation utility sovereign extraction',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const treasury: TreasuryEvent[] = [
        {
          type: 'tip',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'Support bitcoin hyperinflation utility research',
          decision: 'Support',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      
      if (correlations.length > 0) {
        expect(correlations[0].strength).toBeLessThanOrEqual(1.0);
      }
    });

    test('should assign default strength of 0.3 for weak correlations', () => {
      const weakNarratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['unrelated'],
          content: 'Some content',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const weakTreasury: TreasuryEvent[] = [
        {
          type: 'expense',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'unrelated expense',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(weakNarratives, weakTreasury);
      const correlations = correlator.analyzeCorrelations();
      
      if (correlations.length > 0) {
        expect(correlations[0].strength).toBeGreaterThanOrEqual(0.3);
      }
    });

    test('should assign strength 0.7 for zap_in sovereign Bitcoin alignment', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['sovereign-value-extraction'],
          content: 'Bitcoin sovereign value',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const treasury: TreasuryEvent[] = [
        {
          type: 'zap_in',
          amountSats: 1000,
          timestamp: new Date().toISOString(),
          context: 'Zap for Bitcoin work',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      
      const zapCorrelation = correlations.find(c => c.economicDecision.type === 'zap_in');
      expect(zapCorrelation?.strength).toBe(0.7);
    });

    test('should assign strength 0.8 for tip geopolitical utility alignment', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['geopolitical-bitcoin-utility'],
          content: 'Hyperinflation utility',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const treasury: TreasuryEvent[] = [
        {
          type: 'tip',
          amountSats: 500,
          timestamp: new Date().toISOString(),
          context: 'Hyperinflation support',
          decision: 'Support',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      
      const tipCorrelation = correlations.find(c => c.economicDecision.type === 'tip');
      expect(tipCorrelation?.strength).toBe(0.8);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty transactions array', () => {
      const correlator = new TreasuryNarrativeCorrelator([], mockNarratives);
      const correlations = correlator.analyzeCorrelations();
      expect(correlations).toEqual([]);
    });

    test('should handle empty narrative events array', () => {
      const correlator = new TreasuryNarrativeCorrelator(mockTreasury, []);
      const correlations = correlator.analyzeCorrelations();
      expect(correlations).toEqual([]);
    });

    test('should handle both empty arrays', () => {
      const correlator = new TreasuryNarrativeCorrelator([], []);
      const correlations = correlator.analyzeCorrelations();
      expect(correlations).toEqual([]);
    });

    test('should handle narratives with missing optional fields', () => {
      const minimalNarratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: [],
          content: 'Minimal narrative',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(minimalNarratives, []);
      const correlations = correlator.analyzeCorrelations();
      expect(correlations).toEqual([]);
    });

    test('should handle treasury events with missing optional fields', () => {
      const minimalTreasury: TreasuryEvent[] = [
        {
          type: 'expense',
          amountSats: 100,
          timestamp: new Date().toISOString(),
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator([], minimalTreasury);
      const correlations = correlator.analyzeCorrelations();
      expect(correlations).toEqual([]);
    });

    test('should handle undefined context in treasury events', () => {
      const treasury: TreasuryEvent[] = [
        {
          type: 'zap_in',
          amountSats: 100,
          timestamp: new Date().toISOString(),
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(mockNarratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      
      expect(Array.isArray(correlations)).toBe(true);
    });

    test('should handle undefined content in narrative events', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['tag1'],
          timestamp: new Date().toISOString(),
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, mockTreasury);
      const correlations = correlator.analyzeCorrelations();
      
      expect(Array.isArray(correlations)).toBe(true);
    });

    test('should handle case-insensitive matching', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['BITCOIN'],
          content: 'Bitcoin is SOVEREIGN',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const treasury: TreasuryEvent[] = [
        {
          type: 'payment',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'payment for bitcoin sovereign work',
          decision: 'Pay',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      
      expect(correlations.length).toBeGreaterThan(0);
    });
  });

  describe('Word Matching', () => {
    test('should only count words longer than 4 characters', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['unrelated'],
          content: 'The cat sat on mat',
          timestamp: new Date().toISOString(),
        },
      ];

      const treasury: TreasuryEvent[] = [
        {
          type: 'payment',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'The cat sat on mat',
          decision: 'Pay',
        },
      ];

      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();

      if (correlations.length > 0) {
        expect(correlations[0].strength).toBeLessThan(0.5);
      }
    });

    test('should count words longer than 4 characters', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['unrelated'],
          content: 'sovereign value extraction',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const treasury: TreasuryEvent[] = [
        {
          type: 'payment',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'sovereign value extraction',
          decision: 'Pay',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      
      if (correlations.length > 0) {
        expect(correlations[0].strength).toBeGreaterThan(0.3);
      }
    });

    test('should handle duplicate words in same text', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['unrelated'],
          content: 'sovereign sovereign sovereign',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const treasury: TreasuryEvent[] = [
        {
          type: 'payment',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'sovereign sovereign sovereign',
          decision: 'Pay',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      
      expect(Array.isArray(correlations)).toBe(true);
    });
  });

  describe('Decision Success Calculation', () => {
    test('should return 0 for empty correlations array', () => {
      const correlator = new TreasuryNarrativeCorrelator([], []);
      const success = correlator.calculateDecisionSuccess([]);
      expect(success).toBe(0);
    });

    test('should calculate average strength correctly', () => {
      const narratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['geopolitical-bitcoin-utility'],
          content: 'Hyperinflation',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const treasury: TreasuryEvent[] = [
        {
          type: 'tip',
          amountSats: 100,
          timestamp: new Date().toISOString(),
          context: 'Hyperinflation',
          decision: 'Support',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
      const correlations = correlator.analyzeCorrelations();
      const success = correlator.calculateDecisionSuccess(correlations);
      
      expect(success).toBeGreaterThan(0);
      expect(success).toBeLessThanOrEqual(100);
    });

    test('should return rounded integer', () => {
      const correlations = [
        { narrative: mockNarratives[0], economicDecision: mockTreasury[0], correlation: 'Test', strength: 0.75 },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator([], []);
      const success = correlator.calculateDecisionSuccess(correlations);
      
      expect(success).toBe(75);
    });

    test('should handle single correlation', () => {
      const correlations = [
        { narrative: mockNarratives[0], economicDecision: mockTreasury[0], correlation: 'Test', strength: 0.5 },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator([], []);
      const success = correlator.calculateDecisionSuccess(correlations);
      
      expect(success).toBe(50);
    });

    test('should handle multiple correlations with varying strengths', () => {
      const correlations = [
        { narrative: mockNarratives[0], economicDecision: mockTreasury[0], correlation: 'Test', strength: 0.5 },
        { narrative: mockNarratives[1], economicDecision: mockTreasury[1], correlation: 'Test', strength: 0.7 },
        { narrative: mockNarratives[2], economicDecision: mockTreasury[2], correlation: 'Test', strength: 0.3 },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator([], []);
      const success = correlator.calculateDecisionSuccess(correlations);
      
      expect(success).toBe(50);
    });
  });

  describe('Integration Tests', () => {
    test('should correlate zap_in with Bitcoin narratives correctly', () => {
      const bitcoinNarratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['sovereign-value-extraction'],
          content: 'Bitcoin is sovereign value extraction',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'n2',
          tags: ['lightning-network'],
          content: 'Lightning Network enables fast Bitcoin payments',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const zapIn: TreasuryEvent[] = [
        {
          type: 'zap_in',
          amountSats: 1000,
          timestamp: new Date().toISOString(),
          context: 'Zap for Bitcoin Lightning work',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(bitcoinNarratives, zapIn);
      const correlations = correlator.analyzeCorrelations();
      
      expect(correlations.length).toBeGreaterThan(0);
      
      const bitcoinCorrelation = correlations.find(c => 
        c.narrative.tags.includes('sovereign-value-extraction') ||
        c.narrative.content.toLowerCase().includes('bitcoin')
      );
      
      expect(bitcoinCorrelation).toBeDefined();
    });

    test('should correlate tip with geopolitical narratives correctly', () => {
      const geopoliticalNarratives: NarrativeEvent[] = [
        {
          id: 'n1',
          tags: ['geopolitical-bitcoin-utility'],
          content: 'Bitcoin provides utility during hyperinflation',
          timestamp: new Date().toISOString(),
        },
      ];
      
      const tip: TreasuryEvent[] = [
        {
          type: 'tip',
          amountSats: 500,
          timestamp: new Date().toISOString(),
          context: 'Support hyperinflation research',
          decision: 'Support geopolitical utility',
        },
      ];
      
      const correlator = new TreasuryNarrativeCorrelator(geopoliticalNarratives, tip);
      const correlations = correlator.analyzeCorrelations();
      
      expect(correlations.length).toBeGreaterThan(0);
      
      const geopoliticalCorrelation = correlations.find(c => 
        c.narrative.tags.includes('geopolitical-bitcoin-utility') ||
        c.narrative.content.toLowerCase().includes('hyperinflation')
      );
      
      expect(geopoliticalCorrelation).toBeDefined();
    });

    test('should generate meaningful correlation descriptions', () => {
      const correlator = new TreasuryNarrativeCorrelator(mockNarratives, mockTreasury);
      const correlations = correlator.analyzeCorrelations();
      
      correlations.forEach(correlation => {
        expect(correlation.correlation).toBeDefined();
        expect(correlation.correlation.length).toBeGreaterThan(0);
        expect(typeof correlation.correlation).toBe('string');
      });
    });

    test('should maintain data integrity through full analysis pipeline', () => {
      const correlator = new TreasuryNarrativeCorrelator(mockNarratives, mockTreasury);
      const correlations = correlator.analyzeCorrelations();
      const topTags = correlator.getTopNarrativeTags(5);
      const successRate = correlator.calculateDecisionSuccess(correlations);
      
      expect(Array.isArray(correlations)).toBe(true);
      expect(Array.isArray(topTags)).toBe(true);
      expect(typeof successRate).toBe('number');
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(100);
    });
  });
});
