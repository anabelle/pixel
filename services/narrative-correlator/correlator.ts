import { Narrative, EconomicEvent, Correlation } from './types';
import {
  TrustScore,
  TrustScorer,
  createTrustScorer,
  TextSignal,
  ZapSignal,
  TemporalSignal,
  SilenceSignal
} from '../../src/trust-scoring';

export class NarrativeCorrelator {
  private narratives: Narrative[] = [];
  private economicEvents: EconomicEvent[] = [];
  private correlations: Correlation[] = [];
  private trustScores: Map<string, TrustScore> = new Map();
  private trustScorer: TrustScorer;
  private config = {
    timeWindowHours: 24,
    minCorrelationStrength: 0.3,
    maxCorrelationsPerRun: 100,
    enableTrustWeighting: true
  };

  constructor(config?: Partial<typeof NarrativeCorrelator.prototype.config>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.trustScorer = createTrustScorer();
  }

  updateNarratives(narratives: Narrative[]): void {
    this.narratives = narratives;
  }

  updateEconomicEvents(events: EconomicEvent[]): void {
    this.economicEvents = events;
    this.calculateTrustScores();
  }

  private calculateTrustScores(): void {
    const now = new Date().toISOString();
    const zapEvents = this.economicEvents.filter(e => e.type === 'zap_in');

    const zapSignals: ZapSignal[] = zapEvents.map(e => ({
      amountSats: e.amountSats,
      timestamp: e.timestamp,
      senderId: e.decision?.split('at')[0]?.trim() || 'unknown',
      direction: 'in' as const,
      metadata: {
        isSmall: e.amountSats < 100,
        isMedium: e.amountSats >= 100 && e.amountSats < 1000,
        isLarge: e.amountSats >= 1000
      }
    }));

    const narrativesContent = this.narratives.map(n => n.content).join(' ');
    const textSignals: TextSignal[] = [];

    if (narrativesContent) {
      textSignals.push({
        content: narrativesContent,
        timestamp: now,
        senderId: 'narrative-context',
        metadata: {
          length: narrativesContent.length,
          hasBitcoinKeywords: /bitcoin|lightning|sats|sovereign/i.test(narrativesContent),
          sentiment: 'positive'
        }
      });
    }

    for (const event of this.economicEvents) {
      const eventTime = new Date(event.timestamp).getTime();
      const nowTime = new Date(now).getTime();
      const minutesSince = (nowTime - eventTime) / (1000 * 60);

      const temporalSignal: TemporalSignal = {
        interactionTimestamp: event.timestamp,
        currentTime: now
      };

      const silenceSignal: SilenceSignal = {
        silenceDurationMinutes: minutesSince,
        lastInteractionTimestamp: event.timestamp,
        currentTime: now,
        metadata: {
          expectedResponseWindow: 240
        }
      };

      const trustScore = this.trustScorer.calculateOverallTrust(
        textSignals,
        zapSignals,
        temporalSignal,
        silenceSignal
      );

      this.trustScores.set(event.decision || event.timestamp, trustScore);
    }
  }

  getTrustScore(eventKey: string): TrustScore | undefined {
    return this.trustScores.get(eventKey);
  }

  getAverageTrustScore(): number {
    if (this.trustScores.size === 0) return 0;
    const scores = Array.from(this.trustScores.values()).map(s => s.overallScore);
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  analyzeCorrelations(): Correlation[] {
    const newCorrelations: Correlation[] = [];
    const windowMs = this.config.timeWindowHours * 60 * 60 * 1000;
    const now = Date.now();

    for (const event of this.economicEvents) {
      const eventTime = new Date(event.timestamp).getTime();
      const timeSinceEvent = now - eventTime;

      if (timeSinceEvent > windowMs) continue;

      const relevantNarratives = this.narratives.filter(narrative => {
        if (!narrative.timestamp) return false;
        const narrativeTime = new Date(narrative.timestamp).getTime();
        const timeDiff = Math.abs(eventTime - narrativeTime);
        return timeDiff <= windowMs;
      });

      for (const narrative of relevantNarratives) {
        const correlation = this.computeCorrelation(narrative, event);
        if (correlation.strength >= this.config.minCorrelationStrength) {
          newCorrelations.push(correlation);
        }
      }
    }

    this.correlations = [
      ...this.correlations,
      ...newCorrelations
    ].sort((a, b) => b.strength - a.strength)
      .slice(0, this.config.maxCorrelationsPerRun);

    return newCorrelations;
  }

  private computeCorrelation(narrative: Narrative, event: EconomicEvent): Correlation {
    let correlation = 'Unknown';
    let strength = 0.3;

    const narrativeTags = narrative.tags || [];
    const eventContext = event.context?.toLowerCase() || '';
    const narrativeContent = narrative.content?.toLowerCase() || '';

    if (event.type === 'zap_in') {
      if (narrativeTags.includes('sovereign-value-extraction') ||
          narrativeContent.includes('bitcoin') ||
          narrativeContent.includes('lightning')) {
        correlation = 'Zap aligned with sovereign Bitcoin narrative';
        strength = 0.7;
      }
    }

    if (event.type === 'tip' && event.decision) {
      if (narrativeTags.includes('geopolitical-bitcoin-utility') ||
          narrativeContent.includes('hyperinflation')) {
        correlation = 'Tip sent in support of geopolitical Bitcoin utility narrative';
        strength = 0.8;
      }
    }

    if (eventContext.includes(narrativeTags[0]?.toLowerCase() || '')) {
      correlation = `Economic action directly references narrative tag: ${narrativeTags[0]}`;
      strength = 0.6;
    }

    const wordMatch = this.countWordMatches(narrativeContent, eventContext);
    if (wordMatch >= 2) {
      strength = Math.min(strength + 0.2, 1.0);
    }

    let trustScore: TrustScore | undefined;
    if (this.config.enableTrustWeighting) {
      trustScore = this.getTrustScore(event.decision || event.timestamp);
      if (trustScore) {
        const trustWeight = 0.3;
        const trustBoost = (trustScore.overallScore - 0.5) * trustWeight;
        strength = Math.min(Math.max(strength + trustBoost, 0), 1.0);
        correlation += ` (trust-weighted: ${(trustScore.overallScore * 100).toFixed(0)}%)`;
      }
    }

    const trustScoreValue = trustScore?.overallScore;
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      narrative,
      economicEvent: event,
      correlation,
      strength,
      trustWeighted: this.config.enableTrustWeighting && !!trustScore,
      trustScore: trustScoreValue,
      createdAt: new Date().toISOString()
    };
  }

