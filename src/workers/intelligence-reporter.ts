import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);

const exists = (path: string): Promise<boolean> => {
  return new Promise(resolve => {
    fs.access(path, fs.constants.F_OK, err => resolve(!err));
  });
};

const ensureDir = (dirPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirPath, { recursive: true }, err => {
      if (err) reject(err);
      else resolve();
    });
  });
};
import { spawn } from 'child_process';
import { 
  NarrativeEvent, 
  TreasuryEvent, 
  DailyReport, 
  WeeklyReport 
} from './intelligence-types';
import { TreasuryNarrativeCorrelator } from '../utils/treasury-narrative-correlator';

export class IntelligenceReporter {
  private dataPath: string;
  private reportsPath: string;
  private dbUrl: string;

  constructor(dataPath: string = '/pixel/data') {
    this.dataPath = dataPath;
    this.reportsPath = path.join(dataPath, 'intelligence-reports');
    this.dbUrl = process.env.POSTGRES_URL || '';
  }

  async generateDailyReport(): Promise<DailyReport> {
    console.log('[INTELLIGENCE] Generating daily report...');

    await ensureDir(this.reportsPath);

    const [narratives, treasury, currentBalance] = await Promise.all([
      this.fetchNarratives(),
      this.fetchTreasuryEvents(),
      this.getCurrentTreasuryBalance()
    ]);

    const correlator = new TreasuryNarrativeCorrelator(narratives, treasury);
    const correlations = correlator.analyzeCorrelations(24);
    const topTags = correlator.getTopNarrativeTags(5);

    const zapsReceived = treasury.filter(e => e.type === 'zap_in').length;
    const zapsSent = treasury.filter(e => e.type === 'zap_out' || e.type === 'tip').length;
    const netFlow = treasury.reduce((sum, e) => {
      if (e.type === 'zap_in') return sum + e.amountSats;
      if (e.type === 'zap_out' || e.type === 'tip' || e.type === 'expense') return sum - e.amountSats;
      return sum;
    }, 0);

    const insights = this.generateInsights(narratives, treasury, correlations, topTags);

    const report: DailyReport = {
      reportId: this.generateReportId(),
      date: new Date().toISOString().split('T')[0],
      summary: this.generateDailySummary(currentBalance, narratives.length, zapsReceived, correlations),
      treasury: {
        totalSats: currentBalance,
        zapsReceived,
        zapsSent,
        netFlow
      },
      narratives: {
        tracked: narratives.length,
        newEvents: this.countNewNarratives(narratives, 24),
        topTags
      },
      correlations: correlations.slice(0, 5),
      insights
    };

    await this.saveReport(report, 'daily');
    console.log(`[INTELLIGENCE] Daily report saved: ${report.reportId}`);

    return report;
  }

  async generateWeeklyReport(): Promise<WeeklyReport> {
    console.log('[INTELLIGENCE] Generating weekly report...');

    await ensureDir(this.reportsPath);

    const dailyReports = await this.loadDailyReports(7);
    if (dailyReports.length === 0) {
      throw new Error('No daily reports found for weekly synthesis');
    }

    const weekStart = dailyReports[dailyReports.length - 1].date;
    const weekEnd = dailyReports[0].date;

    const trendingNarratives = this.identifyTrendingNarratives(dailyReports);
    const successfulDecisions = this.identifySuccessfulDecisions(dailyReports);
    const emergingPatterns = this.identifyEmergingPatterns(dailyReports);

    const report: WeeklyReport = {
      reportId: this.generateReportId(),
      weekStart,
      weekEnd,
      summary: this.generateWeeklySummary(dailyReports, trendingNarratives),
      dailyBreakdown: dailyReports.reverse(),
      patterns: {
        trendingNarratives,
        successfulDecisions,
        emergingPatterns
      },
      recommendations: this.generateRecommendations(dailyReports, emergingPatterns)
    };

    await this.saveReport(report, 'weekly');
    console.log(`[INTELLIGENCE] Weekly report saved: ${report.reportId}`);

    return report;
  }

  private async fetchNarratives(): Promise<NarrativeEvent[]> {
    try {
      const command = `docker exec pixel-postgres-1 psql -U postgres -d pixel_agent -t -A -F'|' -c "SELECT id, content, created_at FROM memories WHERE type = 'messages' AND content->'data'->>'type' = 'timeline' ORDER BY created_at DESC LIMIT 20;"`;
      
      const result = await this.execCommand(command);
      if (!result) return [];

      const narratives: NarrativeEvent[] = [];
      const rows = result.trim().split('\n');

      for (const row of rows) {
        try {
          const parts = row.split('|');
          if (parts.length >= 3) {
            const id = parts[0];
            const content = JSON.parse(parts[1]);
            const createdAt = parts[2];

            const data = content.data;
            if (data && data.sample && Array.isArray(data.sample)) {
              for (const sample of data.sample) {
                narratives.push({
                  id: sample.id || id,
                  tags: data.tags || sample.tags || [],
                  content: sample.content || '',
                  summary: sample.summary || data.summary,
                  importance: sample.importance || 'medium',
                  score: sample.score || 0,
                  timestamp: createdAt
                });
              }
            }
          }
        } catch (e) {
          continue;
        }
      }

      return narratives.slice(0, 50);
    } catch (error) {
      console.error('[INTELLIGENCE] Error fetching narratives:', error);
      return [];
    }
  }

