/**
 * Cost Monitor - Track AI model usage and estimate costs
 * Helps optimize spending across model tiers
 * PERSISTS to disk so data survives reboots
 *
 * Models tracked:
 * - Gemini: Free tier + paid tiers (per-call pricing)
 * - GLM: Flat-rate Coding Lite plan ($84/yr, effectively $0 per call)
 */

import { audit } from "./audit.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface CostEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: string; // ISO string for JSON serialization
  task: 'conversation' | 'memory' | 'summary' | 'compaction' | 'inner-life' | 'heartbeat' | 'job' | 'other';
}

// Pricing per 1M tokens (from Google AI pricing Feb 2026)
const PRICING: Record<string, { input: number; output: number; free: boolean }> = {
  // Gemini models
  'gemini-2.0-flash': { input: 0, output: 0, free: true },  // Free tier
  'gemini-2.0-flash-lite': { input: 0.07, output: 0.30, free: false },
  'gemini-2.5-flash': { input: 0.30, output: 2.50, free: false },
  'gemini-3-flash-preview': { input: 0.50, output: 3.00, free: false },  // Estimated
  // GLM models (flat-rate Coding Lite plan - $84/yr, effectively $0 per call)
  'glm-4.5': { input: 0, output: 0, free: true },
  'glm-4.5-air': { input: 0, output: 0, free: true },
  'glm-4.6': { input: 0, output: 0, free: true },
  'glm-4.7': { input: 0, output: 0, free: true },
  'glm-5': { input: 0, output: 0, free: true },
};

const DATA_DIR = process.env.DATA_DIR ?? '/app/data';
const COSTS_FILE = join(DATA_DIR, 'costs.json');

class CostMonitor {
  private entries: CostEntry[] = [];
  private dailyLimit: number = 15; // $15/day warning threshold
  private lastLogTime: number = 0;
  private logInterval: number = 5 * 60 * 1000; // 5 minutes
  private lastSaveTime: number = 0;
  private saveInterval: number = 60 * 1000; // Save every minute
  
  constructor() {
    this.loadFromDisk();
  }
  