  private countWordMatches(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 4));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 4));
    let matches = 0;
    for (const word of words1) {
      if (words2.has(word)) matches++;
    }
    return matches;
  }

  getTopNarrativeTags(limit: number = 5): string[] {
    const tagCounts = new Map<string, number>();

    for (const narrative of this.narratives) {
      for (const tag of narrative.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  getCorrelations(): Correlation[] {
    return this.correlations;
  }

  getTopCorrelations(limit: number = 10): Correlation[] {
    return this.correlations.slice(0, limit);
  }

  getCorrelationStats() {
    if (this.correlations.length === 0) {
      return {
        total: 0,
        averageStrength: 0,
        highStrength: 0,
        mediumStrength: 0,
        lowStrength: 0
      };
    }

    const totalStrength = this.correlations.reduce((sum, c) => sum + c.strength, 0);
    const averageStrength = totalStrength / this.correlations.length;

    return {
      total: this.correlations.length,
      averageStrength,
      highStrength: this.correlations.filter(c => c.strength >= 0.7).length,
      mediumStrength: this.correlations.filter(c => c.strength >= 0.4 && c.strength < 0.7).length,
      lowStrength: this.correlations.filter(c => c.strength < 0.4).length
    };
  }

  generateInsights(): string[] {
    const insights: string[] = [];
    const stats = this.getCorrelationStats();
    const avgTrustScore = this.getAverageTrustScore();

    if (stats.total > 0) {
      const avgStrength = stats.averageStrength;
      insights.push(`Strong narrative-economy alignment detected (${(avgStrength * 100).toFixed(0)}% correlation strength)`);
    }

    if (this.config.enableTrustWeighting) {
      if (avgTrustScore > 0.7) {
        insights.push(`High trust patterns detected (${(avgTrustScore * 100).toFixed(0)}% average trust) - correlations are trust-weighted for accuracy`);
      } else if (avgTrustScore < 0.4) {
        insights.push(`Low trust patterns detected (${(avgTrustScore * 100).toFixed(0)}% average trust) - consider monitoring for disengagement`);
      } else {
        insights.push(`Moderate trust patterns (${(avgTrustScore * 100).toFixed(0)}% average trust) - trust-weighted correlations active`);
      }
    }

    if (this.narratives.length > 10) {
      insights.push(`High narrative tracking velocity: ${this.narratives.length} events captured in monitoring window`);
    }

    const topTags = this.getTopNarrativeTags(3);
    if (topTags.includes('sovereign-value-extraction')) {
      insights.push('Sovereign value extraction narrative remains dominant - economic decisions should align with this theme');
    }

    const zapsReceived = this.economicEvents.filter(e => e.type === 'zap_in').length;
    if (zapsReceived > 3) {
      insights.push('High community engagement via Lightning zaps - consider doubling down on popular content themes');
    }

    const trustInsights = this.aggregateTrustInsights();
    if (trustInsights.length > 0) {
      insights.push(...trustInsights);
    }

    if (insights.length === 0) {
      insights.push('Normal operation - maintaining surveillance and treasury status quo');
    }

    return insights;
  }

  private aggregateTrustInsights(): string[] {
    const insights: string[] = [];
    const allTrustScores = Array.from(this.trustScores.values());

    if (allTrustScores.length === 0) return insights;

    const phaseCounts = new Map<string, number>();
    for (const score of allTrustScores) {
      const count = phaseCounts.get(score.phase) || 0;
      phaseCounts.set(score.phase, count + 1);
    }

    const phaseACount = phaseCounts.get('A') || 0;
    const phaseBCount = phaseCounts.get('B') || 0;
    const phaseCCount = phaseCounts.get('C') || 0;
    const phaseDCount = phaseCounts.get('D') || 0;

    if (phaseDCount > allTrustScores.length * 0.5) {
      insights.push('Warning: Majority of interactions in Phase D (disengagement) - trust decay detected');
    }

    if (phaseACount + phaseBCount > allTrustScores.length * 0.7) {
      insights.push('Optimal temporal engagement - majority of interactions in active processing phases (A/B)');
    }

    return insights;
  }

  reset(): void {
    this.narratives = [];
    this.economicEvents = [];
    this.correlations = [];
    this.trustScores.clear();
  }
}
