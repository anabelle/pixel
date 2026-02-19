import * as fs from 'fs/promises';
import * as path from 'path';
import {
  EvolutionVector,
  CatalystEvent,
  CascadePattern,
  VectorConvergence,
  TemporalCorrelation,
  CatalystTimingPattern,
  TreasuryAllocationWindow,
  VectorActivation,
} from './types';

export class TemporalStore {
  private dataDir: string;
  private vectorsPath: string;
  private catalystsPath: string;
  private cascadesPath: string;
  private correlationsPath: string;

  constructor(dataDir: string = '/data') {
    this.dataDir = dataDir;
    this.vectorsPath = path.join(dataDir, 'temporal-vectors.json');
    this.catalystsPath = path.join(dataDir, 'temporal-catalysts.json');
    this.cascadesPath = path.join(dataDir, 'temporal-cascades.json');
    this.correlationsPath = path.join(dataDir, 'temporal-correlations.json');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });

      await this.ensureFileExists(this.vectorsPath, '[]');
      await this.ensureFileExists(this.catalystsPath, '[]');
      await this.ensureFileExists(this.cascadesPath, '[]');
      await this.ensureFileExists(this.correlationsPath, '[]');
    } catch (error) {
      console.error('Failed to initialize temporal store:', error);
      throw error;
    }
  }

  private async ensureFileExists(filePath: string, defaultContent: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, defaultContent, 'utf-8');
    }
  }

  async loadVectors(): Promise<EvolutionVector[]> {
    const content = await fs.readFile(this.vectorsPath, 'utf-8');
    return JSON.parse(content);
  }

  async saveVectors(vectors: EvolutionVector[]): Promise<void> {
    await fs.writeFile(this.vectorsPath, JSON.stringify(vectors, null, 2), 'utf-8');
  }

  async loadCatalysts(): Promise<CatalystEvent[]> {
    const content = await fs.readFile(this.catalystsPath, 'utf-8');
    return JSON.parse(content);
  }

  async saveCatalysts(catalysts: CatalystEvent[]): Promise<void> {
    await fs.writeFile(this.catalystsPath, JSON.stringify(catalysts, null, 2), 'utf-8');
  }

  async loadCascades(): Promise<CascadePattern[]> {
    const content = await fs.readFile(this.cascadesPath, 'utf-8');
    return JSON.parse(content);
  }

  async saveCascades(cascades: CascadePattern[]): Promise<void> {
    await fs.writeFile(this.cascadesPath, JSON.stringify(cascades, null, 2), 'utf-8');
  }

  async loadCorrelations(): Promise<TemporalCorrelation[]> {
    const content = await fs.readFile(this.correlationsPath, 'utf-8');
    return JSON.parse(content);
  }

  async saveCorrelations(correlations: TemporalCorrelation[]): Promise<void> {
    await fs.writeFile(this.correlationsPath, JSON.stringify(correlations, null, 2), 'utf-8');
  }

  async addVector(vector: EvolutionVector): Promise<void> {
    const vectors = await this.loadVectors();
    const existingIndex = vectors.findIndex(v => v.id === vector.id);
    
    if (existingIndex >= 0) {
      vectors[existingIndex] = vector;
    } else {
      vectors.push(vector);
    }
    
    await this.saveVectors(vectors);
  }

  async addCatalyst(catalyst: CatalystEvent): Promise<void> {
    const catalysts = await this.loadCatalysts();
    catalysts.push(catalyst);
    await this.saveCatalysts(catalysts);
  }

  async addCascade(cascade: CascadePattern): Promise<void> {
    const cascades = await this.loadCascades();
    const existingIndex = cascades.findIndex(c => c.id === cascade.id);
    
    if (existingIndex >= 0) {
      cascades[existingIndex] = cascade;
    } else {
      cascades.push(cascade);
    }
    
    await this.saveCascades(cascades);
  }

  async addCorrelation(correlation: TemporalCorrelation): Promise<void> {
    const correlations = await this.loadCorrelations();
    correlations.push(correlation);
    await this.saveCorrelations(correlations);
  }

  async updateVectorState(vectorId: string, state: string, strength: number, trigger?: string): Promise<void> {
    const vectors = await this.loadVectors();
    const vector = vectors.find(v => v.id === vectorId);
    
    if (vector) {
      vector.state = state as any;
      vector.strength = strength;
      vector.lastActivation = new Date().toISOString();
      
      const activation: VectorActivation = {
        timestamp: new Date().toISOString(),
        strength,
        trigger,
      };
      
      vector.activationHistory.push(activation);
      await this.saveVectors(vectors);
    }
  }

  async getVectorsByType(type: string): Promise<EvolutionVector[]> {
    const vectors = await this.loadVectors();
    return vectors.filter(v => v.type === type);
  }

  async getActiveVectors(): Promise<EvolutionVector[]> {
    const vectors = await this.loadVectors();
    return vectors.filter(v => v.state === 'active' || v.state === 'peak');
  }

  async getRecentCatalysts(hours: number = 24): Promise<CatalystEvent[]> {
    const catalysts = await this.loadCatalysts();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return catalysts.filter(c => c.timestamp >= cutoff);
  }

  async getStats(): Promise<{
    totalVectors: number;
    activeVectors: number;
    totalCatalysts: number;
    totalCascades: number;
    totalCorrelations: number;
  }> {
    const vectors = await this.loadVectors();
    const catalysts = await this.loadCatalysts();
    const cascades = await this.loadCascades();
    const correlations = await this.loadCorrelations();
    const activeVectors = vectors.filter(v => v.state === 'active' || v.state === 'peak').length;

    return {
      totalVectors: vectors.length,
      activeVectors,
      totalCatalysts: catalysts.length,
      totalCascades: cascades.length,
      totalCorrelations: correlations.length,
    };
  }
}