  private loadFromDisk() {
    try {
      if (existsSync(COSTS_FILE)) {
        const data = JSON.parse(readFileSync(COSTS_FILE, 'utf-8'));
        // Only load entries from today (keep 7 days of history)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        this.entries = (data.entries || []).filter((e: CostEntry) => {
          const entryDate = new Date(e.timestamp);
          return entryDate >= sevenDaysAgo;
        });
        
        console.log(`[cost-monitor] Loaded ${this.entries.length} entries from disk`);
      }
    } catch (err) {
      console.error('[cost-monitor] Failed to load from disk:', err);
      this.entries = [];
    }
  }
  
  private saveToDisk() {
    try {
      // Ensure directory exists
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      
      writeFileSync(COSTS_FILE, JSON.stringify({
        entries: this.entries,
        lastSaved: new Date().toISOString()
      }, null, 2));
      
      this.lastSaveTime = Date.now();
    } catch (err) {
      console.error('[cost-monitor] Failed to save to disk:', err);
    }
  }
  
  recordUsage(model: string, inputTokens: number, outputTokens: number, task: CostEntry['task']) {
    // Normalize model name (Gemini only - GLM models pass through unchanged)
    const normalizedModel = model.includes('gemini-3') ? 'gemini-3-flash-preview' :
                           model.includes('gemini-2.5') ? 'gemini-2.5-flash' :
                           model.includes('gemini-2.0-flash-lite') ? 'gemini-2.0-flash-lite' :
                           model.includes('gemini-2.0') ? 'gemini-2.0-flash' :
                           model.startsWith('glm-') ? model : model;  // GLM models: pass through unchanged
    
    this.entries.push({
      model: normalizedModel,
      inputTokens,
      outputTokens,
      timestamp: new Date().toISOString(),
      task
    });
    
    const now = Date.now();
    
    // Log every 5 minutes or every 20 calls
    if (now - this.lastLogTime > this.logInterval || this.entries.length % 20 === 0) {
      this.logSummary();
      this.lastLogTime = now;
    }
    
    // Save to disk every minute
    if (now - this.lastSaveTime > this.saveInterval) {
      this.saveToDisk();
    }
  }
  
  getCost(entry: CostEntry): number {
    const pricing = PRICING[entry.model];
    if (!pricing || pricing.free) return 0;
    
    const inputCost = (entry.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (entry.outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }
  
  getTodayCost(): number {
    const today = new Date().toDateString();
    return this.entries
      .filter(e => new Date(e.timestamp).toDateString() === today)
      .reduce((sum, e) => sum + this.getCost(e), 0);
  }
  
  getTodayCalls(): number {
    const today = new Date().toDateString();
    return this.entries.filter(e => new Date(e.timestamp).toDateString() === today).length;
  }
  
  getSavingsVsSingleModel(): { saved: number; wouldHaveCost: number; actualCost: number } {
    const today = new Date().toDateString();
    const todayEntries = this.entries.filter(e => new Date(e.timestamp).toDateString() === today);
    
    const actualCost = todayEntries.reduce((sum, e) => sum + this.getCost(e), 0);
    
    // Calculate what it would cost if everything used gemini-3
    const expensivePricing = PRICING['gemini-3-flash-preview'];
    const wouldHaveCost = todayEntries.reduce((sum, e) => {
      const inputCost = (e.inputTokens / 1_000_000) * expensivePricing.input;
      const outputCost = (e.outputTokens / 1_000_000) * expensivePricing.output;
      return sum + inputCost + outputCost;
    }, 0);
    
    return {
      saved: wouldHaveCost - actualCost,
      wouldHaveCost,
      actualCost
    };
  }
  
  getBreakdownByModel(): Record<string, { calls: number; tokens: number; cost: number }> {
    const today = new Date().toDateString();
    const todayEntries = this.entries.filter(e => new Date(e.timestamp).toDateString() === today);
    const byModel: Record<string, { calls: number; tokens: number; cost: number }> = {};
    
    for (const entry of todayEntries) {
      if (!byModel[entry.model]) {
        byModel[entry.model] = { calls: 0, tokens: 0, cost: 0 };
      }
      byModel[entry.model].calls++;
      byModel[entry.model].tokens += entry.inputTokens + entry.outputTokens;
      byModel[entry.model].cost += this.getCost(entry);
    }
    
    return byModel;
  }
  
  getBreakdownByTask(): Record<string, { calls: number; cost: number }> {
    const today = new Date().toDateString();
    const todayEntries = this.entries.filter(e => new Date(e.timestamp).toDateString() === today);
    const byTask: Record<string, { calls: number; cost: number }> = {};
    
    for (const entry of todayEntries) {
      if (!byTask[entry.task]) {
        byTask[entry.task] = { calls: 0, cost: 0 };
      }
      byTask[entry.task].calls++;
      byTask[entry.task].cost += this.getCost(entry);
    }
    
    return byTask;
  }
  
  logSummary() {
    const today = this.getTodayCost();
    const savings = this.getSavingsVsSingleModel();
    const breakdown = this.getBreakdownByModel();
    
    console.log(`[cost-monitor] Today: $${today.toFixed(2)} | Saved: $${savings.saved.toFixed(2)} vs all-gemini-3 | Calls: ${this.getTodayCalls()}`);
    
    for (const [model, data] of Object.entries(breakdown)) {
      const tier = PRICING[model]?.free ? 'FREE' : 'PAID';
      console.log(`[cost-monitor]   ${model} (${tier}): ${data.calls} calls, ${(data.tokens/1000).toFixed(1)}K tokens, $${data.cost.toFixed(2)}`);
    }
    
    if (today > this.dailyLimit) {
      console.warn(`[cost-monitor] ⚠️ DAILY LIMIT EXCEEDED: $${today.toFixed(2)} > $${this.dailyLimit}`);
      audit("cost_alert", `Daily limit exceeded: $${today.toFixed(2)}`, { limit: this.dailyLimit, actual: today });
    }
  }
  
  getReport() {
    const savings = this.getSavingsVsSingleModel();
    const today = this.getTodayCost();
    const calls = this.getTodayCalls();
    const breakdown = this.getBreakdownByModel();
    const byTask = this.getBreakdownByTask();
    
    // Estimate remaining credits (starting from $5000)
    const startingCredits = 5000;
    const usedCredits = startingCredits - 4454.21; // From user's current balance
    const projectedDaily = today;
    const projectedMonthly = projectedDaily * 30;
    
    return {
      today: {
        cost: today,
        calls: calls,
        breakdown: breakdown,
        byTask: byTask
      },
      savings: {
        amount: savings.saved,
        wouldHaveCost: savings.wouldHaveCost,
        actualCost: savings.actualCost,
        percentage: savings.wouldHaveCost > 0 ? Math.round((savings.saved / savings.wouldHaveCost) * 100) : 0
      },
      projection: {
        daily: projectedDaily,
        monthly: projectedMonthly,
        daysRemaining: today > 0 ? Math.floor(4454.21 / today) : null
      },
      status: today > this.dailyLimit ? 'warning' : 'ok',
      lastSaved: new Date(this.lastSaveTime).toISOString()
    };
  }
}

// Singleton instance
export const costMonitor = new CostMonitor();

// Estimate tokens from text (rough approximation: ~4 chars per token)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
