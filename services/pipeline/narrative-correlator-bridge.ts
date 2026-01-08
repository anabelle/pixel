#!/usr/bin/env bun
import pg from 'pg';

const { Client } = pg;

interface Narrative {
  id: string;
  tags: string[];
  content: string;
  summary?: string;
  importance?: 'low' | 'medium' | 'high';
  score?: number;
  timestamp?: string;
}

interface EconomicEvent {
  type: 'zap_in' | 'zap_out' | 'expense' | 'payment' | 'tip';
  amountSats: number;
  timestamp: string;
  context?: string;
  decision?: string;
}

interface CorrelationResult {
  success: boolean;
  data?: {
    newCorrelations: number;
    correlations: any[];
    stats: any;
    insights: string[];
  };
  error?: string;
}

interface PipelineState {
  lastRun: string;
  totalNarrativesExtracted: number;
  totalEconomicEventsExtracted: number;
  totalCorrelationsGenerated: number;
  runs: number;
}

const CONFIG = {
  POSTGRES_URL: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/pixel_agent',
  CORRELATOR_URL: 'http://localhost:3004/correlations/analyze',
  API_URL: 'http://localhost:3000/api',
  STATE_FILE: '/pixel/data/narrative-correlations.json',
  TIME_WINDOW_HOURS: 24,
  MAX_NARRATIVES: 100,
  MAX_ECONOMIC_EVENTS: 50,
};

function log(message: string, level: 'info' | 'error' | 'warn' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function loadState(): Promise<PipelineState> {
  try {
    const file = Bun.file(CONFIG.STATE_FILE);
    if (await file.exists()) {
      const content = await file.text();
      return JSON.parse(content);
    }
  } catch (error) {
    log('No existing state file found, starting fresh', 'info');
  }
  return {
    lastRun: new Date().toISOString(),
    totalNarrativesExtracted: 0,
    totalEconomicEventsExtracted: 0,
    totalCorrelationsGenerated: 0,
    runs: 0,
  };
}

async function saveState(state: PipelineState): Promise<void> {
  state.lastRun = new Date().toISOString();
  await Bun.write(CONFIG.STATE_FILE, JSON.stringify(state, null, 2));
}

async function extractNarrativesFromDB(client: pg.Client): Promise<Narrative[]> {
  const narratives: Narrative[] = [];

  try {
    const query = `
      SELECT id, content, created_at
      FROM memories
      WHERE content->>'type' IN ('emerging_story', 'daily_report', 'narrative_weekly', 'hourly_digest')
      AND created_at > NOW() - INTERVAL '${CONFIG.TIME_WINDOW_HOURS} hours'
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await client.query(query, [CONFIG.MAX_NARRATIVES]);
    log(`Found ${result.rows.length} narrative memories in database`, 'info');

    for (const row of result.rows) {
      const content = row.content;
      const data = content?.data;

      if (!data) continue;

      let narrative: Narrative;

      if (content.type === 'emerging_story') {
        narrative = {
          id: row.id,
          tags: data.topics || [data.topic],
          content: `Emerging story: ${data.topic} - ${data.mentions} mentions, ${data.uniqueUsers} unique users`,
          summary: data.topic,
          importance: 'medium',
          score: data.mentions,
          timestamp: data.timestamp || row.created_at,
        };
      } else if (content.type === 'daily_report') {
        narrative = {
          id: row.id,
          tags: data.summary?.topTopics?.map((t: any) => t.topic) || [],
          content: `Daily report: ${data.date} - ${data.summary.activeUsers} active users, ${data.summary.totalEvents} events`,
          summary: `Daily report for ${data.date}`,
          importance: 'high',
          timestamp: row.created_at,
        };
      } else if (content.type === 'narrative_weekly') {
        narrative = {
          id: row.id,
          tags: data.topTopics?.map((t: any) => t.topic) || [],
          content: `Weekly narrative: ${data.startDate} to ${data.endDate} - ${data.totalEvents} events, ${data.uniqueUsers} users`,
          summary: `Weekly narrative report ${data.startDate} to ${data.endDate}`,
          importance: 'high',
          timestamp: row.created_at,
        };
      } else if (content.type === 'hourly_digest') {
        narrative = {
          id: row.id,
          tags: data.topics || [],
          content: `Hourly digest: ${data.summary || 'No summary available'}`,
          summary: 'Hourly narrative digest',
          importance: 'low',
          timestamp: row.created_at,
        };
      } else {
        continue;
      }

      narratives.push(narrative);
    }

    log(`Extracted ${narratives.length} narratives from database`, 'info');
  } catch (error: any) {
    log(`Error extracting narratives: ${error.message}`, 'error');
    throw error;
  }

  return narratives;
}

async function extractEconomicEventsFromAPI(): Promise<EconomicEvent[]> {
  const events: EconomicEvent[] = [];

  try {
    const response = await fetch(`${CONFIG.API_URL}/activity?limit=${CONFIG.MAX_ECONOMIC_EVENTS}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        if (event.sats && event.type) {
          events.push({
            type: event.type === 'single_purchase' || event.type === 'bulk_purchase' ? 'payment' : 'expense',
            amountSats: event.sats || event.totalSats || 0,
            timestamp: new Date(event.created_at).toISOString(),
            context: event.type,
            decision: event.summary || `Pixel at (${event.x}, ${event.y})`,
          });
        }
      }
    }

    log(`Extracted ${events.length} economic events from API`, 'info');
  } catch (error: any) {
    log(`Error extracting economic events: ${error.message}`, 'error');
    throw error;
  }

  return events;
}

