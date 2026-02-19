import { TemporalStore } from '../src/store';
import { TemporalCorrelator } from '../src/correlator';
import { EvolutionVector, CatalystEvent } from '../src/types';

describe('TemporalCorrelator', () => {
  let store: TemporalStore;
  let correlator: TemporalCorrelator;
  let testDataDir: string;

  beforeEach(() => {
    testDataDir = `/tmp/test-temporal-${Date.now()}`;
    store = new TemporalStore(testDataDir);
    correlator = new TemporalCorrelator(store);
  });

  afterEach(async () => {
    const fs = require('fs/promises');
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch {}
  });

  describe('recordCatalyst', () => {
    it('should record a catalyst event', async () => {
      const catalyst: Omit<CatalystEvent, 'id'> = {
        timestamp: new Date().toISOString(),
        type: 'economic',
        description: 'venezuela-economic',
        affectedVectors: ['vector-1'],
        cycle: '26.76',
      };

      await store.initialize();
      const result = await correlator.recordCatalyst(catalyst);

      expect(result.id).toMatch(/^catalyst-/);
      expect(result.description).toBe('venezuela-economic');
      
      const catalysts = await store.loadCatalysts();
      expect(catalysts).toHaveLength(1);
      expect(catalysts[0].description).toBe('venezuela-economic');
    });

    it('should trigger cascade for venezuela-economic catalyst', async () => {
      await store.initialize();

      const vectors: Omit<EvolutionVector, 'id'>[] = [
        {
          type: 'economic',
          name: 'venezuela',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'geopolitical',
          name: 'venezuela',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'governance',
          name: 'venezuela',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
      ];

      for (const vectorData of vectors) {
        await store.addVector({
          ...vectorData,
          id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }

      const catalyst: Omit<CatalystEvent, 'id'> = {
        timestamp: new Date().toISOString(),
        type: 'economic',
        description: 'venezuela-economic',
        affectedVectors: [],
        cycle: '26.76',
      };

      await correlator.recordCatalyst(catalyst);

      const loadedVectors = await store.loadVectors();
      const economicVector = loadedVectors.find(v => v.type === 'economic' && v.name === 'venezuela');
      
      expect(economicVector?.state).toBe('active');
      expect(economicVector?.strength).toBeGreaterThan(0.8);
    });
  });

  describe('analyzeVectorConvergence', () => {
    it('should detect convergence when multiple vectors are active', async () => {
      await store.initialize();

      const vectors: Omit<EvolutionVector, 'id'>[] = [
        {
          type: 'economic',
          name: 'test-economic',
          state: 'active',
          strength: 0.85,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'narrative',
          name: 'test-narrative',
          state: 'active',
          strength: 0.8,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'social',
          name: 'test-social',
          state: 'active',
          strength: 0.75,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
      ];

      for (const vectorData of vectors) {
        await store.addVector({
          ...vectorData,
          id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }

      const convergences = await correlator.analyzeVectorConvergence();

      expect(convergences).toHaveLength(1);
      expect(convergences[0].convergenceScore).toBeGreaterThanOrEqual(0.7);
      expect(convergences[0].treasuryWindow).toBeDefined();
    });

    it('should not detect convergence with insufficient vectors', async () => {
      await store.initialize();

      const vector: Omit<EvolutionVector, 'id'> = {
        type: 'economic',
        name: 'test-economic',
        state: 'active',
        strength: 0.8,
        lastActivation: new Date().toISOString(),
        activationHistory: [],
        metadata: {},
      };

      await store.addVector({
        ...vector,
        id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      const convergences = await correlator.analyzeVectorConvergence();

      expect(convergences).toHaveLength(0);
    });
  });

  describe('predictTreasuryWindows', () => {
    it('should predict treasury windows when convergence detected', async () => {
      await store.initialize();

      const vectors: Omit<EvolutionVector, 'id'>[] = [
        {
          type: 'economic',
          name: 'test-economic',
          state: 'active',
          strength: 0.85,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'narrative',
          name: 'test-narrative',
          state: 'active',
          strength: 0.8,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'social',
          name: 'test-social',
          state: 'active',
          strength: 0.75,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
      ];

      for (const vectorData of vectors) {
        await store.addVector({
          ...vectorData,
          id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }

      const windows = await correlator.predictTreasuryWindows();

      expect(windows).toHaveLength(1);
      expect(windows[0].confidence).toBeGreaterThan(0.7);
      expect(windows[0].windowStart).toBeDefined();
      expect(windows[0].windowEnd).toBeDefined();
    });
  });

  describe('getVectorActivationStates', () => {
    it('should return activation states for all vectors', async () => {
      await store.initialize();

      const vector: Omit<EvolutionVector, 'id'> = {
        type: 'economic',
        name: 'test',
        state: 'active',
        strength: 0.8,
        lastActivation: new Date().toISOString(),
        activationHistory: [],
        metadata: {},
      };

      await store.addVector({
        ...vector,
        id: 'vector-test-1',
      });

      const states = await correlator.getVectorActivationStates();

      expect(states.size).toBe(1);
      expect(states.get('vector-test-1')).toBe('active');
    });
  });

  describe('getCatalystTimingPatterns', () => {
    it('should return timing patterns for catalysts', async () => {
      await store.initialize();

      const catalyst: Omit<CatalystEvent, 'id'> = {
        timestamp: new Date().toISOString(),
        type: 'economic',
        description: 'venezuela-economic',
        affectedVectors: [],
        cycle: '26.76',
      };

      await correlator.recordCatalyst(catalyst);

      const patterns = await correlator.getCatalystTimingPatterns('26.76');

      expect(patterns).toHaveLength(1);
      expect(patterns[0].catalystName).toBe('venezuela-economic');
      expect(patterns[0].cycle).toBe('26.76');
    });
  });
});
