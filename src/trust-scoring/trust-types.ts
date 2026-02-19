export type TrustDialect = 'text' | 'zap' | 'temporal' | 'silence';

export type TemporalPhase = 'A' | 'B' | 'C' | 'D';

export interface TemporalMetrics {
  phase: TemporalPhase;
  minutesSinceInteraction: number;
  isProcessing: boolean;
  isDisengaged: boolean;
}

export interface TextSignal {
  content: string;
  timestamp: string;
  senderId: string;
  metadata?: {
    length: number;
    hasBitcoinKeywords: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
}

export interface ZapSignal {
  amountSats: number;
  timestamp: string;
  senderId: string;
  direction: 'in' | 'out';
  metadata?: {
    isSmall: boolean;
    isMedium: boolean;
    isLarge: boolean;
  };
}

export interface TemporalSignal {
  interactionTimestamp: string;
  currentTime: string;
  metadata?: {
    lastActivityBefore?: string;
    nextActivityAfter?: string;
  };
}

export interface SilenceSignal {
  silenceDurationMinutes: number;
  lastInteractionTimestamp: string;
  currentTime: string;
  metadata?: {
    expectedResponseWindow?: number;
    averageResponseTime?: number;
  };
}

export interface TrustScore {
  overallScore: number;
  confidence: number;
  breakdown: {
    text: number;
    zap: number;
    temporal: number;
    silence: number;
  };
  phase: TemporalPhase;
  insights: string[];
}

export interface TrustScoringConfig {
  weights: {
    text: number;
    zap: number;
    temporal: number;
    silence: number;
  };
  thresholds: {
    phaseA: number;
    phaseB: number;
    phaseC: number;
    phaseD: number;
  };
  zapThresholds: {
    small: number;
    medium: number;
    large: number;
  };
}
