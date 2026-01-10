import { Narrative, EconomicEvent, Correlation } from './types';

export class NarrativeCorrelator {
  private narratives: Narrative[] = [];
  private economicEvents: EconomicEvent[] = [];
  private correlations: Correlation[] = [];
  private config = {
    timeWindowHours: 24,
    minCorrelationStrength: 0.3,
    maxCorrelationsPerRun: 100
  };

  constructor(config?: Partial<typeof NarrativeCorrelator.prototype.config>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  updateNarratives(narratives: Narrative[]): void {
    this.narratives = narratives;
  }

  updateEconomicEvents(events: EconomicEvent[]): void {
    this.economicEvents = events;
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

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      narrative,
      economicEvent: event,
      correlation,
      strength,
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

    if (stats.total > 0) {
      const avgStrength = stats.averageStrength;
      insights.push(`Strong narrative-economy alignment detected (${(avgStrength * 100).toFixed(0)}% correlation strength)`);
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

    if (insights.length === 0) {
      insights.push('Normal operation - maintaining surveillance and treasury status quo');
    }

    return insights;
  }

  reset(): void {
    this.narratives = [];
    this.economicEvents = [];
    this.correlations = [];
  }
}
