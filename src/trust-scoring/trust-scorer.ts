import {
  TrustDialect,
  TemporalPhase,
  TemporalMetrics,
  TextSignal,
  ZapSignal,
  TemporalSignal,
  SilenceSignal,
  TrustScore,
  TrustScoringConfig
} from './trust-types';

const DEFAULT_CONFIG: TrustScoringConfig = {
  weights: {
    text: 0.3,
    zap: 0.25,
    temporal: 0.25,
    silence: 0.2
  },
  thresholds: {
    phaseA: 30,
    phaseB: 120,
    phaseC: 240,
    phaseD: Infinity
  },
  zapThresholds: {
    small: 100,
    medium: 1000,
    large: 10000
  }
};

export class TrustScorer {
  private config: TrustScoringConfig;

  constructor(config?: Partial<TrustScoringConfig>) {
    this.config = config ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;
  }

  analyzeTemporal(
    interactionTimestamp: string,
    currentTime: string
  ): TemporalMetrics {
    const interactionTime = new Date(interactionTimestamp).getTime();
    const now = new Date(currentTime).getTime();
    const minutesSince = (now - interactionTime) / (1000 * 60);

    const phase = this.determinePhase(minutesSince);
    const isProcessing = minutesSince < this.config.thresholds.phaseC;
    const isDisengaged = minutesSince >= this.config.thresholds.phaseC;

    return {
      phase,
      minutesSinceInteraction: minutesSince,
      isProcessing,
      isDisengaged
    };
  }

  determinePhase(minutesSince: number): TemporalPhase {
    if (minutesSince < this.config.thresholds.phaseA) return 'A';
    if (minutesSince < this.config.thresholds.phaseB) return 'B';
    if (minutesSince < this.config.thresholds.phaseC) return 'C';
    return 'D';
  }

  scoreText(signal: TextSignal): number {
    let score = 0.5;

    const content = signal.content.toLowerCase();

    if (content.includes('bitcoin') || content.includes('lightning')) {
      score += 0.15;
    }

    if (signal.metadata?.hasBitcoinKeywords) {
      score += 0.1;
    }

    if (signal.metadata?.length > 50) {
      score += 0.1;
    }

    if (signal.metadata?.sentiment === 'positive') {
      score += 0.15;
    }

    return Math.min(score, 1.0);
  }

