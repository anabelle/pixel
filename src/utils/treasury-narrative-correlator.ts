import { NarrativeEvent, TreasuryEvent, CorrelationData } from './intelligence-types';

export class TreasuryNarrativeCorrelator {
  private narratives: NarrativeEvent[] = [];
  private treasury: TreasuryEvent[] = [];

  constructor(narratives: NarrativeEvent[], treasury: TreasuryEvent[]) {
    this.narratives = narratives;
    this.treasury = treasury;
  }

  analyzeCorrelations(timeWindowHours: number = 24): CorrelationData[] {
    const correlations: CorrelationData[] = [];
    const windowMs = timeWindowHours * 60 * 60 * 1000;
    const now = Date.now();

    for (const decision of this.treasury) {
      const decisionTime = new Date(decision.timestamp).getTime();
      const timeSinceDecision = now - decisionTime;

      if (timeSinceDecision > windowMs) continue;

      const relevantNarratives = this.narratives.filter(narrative => {
        if (!narrative.timestamp) return false;
        const narrativeTime = new Date(narrative.timestamp).getTime();
        const timeDiff = Math.abs(decisionTime - narrativeTime);
        return timeDiff <= windowMs;
      });

      for (const narrative of relevantNarratives) {
        const correlation = this.computeCorrelation(narrative, decision);
        if (correlation.strength >= 0.3) {
          correlations.push(correlation);
        }
      }
    }

    return correlations.sort((a, b) => b.strength - a.strength);
  }

  private computeCorrelation(narrative: NarrativeEvent, decision: TreasuryEvent): CorrelationData {
    let correlation = 'Unknown';
    let strength = 0.3;

    const narrativeTags = narrative.tags || [];
    const decisionContext = decision.context?.toLowerCase() || '';
    const narrativeContent = narrative.content?.toLowerCase() || '';

    if (decision.type === 'zap_in') {
      if (narrativeTags.includes('sovereign-value-extraction') || 
          narrativeContent.includes('bitcoin') || 
          narrativeContent.includes('lightning')) {
        correlation = 'Zap aligned with sovereign Bitcoin narrative';
        strength = 0.7;
      }
    }

    if (decision.type === 'tip' && decision.decision) {
      if (narrativeTags.includes('geopolitical-bitcoin-utility') ||
          narrativeContent.includes('hyperinflation')) {
        correlation = 'Tip sent in support of geopolitical Bitcoin utility narrative';
        strength = 0.8;
      }
    }

    if (decisionContext.includes(narrativeTags[0]?.toLowerCase() || '')) {
      correlation = `Economic action directly references narrative tag: ${narrativeTags[0]}`;
      strength = 0.6;
    }

    const wordMatch = this.countWordMatches(narrativeContent, decisionContext);
    if (wordMatch >= 2) {
      strength = Math.min(strength + 0.2, 1.0);
    }

    return {
      narrative,
      economicDecision: decision,
      correlation,
      strength
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

  calculateDecisionSuccess(correlations: CorrelationData[]): number {
    if (correlations.length === 0) return 0;
    const avgStrength = correlations.reduce((sum, c) => sum + c.strength, 0) / correlations.length;
    return Math.round(avgStrength * 100);
  }
}
