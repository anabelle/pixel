import express from 'express';
import { NarrativeCorrelator } from './correlator';
import { CorrelationStore } from './store';
import { setupCorrelationRoutes } from './routes';

export class NarrativeCorrelatorService {
  private app: express.Application;
  private correlator: NarrativeCorrelator;
  private store: CorrelationStore;
  private port: number;
  private startTime: number;

  constructor(port: number = 3004) {
    this.port = port;
    this.app = express();
    this.startTime = Date.now();
    this.correlator = new NarrativeCorrelator({
      timeWindowHours: 24,
      minCorrelationStrength: 0.3,
      maxCorrelationsPerRun: 100
    });
    this.store = new CorrelationStore('/data');
  }

  async initialize(): Promise<void> {
    console.log('[NARRATIVE-CORRELATOR] Initializing service...');
    await this.store.initialize();
    this.setupMiddleware();
    this.setupRoutes();
    console.log('[NARRATIVE-CORRELATOR] Service initialized');
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      console.log(`[NARRATIVE-CORRELATOR] ${req.method} ${req.path}`);
      next();
    });

    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[NARRATIVE-CORRELATOR] Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
      });
    });
  }

  private setupRoutes(): void {
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Narrative Correlator Service',
        version: '1.0.0',
        description: 'Sovereign intelligence correlation engine',
        endpoints: {
          health: '/correlations/health',
          correlations: '/correlations',
          stats: '/correlations/stats',
          analyze: '/correlations/analyze',
          tags: '/correlations/tags'
        }
      });
    });

    this.app.use('/correlations', setupCorrelationRoutes(this.correlator, this.store));
  }

  async start(): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      this.app.listen(this.port, '0.0.0.0', (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log(`[NARRATIVE-CORRELATOR] Service listening on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  getCorrelator(): NarrativeCorrelator {
    return this.correlator;
  }

  getStore(): CorrelationStore {
    return this.store;
  }
}

if (process.argv[1] && process.argv[1].endsWith('dist/index.js')) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3004;
  const service = new NarrativeCorrelatorService(port);

  service.start()
    .then(() => {
      console.log('[NARRATIVE-CORRELATOR] Service started successfully');
    })
    .catch((error) => {
      console.error('[NARRATIVE-CORRELATOR] Failed to start:', error);
      process.exit(1);
    });
}

export { NarrativeCorrelator, CorrelationStore };
