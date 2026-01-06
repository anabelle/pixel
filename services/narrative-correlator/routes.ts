import { Router, Request, Response } from 'express';
import { NarrativeCorrelator } from './correlator';
import { CorrelationStore } from './store';

export function setupCorrelationRoutes(
  correlator: NarrativeCorrelator,
  store: CorrelationStore
): Router {
  const router = Router();

  router.get('/health', async (req: Request, res: Response) => {
    const correlations = await store.getCorrelations();
    const stats = await store.getCorrelationStats();

    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      correlationCount: correlations.length,
      lastCorrelationRun: correlations.length > 0
        ? correlations[0].createdAt
        : undefined,
      stats
    });
  });

  router.get('/correlations', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const correlations = await store.getCorrelations(limit, offset);
      const stats = await store.getCorrelationStats();

      res.json({
        success: true,
        data: correlations,
        meta: {
          total: stats.total,
          limit,
          offset
        }
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error fetching correlations:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  router.get('/correlations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const correlation = await store.getCorrelationById(id);

      if (!correlation) {
        return res.status(404).json({
          success: false,
          error: 'Correlation not found'
        });
      }

      res.json({
        success: true,
        data: correlation
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error fetching correlation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  router.get('/correlations/tag/:tag', async (req: Request, res: Response) => {
    try {
      const { tag } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const correlations = await store.getCorrelationsByTag(tag, limit);

      res.json({
        success: true,
        data: correlations,
        meta: {
          tag,
          count: correlations.length
        }
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error fetching correlations by tag:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  router.get('/correlations/high-strength', async (req: Request, res: Response) => {
    try {
      const minStrength = req.query.minStrength
        ? parseFloat(req.query.minStrength as string)
        : 0.7;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const correlations = await store.getHighStrengthCorrelations(minStrength, limit);

      res.json({
        success: true,
        data: correlations,
        meta: {
          minStrength,
          count: correlations.length
        }
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error fetching high-strength correlations:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await store.getCorrelationStats();
      const topTags = await store.getTopTags(10);

      res.json({
        success: true,
        data: {
          ...stats,
          topTags
        }
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  router.get('/tags', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const tags = await store.getTopTags(limit);

      res.json({
        success: true,
        data: tags
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error fetching tags:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  router.post('/analyze', async (req: Request, res: Response) => {
    try {
      const { narratives, economicEvents } = req.body;

      if (!Array.isArray(narratives) || !Array.isArray(economicEvents)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body: narratives and economicEvents must be arrays'
        });
      }

      correlator.updateNarratives(narratives);
      correlator.updateEconomicEvents(economicEvents);
      const newCorrelations = correlator.analyzeCorrelations();

      await store.addCorrelations(newCorrelations);
      const stats = correlator.getCorrelationStats();
      const insights = correlator.generateInsights();

      res.json({
        success: true,
        data: {
          newCorrelations: newCorrelations.length,
          correlations: newCorrelations,
          stats,
          insights
        }
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error analyzing:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  router.post('/cron/run', async (req: Request, res: Response) => {
    try {
      const insights = correlator.generateInsights();
      const stats = await store.getCorrelationStats();

      console.log('[CORRELATIONS] Cron run completed', {
        correlations: stats.total,
        avgStrength: stats.averageStrength
      });

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          stats,
          insights
        }
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error in cron run:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  router.delete('/cleanup', async (req: Request, res: Response) => {
    try {
      const daysToKeep = req.query.days
        ? parseInt(req.query.days as string)
        : 7;

      const deletedCount = await store.cleanupOldCorrelations(daysToKeep);

      res.json({
        success: true,
        data: {
          deletedCount,
          daysToKeep
        }
      });
    } catch (error: any) {
      console.error('[CORRELATIONS] Error during cleanup:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  return router;
}
