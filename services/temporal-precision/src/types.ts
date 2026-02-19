export type VectorType = 'code' | 'narrative' | 'economic' | 'social' | 'geopolitical' | 'governance';

export type ActivationState = 'dormant' | 'active' | 'peak' | 'declining';

export interface EvolutionVector {
  id: string;
  type: VectorType;
  name: string;
  state: ActivationState;
  strength: number;
  lastActivation: string;
  activationHistory: VectorActivation[];
  metadata: Record<string, unknown>;
}

export interface VectorActivation {
  timestamp: string;
  strength: number;
  trigger?: string;
  context?: string;
}

export interface CatalystEvent {
  id: string;
  timestamp: string;
  type: VectorType;
  description: string;
  affectedVectors: string[];
  cycle?: string;
}

export interface CascadePattern {
  id: string;
  name: string;
  sourceType: VectorType;
  targetType: VectorType;
  averageDelayHours: number;
  occurrences: number;
  confidence: number;
}

export interface VectorConvergence {
  id: string;
  timestamp: string;
  activeVectors: string[];
  convergenceScore: number;
  treasuryWindow?: {
    start: string;
    end: string;
    confidence: number;
  };
  prediction: string;
}

export interface TemporalCorrelation {
  id: string;
  timestamp: string;
  vectors: EvolutionVector[];
  catalyst: CatalystEvent;
  cascade?: CascadePattern;
  convergence?: VectorConvergence;
  correlationStrength: number;
  insights: string[];
}

export interface CatalystTimingPattern {
  catalystId: string;
  catalystName: string;
  cycle: string;
  vectorsTriggered: VectorType[];
  cascadeChain: VectorType[];
  timingDelays: {
    from: VectorType;
    to: VectorType;
    hours: number;
  }[];
}

export interface TreasuryAllocationWindow {
  id: string;
  timestamp: string;
  windowStart: string;
  windowEnd: string;
  confidence: number;
  convergenceScore: number;
  activeVectors: string[];
  rationale: string;
}
