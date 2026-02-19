import fs from 'fs/promises';
import path from 'path';
import { Correlation } from './types';

export class CorrelationStore {
  private dataPath: string;
  private correlationsPath: string;
  private correlations: Correlation[] = [];

  constructor(dataPath: string = '/data') {
    this.dataPath = dataPath;
    this.correlationsPath = path.join(dataPath, 'narrative-correlations.json');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await this.loadCorrelations();
    } catch (error) {
      console.error('[CORRELATION-STORE] Initialization error:', error);
      this.correlations = [];
    }
  }

  async loadCorrelations(): Promise<void> {
    try {
      const exists = await fs.access(this.correlationsPath).then(() => true).catch(() => false);
      if (!exists) {
        this.correlations = [];
        return;
      }

      const content = await fs.readFile(this.correlationsPath, 'utf-8');
      const data = JSON.parse(content);

      this.correlations = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[CORRELATION-STORE] Error loading correlations:', error);
      this.correlations = [];
    }
  }

  async saveCorrelations(): Promise<void> {
    try {
      const content = JSON.stringify(this.correlations, null, 2);
      await fs.writeFile(this.correlationsPath, content, 'utf-8');
      console.log(`[CORRELATION-STORE] Saved ${this.correlations.length} correlations`);
    } catch (error) {
      console.error('[CORRELATION-STORE] Error saving correlations:', error);
      throw error;
    }
  }

  async addCorrelation(correlation: Correlation): Promise<void> {
    this.correlations.push(correlation);
    await this.saveCorrelations();
  }

  async addCorrelations(correlations: Correlation[]): Promise<void> {
    this.correlations.push(...correlations);
    await this.saveCorrelations();
  }

  async getCorrelations(limit?: number, offset: number = 0): Promise<Correlation[]> {
    const sorted = [...this.correlations].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (limit) {
      return sorted.slice(offset, offset + limit);
    }
    return sorted;
  }

  async getCorrelationById(id: string): Promise<Correlation | null> {
    return this.correlations.find(c => c.id === id) || null;
  }

  async getCorrelationsByTag(tag: string, limit?: number): Promise<Correlation[]> {
    const filtered = this.correlations.filter(c =>
      c.narrative.tags.includes(tag)
    ).sort((a, b) => b.strength - a.strength);

    return limit ? filtered.slice(0, limit) : filtered;
  }

  async getCorrelationsByTimeRange(
    startTime: Date,
    endTime: Date,
    limit?: number
  ): Promise<Correlation[]> {
    const startMs = startTime.getTime();
    const endMs = endTime.getTime();

    const filtered = this.correlations.filter(c => {
      const createdMs = new Date(c.createdAt).getTime();
      return createdMs >= startMs && createdMs <= endMs;
    }).sort((a, b) => b.strength - a.strength);

    return limit ? filtered.slice(0, limit) : filtered;
  }

  async getHighStrengthCorrelations(minStrength: number = 0.7, limit?: number): Promise<Correlation[]> {
    const filtered = this.correlations
      .filter(c => c.strength >= minStrength)
      .sort((a, b) => b.strength - a.strength);

    return limit ? filtered.slice(0, limit) : filtered;
  }

  async getCorrelationStats(): Promise<{
    total: number;
    averageStrength: number;
    byStrength: Record<string, number>;
    byType: Record<string, number>;
  }> {
    if (this.correlations.length === 0) {
      return {
        total: 0,
        averageStrength: 0,
        byStrength: {},
        byType: {}
      };
    }

    const totalStrength = this.correlations.reduce((sum, c) => sum + c.strength, 0);
    const averageStrength = totalStrength / this.correlations.length;

    const byStrength: Record<string, number> = {
      high: this.correlations.filter(c => c.strength >= 0.7).length,
      medium: this.correlations.filter(c => c.strength >= 0.4 && c.strength < 0.7).length,
      low: this.correlations.filter(c => c.strength < 0.4).length
    };

    const byType: Record<string, number> = {};
    for (const c of this.correlations) {
      const type = c.economicEvent.type;
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      total: this.correlations.length,
      averageStrength,
      byStrength,
      byType
    };
  }

  async cleanupOldCorrelations(daysToKeep: number = 7): Promise<number> {
    const cutoffMs = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    const originalLength = this.correlations.length;
    this.correlations = this.correlations.filter(c => {
      const createdMs = new Date(c.createdAt).getTime();
      return createdMs >= cutoffMs;
    });

    if (this.correlations.length !== originalLength) {
      await this.saveCorrelations();
      return originalLength - this.correlations.length;
    }

    return 0;
  }

  async clearAllCorrelations(): Promise<void> {
    this.correlations = [];
    await this.saveCorrelations();
  }

  async getTopTags(limit: number = 10): Promise<{ tag: string; count: number }[]> {
    const tagCounts = new Map<string, number>();

    for (const correlation of this.correlations) {
      for (const tag of correlation.narrative.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
