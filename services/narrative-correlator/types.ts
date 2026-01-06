export interface Narrative {
  id: string;
  tags: string[];
  content: string;
  summary?: string;
  importance?: 'low' | 'medium' | 'high';
  score?: number;
  timestamp?: string;
}

export interface EconomicEvent {
  type: 'zap_in' | 'zap_out' | 'expense' | 'payment' | 'tip';
  amountSats: number;
  timestamp: string;
  context?: string;
  decision?: string;
}

export interface Correlation {
  id: string;
  narrative: Narrative;
  economicEvent: EconomicEvent;
  correlation: string;
  strength: number;
  createdAt: string;
}

export interface CorrelationAnalysis {
  totalCorrelations: number;
  averageStrength: number;
  topCorrelations: Correlation[];
  insights: string[];
}

export interface NarrativeCorrelationConfig {
  timeWindowHours: number;
  minCorrelationStrength: number;
  maxCorrelationsPerRun: number;
  autoBroadcastEnabled: boolean;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  timestamp: string;
  correlationCount: number;
  lastCorrelationRun?: string;
}