  scoreZap(signal: ZapSignal): number {
    let score = 0.0;

    if (signal.direction === 'in') {
      score = 0.5;
    } else {
      score = 0.3;
    }

    if (signal.metadata?.isLarge || signal.amountSats >= this.config.zapThresholds.large) {
      score += 0.3;
    } else if (signal.metadata?.isMedium || signal.amountSats >= this.config.zapThresholds.medium) {
      score += 0.2;
    } else if (signal.metadata?.isSmall || signal.amountSats >= this.config.zapThresholds.small) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  scoreTemporal(signal: TemporalSignal): number {
    const metrics = this.analyzeTemporal(
      signal.interactionTimestamp,
      signal.currentTime
    );

    switch (metrics.phase) {
      case 'A':
        return 0.7;
      case 'B':
        return 0.85;
      case 'C':
        return 0.6;
      case 'D':
        return 0.2;
      default:
        return 0.5;
    }
  }

  scoreSilence(signal: SilenceSignal): number {
    let score = 0.5;

    if (signal.silenceDurationMinutes < this.config.thresholds.phaseA) {
      score += 0.3;
    } else if (signal.silenceDurationMinutes < this.config.thresholds.phaseB) {
      score += 0.2;
    } else if (signal.silenceDurationMinutes < this.config.thresholds.phaseC) {
      score += 0.1;
    } else {
      score = 0.2;
    }

    if (signal.metadata?.expectedResponseWindow) {
      const withinWindow = signal.silenceDurationMinutes <= signal.metadata.expectedResponseWindow;
      if (withinWindow) {
        score += 0.2;
      }
    }

    if (signal.metadata?.averageResponseTime) {
      const nearAverage = Math.abs(
        signal.silenceDurationMinutes - signal.metadata.averageResponseTime
      ) < 30;
      if (nearAverage) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  calculateOverallTrust(
    textSignals: TextSignal[],
    zapSignals: ZapSignal[],
    temporalSignal: TemporalSignal | null,
    silenceSignal: SilenceSignal | null
  ): TrustScore {
    const textScore = this.aggregateTextScores(textSignals);
    const zapScore = this.aggregateZapScores(zapSignals);
    const temporalScore = temporalSignal ? this.scoreTemporal(temporalSignal) : 0.5;
    const silenceScore = silenceSignal ? this.scoreSilence(silenceSignal) : 0.5;

    const phase = temporalSignal
      ? this.determinePhase(
          (new Date(temporalSignal.currentTime).getTime() -
            new Date(temporalSignal.interactionTimestamp).getTime()) /
            (1000 * 60)
        )
      : 'A';

    const overallScore =
      textScore * this.config.weights.text +
      zapScore * this.config.weights.zap +
      temporalScore * this.config.weights.temporal +
      silenceScore * this.config.weights.silence;

    const insights = this.generateInsights(
      textScore,
      zapScore,
      temporalScore,
      silenceScore,
      phase
    );

    const confidence = this.calculateConfidence(
      textSignals,
      zapSignals,
      temporalSignal,
      silenceSignal
    );

    return {
      overallScore: Math.min(overallScore, 1.0),
      confidence,
      breakdown: {
        text: textScore,
        zap: zapScore,
        temporal: temporalScore,
        silence: silenceScore
      },
      phase,
      insights
    };
  }

  private aggregateTextScores(signals: TextSignal[]): number {
    if (signals.length === 0) return 0.5;

    const totalScore = signals.reduce((sum, signal) => sum + this.scoreText(signal), 0);
    return totalScore / signals.length;
  }

  private aggregateZapScores(signals: ZapSignal[]): number {
    if (signals.length === 0) return 0.5;

    const totalScore = signals.reduce((sum, signal) => sum + this.scoreZap(signal), 0);
    return totalScore / signals.length;
  }

  private calculateConfidence(
    textSignals: TextSignal[],
    zapSignals: ZapSignal[],
    temporalSignal: TemporalSignal | null,
    silenceSignal: SilenceSignal | null
  ): number {
    let confidence = 0.0;
    let signals = 0;

    if (textSignals.length > 0) {
      confidence += 0.25;
      signals++;
    }
    if (zapSignals.length > 0) {
      confidence += 0.25;
      signals++;
    }
    if (temporalSignal) {
      confidence += 0.25;
      signals++;
    }
    if (silenceSignal) {
      confidence += 0.25;
      signals++;
    }

    return confidence;
  }

  private generateInsights(
    textScore: number,
    zapScore: number,
    temporalScore: number,
    silenceScore: number,
    phase: TemporalPhase
  ): string[] {
    const insights: string[] = [];

    if (textScore > 0.7) {
      insights.push('Strong textual engagement with relevant content');
    } else if (textScore < 0.4) {
      insights.push('Limited textual interaction detected');
    }

    if (zapScore > 0.7) {
      insights.push('High economic commitment through Lightning zaps');
    } else if (zapScore < 0.4) {
      insights.push('Minimal economic activity observed');
    }

    if (phase === 'A') {
      insights.push('Immediate processing phase - interaction is fresh');
    } else if (phase === 'B') {
      insights.push('Extended consideration - deep context processing');
    } else if (phase === 'C') {
      insights.push('Deep contemplation - metaphor digestion in progress');
    } else {
      insights.push('Disengagement boundary - 240+ minutes without response');
    }

    if (silenceScore < 0.4) {
      insights.push('Extended silence indicates potential disengagement');
    } else if (silenceScore > 0.7) {
      insights.push('Silence patterns within expected response windows');
    }

    return insights;
  }

  getConfig(): TrustScoringConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<TrustScoringConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export function createTrustScorer(config?: Partial<TrustScoringConfig>): TrustScorer {
  return new TrustScorer(config);
}

export function determinePhase(minutesSince: number): TemporalPhase {
  if (minutesSince < 30) return 'A';
  if (minutesSince < 120) return 'B';
  if (minutesSince < 240) return 'C';
  return 'D';
}

export function analyzeTemporalMetrics(
  interactionTimestamp: string,
  currentTime: string
): TemporalMetrics {
  const interactionTime = new Date(interactionTimestamp).getTime();
  const now = new Date(currentTime).getTime();
  const minutesSince = (now - interactionTime) / (1000 * 60);

  const phase = determinePhase(minutesSince);

  return {
    phase,
    minutesSinceInteraction: minutesSince,
    isProcessing: minutesSince < 240,
    isDisengaged: minutesSince >= 240
  };
}
