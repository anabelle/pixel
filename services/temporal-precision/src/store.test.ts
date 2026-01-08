import { TemporalStore } from '../src/store';
import { EvolutionVector, CatalystEvent } from '../src/types';

describe('TemporalStore', () => {
  let store: TemporalStore;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = `/tmp/test-temporal-${Date.now()}`;
    store = new TemporalStore(testDataDir);
    await store.initialize();
  });

  afterEach(async () => {
    const fs = require('fs/promises');
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch {}
  });

  describe('initialize', () => {
    it('should create data directory and default files', async () => {
      const fs = require('fs/promises');
      
      expect(await fs.access(testDataDir)).not.toThrow();
      
      const vectors = await store.loadVectors();
      expect(vectors).toEqual([]);
      
      const catalysts = await store.loadCatalysts();
      expect(catalysts).toEqual([]);
    });
  });

  describe('addVector', () => {
    it('should add a new vector', async () => {
      const vector: EvolutionVector = {
        id: 'vector-1',
        type: 'economic',
        name: 'test-vector',
        state: 'active',
        strength: 0.8,
        lastActivation: new Date().toISOString(),
        activationHistory: [],
        metadata: {},
      };

      await store.addVector(vector);

      const vectors = await store.loadVectors();
      expect(vectors).toHaveLength(1);
      expect(vectors[0].id).toBe('vector-1');
    });

    it('should update existing vector with same id', async () => {
      const vector: EvolutionVector = {
        id: 'vector-1',
        type: 'economic',
        name: 'test-vector',
        state: 'active',
        strength: 0.8,
        lastActivation: new Date().toISOString(),
        activationHistory: [],
        metadata: {},
      };

      await store.addVector(vector);

      const updatedVector: EvolutionVector = {
        ...vector,
        strength: 0.9,
        state: 'peak',
      };

      await store.addVector(updatedVector);

      const vectors = await store.loadVectors();
      expect(vectors).toHaveLength(1);
      expect(vectors[0].strength).toBe(0.9);
      expect(vectors[0].state).toBe('peak');
    });
  });

  describe('addCatalyst', () => {
    it('should add a catalyst event', async () => {
      const catalyst: CatalystEvent = {
        id: 'catalyst-1',
        timestamp: new Date().toISOString(),
        type: 'economic',
        description: 'venezuela-economic',
        affectedVectors: ['vector-1'],
        cycle: '26.76',
      };

      await store.addCatalyst(catalyst);

      const catalysts = await store.loadCatalysts();
      expect(catalysts).toHaveLength(1);
      expect(catalysts[0].description).toBe('venezuela-economic');
    });
  });

  describe('updateVectorState', () => {
    it('should update vector state and add activation history', async () => {
      const vector: EvolutionVector = {
        id: 'vector-1',
        type: 'economic',
        name: 'test-vector',
        state: 'dormant',
        strength: 0,
        lastActivation: new Date().toISOString(),
        activationHistory: [],
        metadata: {},
      };

      await store.addVector(vector);
      await store.updateVectorState('vector-1', 'active', 0.8, 'catalyst-1');

      const vectors = await store.loadVectors();
      expect(vectors[0].state).toBe('active');
      expect(vectors[0].strength).toBe(0.8);
      expect(vectors[0].activationHistory).toHaveLength(1);
      expect(vectors[0].activationHistory[0].trigger).toBe('catalyst-1');
    });

    it('should not update non-existent vector', async () => {
      await store.updateVectorState('non-existent', 'active', 0.8);

      const vectors = await store.loadVectors();
      expect(vectors).toHaveLength(0);
    });
  });

  describe('getVectorsByType', () => {
    it('should filter vectors by type', async () => {
      const vectors: EvolutionVector[] = [
        {
          id: 'vector-1',
          type: 'economic',
          name: 'test-1',
          state: 'active',
          strength: 0.8,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          id: 'vector-2',
          type: 'narrative',
          name: 'test-2',
          state: 'active',
          strength: 0.7,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
      ];

      for (const vector of vectors) {
        await store.addVector(vector);
      }

      const economicVectors = await store.getVectorsByType('economic');
      expect(economicVectors).toHaveLength(1);
      expect(economicVectors[0].type).toBe('economic');
    });
  });

  describe('getActiveVectors', () => {
    it('should return active and peak vectors', async () => {
      const vectors: EvolutionVector[] = [
        {
          id: 'vector-1',
          type: 'economic',
          name: 'test-1',
          state: 'active',
          strength: 0.8,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          id: 'vector-2',
          type: 'narrative',
          name: 'test-2',
          state: 'peak',
          strength: 0.9,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          id: 'vector-3',
          type: 'social',
          name: 'test-3',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
      ];

      for (const vector of vectors) {
        await store.addVector(vector);
      }

      const activeVectors = await store.getActiveVectors();
      expect(activeVectors).toHaveLength(2);
      expect(activeVectors.every(v => v.state === 'active' || v.state === 'peak')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const vector: EvolutionVector = {
        id: 'vector-1',
        type: 'economic',
        name: 'test-1',
        state: 'active',
        strength: 0.8,
        lastActivation: new Date().toISOString(),
        activationHistory: [],
        metadata: {},
      };

      await store.addVector(vector);

      const catalyst: CatalystEvent = {
        id: 'catalyst-1',
        timestamp: new Date().toISOString(),
        type: 'economic',
        description: 'test',
        affectedVectors: [],
        cycle: '26.76',
      };

      await store.addCatalyst(catalyst);

      const stats = await store.getStats();
      expect(stats.totalVectors).toBe(1);
      expect(stats.activeVectors).toBe(1);
      expect(stats.totalCatalysts).toBe(1);
    });
  });
});