async function postToCorrelator(narratives: Narrative[], economicEvents: EconomicEvent[]): Promise<CorrelationResult> {
  try {
    const response = await fetch(CONFIG.CORRELATOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        narratives,
        economicEvents,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Correlator returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(`Correlator analysis complete: ${result.data?.newCorrelations || 0} new correlations`, 'info');
    return result;
  } catch (error: any) {
    log(`Error posting to correlator: ${error.message}`, 'error');
    return {
      success: false,
      error: error.message,
    };
  }
}

async function main(): Promise<void> {
  log('Starting narrative correlator bridge pipeline...', 'info');

  const startTime = Date.now();
  let state = await loadState();

  const client = new Client({ connectionString: CONFIG.POSTGRES_URL });

  try {
    await client.connect();
    log('Connected to PostgreSQL database', 'info');

    const narratives = await extractNarrativesFromDB(client);
    const economicEvents = await extractEconomicEventsFromAPI();

    if (narratives.length === 0 && economicEvents.length === 0) {
      log('No data to analyze - pipeline complete', 'info');
      await saveState(state);
      return;
    }

    const result = await postToCorrelator(narratives, economicEvents);

    if (result.success && result.data) {
      state.totalNarrativesExtracted += narratives.length;
      state.totalEconomicEventsExtracted += economicEvents.length;
      state.totalCorrelationsGenerated += result.data.newCorrelations;
      state.runs += 1;

      log(`Pipeline run #${state.runs} successful:`, 'info');
      log(`  - Narratives: ${narratives.length}`, 'info');
      log(`  - Economic events: ${economicEvents.length}`, 'info');
      log(`  - New correlations: ${result.data.newCorrelations}`, 'info');
      log(`  - Insights: ${result.data.insights.length}`, 'info');

      if (result.data.insights.length > 0) {
        log('Insights:', 'info');
        result.data.insights.forEach((insight, i) => {
          log(`  ${i + 1}. ${insight}`, 'info');
        });
      }
    } else {
      log('Pipeline run failed', 'error');
      if (result.error) {
        log(`Error: ${result.error}`, 'error');
      }
    }

    await saveState(state);

    const elapsed = Date.now() - startTime;
    log(`Pipeline completed in ${(elapsed / 1000).toFixed(2)}s`, 'info');
  } catch (error: any) {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
