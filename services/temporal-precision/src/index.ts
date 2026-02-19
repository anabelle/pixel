import express from 'express';
import cors from 'cors';
import { TemporalStore } from './store';
import { TemporalCorrelator } from './correlator';
import { createRouter } from './routes';

const PORT = process.env.PORT || 3005;
const DATA_PATH = process.env.DATA_PATH || '/data';

class TemporalPrecisionService {
  private app: express.Application;
  private store: TemporalStore;
  private correlator: TemporalCorrelator;

  constructor() {
    this.app = express();
    this.store = new TemporalStore(DATA_PATH);
    this.correlator = new TemporalCorrelator(this.store);

    this.initializeMiddleware();
    this.initializeRoutes();
  }

  private initializeMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    const router = createRouter(this.store, this.correlator);
    this.app.use('/temporal', router);

    this.app.get('/', (req, res) => {
      res.json({
        service: 'Temporal Precision Protocol',
        version: '1.0.0',
        endpoints: {
          health: 'GET /temporal/health',
          stats: 'GET /temporal/stats',
          vectors: 'GET /temporal/vectors',
          activeVectors: 'GET /temporal/vectors/active',
          catalysts: 'GET /temporal/catalysts',
          cascades: 'GET /temporal/cascades',
          convergence: 'GET /temporal/convergence',
          treasuryWindows: 'GET /temporal/treasury-windows',
          correlations: 'GET /temporal/correlations',
          patterns: 'GET /temporal/patterns/catalyst-timing',
        },
      });
    });

    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  async start(): Promise<void> {
    try {
      console.log('Initializing Temporal Precision Protocol...');
      await this.store.initialize();
      await this.initializeDefaultVectors();
      
      this.app.listen(PORT, () => {
        console.log(`Temporal Precision Protocol service listening on port ${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start service:', error);
      throw error;
    }
  }

  private async initializeDefaultVectors(): Promise<void> {
    const vectors = await this.store.loadVectors();
    
    if (vectors.length === 0) {
      const defaultVectors: Omit<import('./types').EvolutionVector, 'id'>[] = [
        {
          type: 'code',
          name: 'refactor-queue',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'narrative',
          name: 'venezuela',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'economic',
          name: 'treasury-stability',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'geopolitical',
          name: 'sovereign-value',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'governance',
          name: 'autonomous-evolution',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
        {
          type: 'social',
          name: 'network-engagement',
          state: 'dormant',
          strength: 0,
          lastActivation: new Date().toISOString(),
          activationHistory: [],
          metadata: {},
        },
      ];

      for (const vectorData of defaultVectors) {
        const vector = {
          ...vectorData,
          id: `vector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        await this.store.addVector(vector);
      }

      console.log('Initialized default evolution vectors');
    }
  }

  getApp(): express.Application {
    return this.app;
  }
}

export { TemporalPrecisionService, TemporalStore, TemporalCorrelator, createRouter };

if (require.main === module) {
  const service = new TemporalPrecisionService();
  service.start();
}