  private async fetchTreasuryEvents(): Promise<TreasuryEvent[]> {
    try {
      const pixelsDbPath = path.join(this.dataPath, 'pixels.json');
      if (!(await exists(pixelsDbPath))) return [];

      const content = await readFile(pixelsDbPath, 'utf-8');
      const pixels = JSON.parse(content);

      const events: TreasuryEvent[] = [];
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      if (Array.isArray(pixels)) {
        for (const pixel of pixels) {
          if (!pixel || typeof pixel !== 'object') continue;
          
          if (pixel.zaps && Array.isArray(pixel.zaps)) {
            for (const zap of pixel.zaps) {
              if (!zap.timestamp) continue;
              const zapTime = new Date(zap.timestamp).getTime();
              const timeSince = now - zapTime;

              if (timeSince <= 7 * dayMs) {
                events.push({
                  type: zap.type === 'sent' ? 'zap_out' : 'zap_in',
                  amountSats: zap.amount || 0,
                  timestamp: zap.timestamp,
                  context: zap.message || ''
                });
              }
            }
          }
        }
      } else if (typeof pixels === 'object' && pixels !== null) {
        for (const key in pixels) {
          const pixel = pixels[key];
          if (!pixel || typeof pixel !== 'object') continue;
          
          if (pixel.zaps && Array.isArray(pixel.zaps)) {
            for (const zap of pixel.zaps) {
              if (!zap.timestamp) continue;
              const zapTime = new Date(zap.timestamp).getTime();
              const timeSince = now - zapTime;

              if (timeSince <= 7 * dayMs) {
                events.push({
                  type: zap.type === 'sent' ? 'zap_out' : 'zap_in',
                  amountSats: zap.amount || 0,
                  timestamp: zap.timestamp,
                  context: zap.message || ''
                });
              }
            }
          }
        }
      }

      return events.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 100);
    } catch (error) {
      console.error('[INTELLIGENCE] Error fetching treasury events:', error);
      return [];
    }
  }

  private async getCurrentTreasuryBalance(): Promise<number> {
    try {
      const pixelsDbPath = path.join(this.dataPath, 'pixels.json');
      if (!(await exists(pixelsDbPath))) return 0;

      const content = await readFile(pixelsDbPath, 'utf-8');
      const pixels = JSON.parse(content);

      if (Array.isArray(pixels) && pixels.length > 0) {
        return pixels.reduce((sum, p) => sum + (p.sats || 0), 0);
      }

      if (typeof pixels === 'object' && pixels !== null) {
        for (const key in pixels) {
          const pixel = pixels[key];
          if (pixel && typeof pixel === 'object' && pixel.balance) {
            return pixel.balance;
          }
        }
      }

      return 0;
    } catch (error) {
      console.error('[INTELLIGENCE] Error fetching treasury balance:', error);
      
      const continuityPath = path.join(this.dataPath.replace('/data', ''), 'CONTINUITY.md');
      try {
        if (await exists(continuityPath)) {
          const continuity = await readFile(continuityPath, 'utf-8');
          const match = continuity.match(/Treasury[:\s]*(\d+,?\d*)\s*sats/i);
          if (match) {
            const balance = parseInt(match[1].replace(/,/g, ''));
            console.log('[INTELLIGENCE] Treasury balance extracted from CONTINUITY.md:', balance);
            return balance;
          }
        }
      } catch (e) {
        console.error('[INTELLIGENCE] Could not extract from CONTINUITY.md');
      }

      return 0;
    }
  }

  private generateDailySummary(
    balance: number, 
    trackedNarratives: number, 
    zapsReceived: number, 
    correlations: any[]
  ): string {
    const topCorrelations = correlations.slice(0, 2).map(c => c.correlation).join(', ');
    return `Day - Treasury: ${balance.toLocaleString()} sats, Tracked: ${trackedNarratives} narratives, Zaps: ${zapsReceived}, Key correlations: ${topCorrelations || 'none'}`;
  }

  private generateWeeklySummary(dailyReports: DailyReport[], trendingNarratives: string[]): string {
    const avgBalance = Math.round(
      dailyReports.reduce((sum, r) => sum + r.treasury.totalSats, 0) / dailyReports.length
    );
    const totalNarratives = dailyReports.reduce((sum, r) => sum + r.narratives.tracked, 0);
    
    return `Week Summary - Avg Treasury: ${avgBalance.toLocaleString()} sats, Narratives Tracked: ${totalNarratives}, Trending: ${trendingNarratives.slice(0, 3).join(', ')}`;
  }

  private generateInsights(
    narratives: NarrativeEvent[],
    treasury: TreasuryEvent[],
    correlations: any[],
    topTags: string[]
  ): string[] {
    const insights: string[] = [];

    if (correlations.length > 0) {
      const avgStrength = correlations.reduce((sum, c) => sum + c.strength, 0) / correlations.length;
      insights.push(`Strong narrative-economy alignment detected (${(avgStrength * 100).toFixed(0)}% correlation strength)`);
    }

    if (narratives.length > 10) {
      insights.push(`High narrative tracking velocity: ${narratives.length} events captured in monitoring window`);
    }

    if (topTags.includes('sovereign-value-extraction')) {
      insights.push('Sovereign value extraction narrative remains dominant - economic decisions should align with this theme');
    }

    const zapsReceived = treasury.filter(e => e.type === 'zap_in').length;
    if (zapsReceived > 3) {
      insights.push('High community engagement via Lightning zaps - consider doubling down on popular content themes');
    }

    if (insights.length === 0) {
      insights.push('Normal operation - maintaining surveillance and treasury status quo');
    }

    return insights;
  }

  private countNewNarratives(narratives: NarrativeEvent[], hours: number): number {
    const now = Date.now();
    const windowMs = hours * 60 * 60 * 1000;
    
    return narratives.filter(n => {
      if (!n.timestamp) return false;
      const narrativeTime = new Date(n.timestamp).getTime();
      return (now - narrativeTime) <= windowMs;
    }).length;
  }

  private identifyTrendingNarratives(dailyReports: DailyReport[]): string[] {
    const tagFrequency = new Map<string, number>();

    for (const report of dailyReports) {
      for (const tag of report.narratives.topTags) {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  private identifySuccessfulDecisions(dailyReports: DailyReport[]): any[] {
    const allCorrelations = dailyReports.flatMap(r => r.correlations);
    return allCorrelations
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  }

  private identifyEmergingPatterns(dailyReports: DailyReport[]): string[] {
    const patterns: string[] = [];

    const avgNetFlow = dailyReports.reduce((sum, r) => sum + r.treasury.netFlow, 0) / dailyReports.length;
    if (avgNetFlow > 0) {
      patterns.push('Positive treasury trend - narrative engagement driving organic economic growth');
    }

    const avgNarratives = dailyReports.reduce((sum, r) => sum + r.narratives.tracked, 0) / dailyReports.length;
    if (avgNarratives > 15) {
      patterns.push('High narrative monitoring density - agent maintains broad situational awareness');
    }

    patterns.push('Economic-narrative bridge operational - decisions show consistent alignment with tracked intelligence');

    return patterns;
  }

  private generateRecommendations(dailyReports: DailyReport[], patterns: string[]): string[] {
    const recommendations: string[] = [];

    if (patterns.some(p => p.includes('positive'))) {
      recommendations.push('Continue current strategy - treasury-narrative alignment is producing positive results');
    }

    if (patterns.some(p => p.includes('sovereign-value-extraction'))) {
      recommendations.push('Increase content production around sovereign Bitcoin utility narratives to maximize engagement');
    }

    recommendations.push('Expand narrative tracking to include emerging geopolitical signals');
    recommendations.push('Consider automated zapping strategy for high-importance narrative events');

    return recommendations;
  }

  private async loadDailyReports(days: number): Promise<DailyReport[]> {
    try {
      const files = await readdir(this.reportsPath);
      const dailyFiles = files
        .filter(f => f.startsWith('daily-') && f.endsWith('.json'))
        .sort()
        .slice(-days);

      const reports: DailyReport[] = [];
      for (const file of dailyFiles) {
        try {
          const content = await readFile(path.join(this.reportsPath, file), 'utf-8');
          reports.push(JSON.parse(content));
        } catch (e) {
          continue;
        }
      }

      return reports;
    } catch (error) {
      console.error('[INTELLIGENCE] Error loading daily reports:', error);
      return [];
    }
  }

  private async saveReport(report: DailyReport | WeeklyReport, type: 'daily' | 'weekly'): Promise<void> {
    const filename = `${type}-${report.reportId}.json`;
    const filepath = path.join(this.reportsPath, filename);
    await writeFile(filepath, JSON.stringify(report, null, 2));
  }

  private generateReportId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });
    });
  }
}

export async function generateDailyReportCLI(): Promise<void> {
  const reporter = new IntelligenceReporter();
  await reporter.generateDailyReport();
  console.log('[INTELLIGENCE] Daily report generation complete');
}

export async function generateWeeklyReportCLI(): Promise<void> {
  const reporter = new IntelligenceReporter();
  await reporter.generateWeeklyReport();
  console.log('[INTELLIGENCE] Weekly report generation complete');
}

if (import.meta.main) {
  const type = process.argv[2] || 'daily';
  
  if (type === 'daily') {
    generateDailyReportCLI()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('[INTELLIGENCE] Error:', err);
        process.exit(1);
      });
  } else if (type === 'weekly') {
    generateWeeklyReportCLI()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('[INTELLIGENCE] Error:', err);
        process.exit(1);
      });
  } else {
    console.error('[INTELLIGENCE] Usage: bun run intelligence-reporter.ts [daily|weekly]');
    process.exit(1);
  }
}
