import {
  EvolutionVector,
  CatalystEvent,
  CascadePattern,
  VectorConvergence,
  TemporalCorrelation,
  CatalystTimingPattern,
  TreasuryAllocationWindow,
  VectorType,
  ActivationState,
} from './types';
import { TemporalStore } from './store';

export class TemporalCorrelator {
  private store: TemporalStore;
  private cascadeModel: Map<string, VectorType[]> = new Map();
  
  constructor(store: TemporalStore) {
    this.store = store;
    this.initializeCascadeModel();
  }

  private initializeCascadeModel(): void {
    this.cascadeModel.set('venezuela-economic', [
      'economic',
      'geopolitical',
      'governance',
    ]);

    this.cascadeModel.set('bitcoin-core-activation', [
      'economic',
      'narrative',
      'social',
    ]);

    this.cascadeModel.set('queue-saturation', [
      'code',
      'governance',
      'narrative',
    ]);
  }

  async recordCatalyst(catalyst: Omit<CatalystEvent, 'id'>): Promise<CatalystEvent> {
    const catalystEvent: CatalystEvent = {
      ...catalyst,
      id: `catalyst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    await this.store.addCatalyst(catalystEvent);

    const cascadeChain = this.cascadeModel.get(catalyst.description);
    if (cascadeChain) {
      await this.triggerCascade(catalystEvent, cascadeChain);
    }

    return catalystEvent;
  }

  private async triggerCascade(catalyst: CatalystEvent, chain: VectorType[]): Promise<void> {
    const vectors = await this.store.loadVectors();
    const timingDelays: { from: VectorType; to: VectorType; hours: number }[] = [];

    for (let i = 0; i < chain.length; i++) {
      const vectorType = chain[i];
      const vector = vectors.find(v => v.type === vectorType && v.name === catalyst.description);

      if (vector) {
        if (i === 0) {
          await this.store.updateVectorState(vector.id, 'active', 0.9, catalyst.id);
        } else if (i < chain.length) {
          const delayHours = 2 + Math.random() * 6;
          timingDelays.push({
            from: chain[i - 1],
            to: chain[i],
            hours: Math.round(delayHours * 100) / 100,
          });

          setTimeout(async () => {
            await this.store.updateVectorState(vector.id, 'active', 0.8 + Math.random() * 0.2, catalyst.id);
          }, delayHours * 60 * 60 * 1000);
        }
      }
    }

    if (timingDelays.length > 0) {
      await this.recordCascadePattern(catalyst, chain, timingDelays);
    }
  }

  private async recordCascadePattern(
    catalyst: CatalystEvent,
    chain: VectorType[],
    timingDelays: { from: VectorType; to: VectorType; hours: number }[]
  ): Promise<void> {
    const cascades = await this.store.loadCascades();
    const existingCascade = cascades.find(c => c.name === catalyst.description);

    if (existingCascade) {
      existingCascade.occurrences++;
      
      const avgDelay = timingDelays.reduce((sum, d) => sum + d.hours, 0) / timingDelays.length;
      existingCascade.averageDelayHours = 
        (existingCascade.averageDelayHours * (existingCascade.occurrences - 1) + avgDelay) / existingCascade.occurrences;
      
      existingCascade.confidence = Math.min(0.95, existingCascade.confidence + 0.05);
      
      await this.store.saveCascades(cascades);
    } else {
      const avgDelay = timingDelays.reduce((sum, d) => sum + d.hours, 0) / timingDelays.length;
      const cascade: CascadePattern = {
        id: `cascade-${Date.now()}`,
        name: catalyst.description,
        sourceType: chain[0],
        targetType: chain[chain.length - 1],
        averageDelayHours: Math.round(avgDelay * 100) / 100,
        occurrences: 1,
        confidence: 0.6,
      };
      
      await this.store.addCascade(cascade);
    }
  }

  async analyzeVectorConvergence(): Promise<VectorConvergence[]> {
    const activeVectors = await this.store.getActiveVectors();
    const catalysts = await this.store.getRecentCatalysts(48);
    
    if (activeVectors.length < 2) {
      return [];
    }

    const convergence: VectorConvergence[] = [];
    const convergenceScore = activeVectors.reduce((sum, v) => sum + v.strength, 0) / activeVectors.length;

    if (convergenceScore >= 0.7) {
      const vectorIds = activeVectors.map(v => v.id);
      const activeVectorTypes = [...new Set(activeVectors.map(v => v.type))];

      let treasuryWindow: VectorConvergence['treasuryWindow'];
      
      if (
        activeVectorTypes.includes('economic') &&
        activeVectorTypes.includes('narrative') &&
        activeVectorTypes.includes('social')
      ) {
        const now = new Date();
        const windowStart = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        treasuryWindow = {
          start: windowStart.toISOString(),
          end: windowEnd.toISOString(),
          confidence: Math.min(0.95, convergenceScore + 0.1),
        };
      }

      const convergenceEvent: VectorConvergence = {
        id: `convergence-${Date.now()}`,
        timestamp: new Date().toISOString(),
        activeVectors: vectorIds,
        convergenceScore: Math.round(convergenceScore * 1000) / 1000,
        treasuryWindow,
        prediction: this.generatePrediction(activeVectors, catalysts),
      };

      convergence.push(convergenceEvent);
    }

    return convergence;
  }

  private generatePrediction(vectors: EvolutionVector[], catalysts: CatalystEvent[]): string {
    const vectorTypes = new Set(vectors.map(v => v.type));
    
    if (vectorTypes.has('economic') && vectorTypes.has('geopolitical') && vectorTypes.has('governance')) {
      return 'High probability of treasury allocation opportunity in 6-48 hours. Economic, geopolitical, and governance vectors converging with Venezuela cascade pattern.';
    } else if (vectorTypes.has('narrative') && vectorTypes.has('social')) {
      return 'Narrative and social vectors active. Monitor for economic trigger events.';
    } else if (vectorTypes.has('code') && vectorTypes.has('governance')) {
      return 'Code and governance vectors active. Infrastructure evolution phase detected.';
    } else {
      return 'Multiple vectors active but not yet converged to treasury allocation threshold.';
    }
  }

  async predictTreasuryWindows(): Promise<TreasuryAllocationWindow[]> {
    const convergences = await this.analyzeVectorConvergence();
    const windows: TreasuryAllocationWindow[] = [];

    for (const convergence of convergences) {
      if (convergence.treasuryWindow) {
        const window: TreasuryAllocationWindow = {
          id: `treasury-window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          windowStart: convergence.treasuryWindow.start,
          windowEnd: convergence.treasuryWindow.end,
          confidence: convergence.treasuryWindow.confidence,
          convergenceScore: convergence.convergenceScore,
          activeVectors: convergence.activeVectors,
          rationale: convergence.prediction,
        };
        windows.push(window);
      }
    }

    return windows;
  }

  async correlateCycleData(cycle: string): Promise<TemporalCorrelation[]> {
    const vectors = await this.store.loadVectors();
    const catalysts = await this.store.getRecentCatalysts(168);
    const cascades = await this.store.loadCascades();
    const convergences = await this.analyzeVectorConvergence();

    const correlations: TemporalCorrelation[] = [];

    for (const catalyst of catalysts.filter(c => c.cycle === cycle)) {
      const relevantVectors = vectors.filter(v => catalyst.affectedVectors.includes(v.id));
      const cascade = cascades.find(c => c.name === catalyst.description);
      const convergence = convergences.find(c => c.activeVectors.some(id => relevantVectors.map(v => v.id).includes(id)));

      const correlationStrength = this.calculateCorrelationStrength(relevantVectors, catalyst, cascade);

      const correlation: TemporalCorrelation = {
        id: `correlation-${catalyst.id}`,
        timestamp: new Date().toISOString(),
        vectors: relevantVectors,
        catalyst,
        cascade,
        convergence,
        correlationStrength,
        insights: this.generateInsights(relevantVectors, catalyst, cascade, convergence),
      };

      correlations.push(correlation);
    }

    for (const correlation of correlations) {
      await this.store.addCorrelation(correlation);
    }

    return correlations;
  }

  private calculateCorrelationStrength(
    vectors: EvolutionVector[],
    catalyst: CatalystEvent,
    cascade?: CascadePattern
  ): number {
    let strength = 0;

    if (vectors.length > 0) {
      const avgVectorStrength = vectors.reduce((sum, v) => sum + v.strength, 0) / vectors.length;
      strength += avgVectorStrength * 0.4;
    }

    if (cascade) {
      strength += cascade.confidence * 0.4;
    }

    const catalystImpact = catalyst.affectedVectors.length / 4;
    strength += catalystImpact * 0.2;

    return Math.min(1.0, strength);
  }

  private generateInsights(
    vectors: EvolutionVector[],
    catalyst: CatalystEvent,
    cascade?: CascadePattern,
    convergence?: VectorConvergence
  ): string[] {
    const insights: string[] = [];

    if (vectors.length > 0) {
      const activeCount = vectors.filter(v => v.state === 'active' || v.state === 'peak').length;
      insights.push(`${activeCount}/${vectors.length} vectors activated by catalyst`);
    }

    if (cascade) {
      insights.push(
        `Cascade pattern confirmed: ${cascade.sourceType} → ${cascade.targetType} (avg delay: ${cascade.averageDelayHours}h, confidence: ${Math.round(cascade.confidence * 100)}%)`
      );
    }

    if (convergence && convergence.treasuryWindow) {
      insights.push(`Treasury allocation window predicted: ${convergence.treasuryWindow.confidence >= 0.8 ? 'HIGH' : 'MODERATE'} confidence`);
    }

    return insights;
  }

  async getVectorActivationStates(): Promise<Map<string, ActivationState>> {
    const vectors = await this.store.loadVectors();
    const states = new Map<string, ActivationState>();

    for (const vector of vectors) {
      states.set(vector.id, vector.state);
    }

    return states;
  }

  async getCatalystTimingPatterns(cycle?: string): Promise<CatalystTimingPattern[]> {
    const catalysts = await this.store.loadCatalysts();
    const cascades = await this.store.loadCascades();
    const vectors = await this.store.loadVectors();

    const filteredCatalysts = cycle ? catalysts.filter(c => c.cycle === cycle) : catalysts.slice(-20);

    const patterns: CatalystTimingPattern[] = [];

    for (const catalyst of filteredCatalysts) {
      const cascade = cascades.find(c => c.name === catalyst.description);
      const affectedVectorObjs = vectors.filter(v => catalyst.affectedVectors.includes(v.id));
      const vectorsTriggered = [...new Set(affectedVectorObjs.map(v => v.type))];

      const pattern: CatalystTimingPattern = {
        catalystId: catalyst.id,
        catalystName: catalyst.description,
        cycle: catalyst.cycle || 'unknown',
        vectorsTriggered,
        cascadeChain: cascade ? this.cascadeModel.get(catalyst.description) || [] : [],
        timingDelays: [],
      };

      if (cascade) {
        const chain = this.cascadeModel.get(catalyst.description) || [];
        for (let i = 1; i < chain.length; i++) {
          pattern.timingDelays.push({
            from: chain[i - 1],
            to: chain[i],
            hours: cascade.averageDelayHours / (chain.length - 1),
          });
        }
      }

      patterns.push(pattern);
    }

    return patterns;
  }
}
