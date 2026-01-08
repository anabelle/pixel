import express from 'express';
import cors from 'cors';
import { TemporalStore } from './store';
import { TemporalCorrelator } from './correlator';
import {
  EvolutionVector,
  CatalystEvent,
  VectorType,
} from './types';

export function createRouter(store: TemporalStore, correlator: TemporalCorrelator): express.Router {
  const router = express.Router();

  router.get('/health', async (req, res) => {
    try {
      const stats = await store.getStats();
      res.json({
        status: 'healthy',
        service: 'temporal-precision-protocol',
        uptime: process.uptime(),
        ...stats,
      });
    } catch (error) {
      res.status(500).json({ status: 'unhealthy', error: (error as Error).message });
    }
  });

  router.get('/stats', async (req, res) => {
    try {
      const stats = await store.getStats();
      const activeVectors = await store.getActiveVectors();
      const cascades = await store.loadCascades();
      
      const byType: Record<VectorType, number> = {
        code: 0,
        narrative: 0,
        economic: 0,
        social: 0,
        geopolitical: 0,
        governance: 0,
      };
      
      for (const vector of activeVectors) {
        byType[vector.type]++;
      }

      res.json({
        ...stats,
        activeByType: byType,
        cascadePatterns: cascades.map(c => ({
          name: c.name,
          source: c.sourceType,
          target: c.targetType,
          avgDelay: c.averageDelayHours,
          occurrences: c.occurrences,
          confidence: Math.round(c.confidence * 100) + '%',
        })),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/vectors', async (req, res) => {
    try {
      const { type, state } = req.query;
      let vectors = await store.loadVectors();

      if (type) {
        vectors = vectors.filter(v => v.type === type);
      }

      if (state) {
        vectors = vectors.filter(v => v.state === state);
      }

      const { limit = 50, offset = 0 } = req.query;
      const limited = vectors.slice(Number(offset), Number(offset) + Number(limit));

      res.json({
        vectors: limited,
        total: vectors.length,
        offset: Number(offset),
        limit: Number(limit),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/vectors/active', async (req, res) => {
    try {
      const activeVectors = await store.getActiveVectors();
      res.json({ vectors: activeVectors, count: activeVectors.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/vectors/:id', async (req, res) => {
    try {
      const vectors = await store.loadVectors();
      const vector = vectors.find(v => v.id === req.params.id);

      if (!vector) {
        return res.status(404).json({ error: 'Vector not found' });
      }

      res.json(vector);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post('/vectors', async (req, res) => {
    try {
      const vectorData: Omit<EvolutionVector, 'id'> = req.body;
      const vector: EvolutionVector = {
        ...vectorData,
        id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      await store.addVector(vector);
      res.status(201).json(vector);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.put('/vectors/:id/state', async (req, res) => {
    try {
      const { state, strength, trigger } = req.body;
      await store.updateVectorState(req.params.id, state, strength, trigger);
      
      const vectors = await store.loadVectors();
      const vector = vectors.find(v => v.id === req.params.id);
      
      res.json(vector);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/catalysts', async (req, res) => {
    try {
      const { hours = 24, cycle } = req.query;
      let catalysts;

      if (cycle) {
        catalysts = await store.loadCatalysts();
        catalysts = catalysts.filter(c => c.cycle === cycle);
      } else {
        catalysts = await store.getRecentCatalysts(Number(hours));
      }

      res.json({
        catalysts,
        count: catalysts.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post('/catalysts', async (req, res) => {
    try {
      const catalystData: Omit<CatalystEvent, 'id'> = req.body;
      const catalyst = await correlator.recordCatalyst(catalystData);
      res.status(201).json(catalyst);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/cascades', async (req, res) => {
    try {
      const cascades = await store.loadCascades();
      res.json({ cascades, count: cascades.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/convergence', async (req, res) => {
    try {
      const convergences = await correlator.analyzeVectorConvergence();
      res.json({ convergences, count: convergences.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/treasury-windows', async (req, res) => {
    try {
      const windows = await correlator.predictTreasuryWindows();
      res.json({ windows, count: windows.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post('/correlate', async (req, res) => {
    try {
      const { cycle } = req.body;
      const correlations = await correlator.correlateCycleData(cycle);
      res.status(201).json({ correlations, count: correlations.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/correlations', async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const correlations = await store.loadCorrelations();
      const limited = correlations.slice(Number(offset), Number(offset) + Number(limit));

      res.json({
        correlations: limited,
        total: correlations.length,
        offset: Number(offset),
        limit: Number(limit),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/patterns/catalyst-timing', async (req, res) => {
    try {
      const { cycle } = req.query;
      const patterns = await correlator.getCatalystTimingPatterns(cycle as string);
      res.json({ patterns, count: patterns.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/vector-states', async (req, res) => {
    try {
      const states = await correlator.getVectorActivationStates();
      res.json({ states: Array.from(states.entries()) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
