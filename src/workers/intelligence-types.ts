export interface NarrativeEvent {
  id: string;
  tags: string[];
  content: string;
  summary?: string;
  importance?: 'low' | 'medium' | 'high';
  score?: number;
  timestamp?: string;
}

export interface TreasuryEvent {
  type: 'zap_in' | 'zap_out' | 'expense' | 'payment' | 'tip';
  amountSats: number;
  timestamp: string;
  context?: string;
  decision?: string;
}

export interface CorrelationData {
  narrative: NarrativeEvent;
  economicDecision: TreasuryEvent;
  correlation: string;
  strength: number;
}

export interface DailyReport {
  reportId: string;
  date: string;
  summary: string;
  treasury: {
    totalSats: number;
    zapsReceived: number;
    zapsSent: number;
    netFlow: number;
  };
  narratives: {
    tracked: number;
    newEvents: number;
    topTags: string[];
  };
  correlations: CorrelationData[];
  insights: string[];
}

export interface WeeklyReport {
  reportId: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  dailyBreakdown: DailyReport[];
  patterns: {
    trendingNarratives: string[];
    successfulDecisions: CorrelationData[];
    emergingPatterns: string[];
  };
  recommendations: string[];
}
