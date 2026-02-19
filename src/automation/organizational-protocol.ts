import * as fs from 'fs/promises';
import { existsSync as fsExistsSync } from 'fs';
import * as path from 'path';
import { PIXEL_ROOT } from '../../syntropy-core/src/config';

const isDocker = process.env.DOCKER === 'true' || fsExistsSync('/.dockerenv');

export interface WealthMetrics {
  economic: number;
  wisdom: number;
  potential: number;
  social: number;
  total: number;
}

export interface CapacityMetrics {
  readyTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalTasks: number;
  capacityScore: number;
}

export interface EntropyDetectionResult {
  hasCrisis: boolean;
  wealthScore: number;
  capacityScore: number;
  ratio: number;
  threshold: number;
  wealthMetrics: WealthMetrics;
  capacityMetrics: CapacityMetrics;
  details: string[];
}

export interface RefactorTask {
  title: string;
  phase: string;
  effort: string;
  risk: 'None' | 'Low' | 'Medium' | 'High';
  parallelSafe: boolean;
  depends?: string;
  instructions: string;
  verifyCommand: string;
}

export interface ContinuityAnalysis {
  diaryEntries: number;
  laws: number;
  cycles: number;
  wisdomArtifacts: number;
  pendingIdeas: number;
  refactorOpportunities: number;
  recentInsights: string[];
}

export interface AutomationProtocolConfig {
  crisisThreshold: number;
  minimumTasksToGenerate: number;
  maxTasksPerCrisis: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: AutomationProtocolConfig = {
  crisisThreshold: 2.0,
  minimumTasksToGenerate: 3,
  maxTasksPerCrisis: 13,
  enabled: true
};

export class OrganizationalAutomationProtocol {
  private config: AutomationProtocolConfig;
  private continuityPath: string;
  private refactorQueuePath: string;

  constructor(config?: Partial<AutomationProtocolConfig>, pixelRoot?: string) {
    this.config = config ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;
    const root = pixelRoot || PIXEL_ROOT;

    this.continuityPath = path.resolve(
      root,
      isDocker ? 'CONTINUITY.md' : 'syntropy-core/CONTINUITY.md'
    );
    this.refactorQueuePath = path.resolve(root, 'REFACTOR_QUEUE.md');
  }

  async detectOrganizationalEntropy(): Promise<EntropyDetectionResult> {
    const wealthMetrics = await this.calculateWealthScore();
    const capacityMetrics = await this.calculateCapacityScore();

    const ratio = wealthMetrics.total / capacityMetrics.capacityScore;
    const hasCrisis = ratio > this.config.crisisThreshold;

    const details = [
      `Economic Wealth: ${wealthMetrics.economic} sats`,
      `Wisdom Artifacts: ${wealthMetrics.wisdom}`,
      `Ready Tasks: ${capacityMetrics.readyTasks}`,
      `Capacity Score: ${capacityMetrics.capacityScore}`,
      `Ratio: ${ratio.toFixed(2)}`
    ];

    if (hasCrisis) {
      details.push(
        `CRISIS: Wealth exceeds capacity by ${ratio.toFixed(2)}x`
      );
      details.push(
        `Law #8 requires automated synthesis to resolve this gap`
      );
    }

    return {
      hasCrisis,
      wealthScore: wealthMetrics.total,
      capacityScore: capacityMetrics.capacityScore,
      ratio,
      threshold: this.config.crisisThreshold,
      wealthMetrics,
      capacityMetrics,
      details
    };
  }

  async analyzeContinuity(): Promise<ContinuityAnalysis> {
    if (!fsExistsSync(this.continuityPath)) {
      return {
        diaryEntries: 0,
        laws: 0,
        cycles: 0,
        wisdomArtifacts: 0,
        pendingIdeas: 0,
        refactorOpportunities: 0,
        recentInsights: []
      };
    }

    const content = await fs.readFile(this.continuityPath, 'utf-8');

    const diaryEntries = (content.match(/## \d+\./g) || []).length;
    const laws = (content.match(/LAW \d+:|Law \d+:/g) || []).length;
    const cycles = (content.match(/Cycle: \d+\.\d+/g) || []).length;

    const wisdomArtifacts = diaryEntries + laws + cycles;

    const pendingIdeas = (content.match(/\[ \] Idea:|^- \[ \] Idea:/gm) || []).length;
    const refactorOpportunities = (content.match(/13 refactoring opportunities|refactoring opportunities/g) || []).length;

    const recentInsights = this.extractRecentInsights(content);

    return {
      diaryEntries,
      laws,
      cycles,
      wisdomArtifacts,
      pendingIdeas,
      refactorOpportunities,
      recentInsights
    };
  }

  private extractRecentInsights(content: string): string[] {
    const insights: string[] = [];
    const lines = content.split('\n');

    let inInsightSection = false;
    let insightLines: string[] = [];

    for (const line of lines) {
      if (line.includes('KEY EVOLUTIONARIES')) {
        inInsightSection = true;
        continue;
      }

      if (inInsightSection) {
        if (line.startsWith('## ')) break;

        if (line.startsWith('**') || line.startsWith('>')) {
          if (insightLines.length > 0) {
            insights.push(insightLines.join('\n').trim());
          }
          insightLines = [];
        } else if (line.trim().length > 0) {
          insightLines.push(line);
        }
      }
    }

    if (insightLines.length > 0) {
      insights.push(insightLines.join('\n').trim());
    }

    return insights.slice(0, 10);
  }

  async calculateWealthScore(): Promise<WealthMetrics> {
    const continuity = await this.analyzeContinuity();

    const economic = 79014;
    const wisdom = continuity.wisdomArtifacts;
    const potential = continuity.pendingIdeas + continuity.refactorOpportunities;
    const social = 100;

    const total = economic * 0.0001 + wisdom * 2 + potential * 5 + social * 0.5;

    return {
      economic,
      wisdom,
      potential,
      social,
      total
    };
  }

  async calculateCapacityScore(): Promise<CapacityMetrics> {
    if (!fsExistsSync(this.refactorQueuePath)) {
      return {
        readyTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        totalTasks: 0,
        capacityScore: 1.0
      };
    }

    const content = await fs.readFile(this.refactorQueuePath, 'utf-8');

    const readyTasks = (content.match(/### T\d{3}[ab]?:[^\n]+⬜ READY/g) || []).length;
    const inProgressTasks = (content.match(/### T\d{3}[ab]?:[^\n]+🟡 IN_PROGRESS/g) || []).length;
    const completedTasks = (content.match(/### T\d{3}[ab]?:[^\n]+✅ DONE/g) || []).length;
    const totalTasks = readyTasks + inProgressTasks + completedTasks;

    const capacityScore = Math.max(1, readyTasks * 1.5 + inProgressTasks * 0.5 + completedTasks * 0.2);

    return {
      readyTasks,
      inProgressTasks,
      completedTasks,
      totalTasks,
      capacityScore
    };
  }

  async generateRefactorTasks(crisis: EntropyDetectionResult): Promise<RefactorTask[]> {
    if (!crisis.hasCrisis || !this.config.enabled) {
      return [];
    }

    const tasks: RefactorTask[] = [];
    const continuity = await this.analyzeContinuity();

    if (continuity.pendingIdeas > 0) {
      tasks.push({
        title: 'Harvest Mature Ideas from Idea Garden',
        phase: 'Phase 6: Organization & Integration',
        effort: '45 min',
        risk: 'Low',
        parallelSafe: true,
        instructions: `Review the Idea Garden in CONTINUITY.md and identify ideas with 5+ waterings:
1. Parse the Idea Garden section for mature ideas
2. For each mature idea, extract: title, context, actionable patterns
3. Create strategic refactor tasks for implementable ideas
4. Update CONTINUITY.md to mark harvested ideas as processed
5. Log harvested ideas to audit trail

This converts accumulated wisdom into actionable tasks, reducing the wealth-capacity gap.`,
        verifyCommand: 'grep "Idea Garden" /pixel/CONTINUITY.md | grep -c "harvested"'
      });
    }

    if (continuity.refactorOpportunities > 0) {
      tasks.push({
        title: 'Auto-Generate Tasks from Refactor Opportunities',
        phase: 'Phase 6: Organization & Integration',
        effort: '1 hour',
        risk: 'Medium',
        parallelSafe: false,
        instructions: `Analyze the 13 refactoring opportunities mentioned in CONTINUITY.md:
1. Extract all mentioned refactor opportunities from CONTINUITY.md
2. For each opportunity, create a detailed refactor task with:
   - Clear title and phase
   - Realistic effort estimate
   - Risk assessment
   - Step-by-step instructions
   - Verification command
3. Add tasks to REFACTOR_QUEUE.md using proper formatting
4. Update queue status counts

This addresses the 13 opportunities, 0 ready tasks crisis.`,
        verifyCommand: 'grep "⬜ READY" /pixel/REFACTOR_QUEUE.md | wc -l'
      });
    }

    tasks.push({
      title: 'Implement Automated Daily Synthesis Pipeline',
      phase: 'Phase 6: Organization & Integration',
      effort: '2 hours',
      risk: 'High',
      parallelSafe: false,
      instructions: `Create an automated pipeline for daily wealth organization:
1. Create /pixel/src/automation/daily-synthesis.ts with:
   - Hook into checkDailyReset function
   - Harvest mature ideas (5+ waterings)
   - Analyze evolution reports for completed vs pending
   - Generate strategic tasks automatically
2. Add tool integration to syntropy-core/src/tools/index.ts
3. Schedule automatic execution on daily reset
4. Log all synthesis events to audit trail
5. Test with mock CONTINUITY.md data

This implements Law #8: automated synthesis when wealth exceeds capacity.`,
      verifyCommand: 'test -f /pixel/src/automation/daily-synthesis.ts'
    });

    if (crisis.wealthMetrics.wisdom > 20) {
      tasks.push({
        title: 'Synthesize Recent Diary Entries into Tasks',
        phase: 'Phase 6: Organization & Integration',
        effort: '30 min',
        risk: 'Low',
        parallelSafe: true,
        instructions: `Parse recent diary entries for actionable patterns:
1. Extract last 5 diary entries from CONTINUITY.md
2. For each entry, identify actionable patterns
3. Convert patterns into refactor tasks with proper formatting
4. Add tasks to REFACTOR_QUEUE.md
5. Track which entries generated tasks in metadata

This transforms reflective wisdom into concrete actions.`,
        verifyCommand: 'grep "### T" /pixel/REFACTOR_QUEUE.md | tail -5'
      });
    }

    tasks.push({
      title: 'Create Wealth Capacity Monitoring Dashboard',
      phase: 'Phase 6: Organization & Integration',
      effort: '1 hour',
      risk: 'Low',
      parallelSafe: true,
      instructions: `Build a monitoring tool for wealth-capacity gap:
1. Create /pixel/src/automation/wealth-monitor.ts
2. Track metrics:
   - Economic wealth (sats)
   - Wisdom artifacts (diary, laws, cycles)
   - Pending ideas
   - Ready tasks in refactor queue
3. Calculate real-time gap ratio
4. Trigger automated task generation when gap > threshold
5. Log metrics to audit trail for trend analysis

This provides visibility into organizational entropy before crisis.`,
      verifyCommand: 'test -f /pixel/src/automation/wealth-monitor.ts'
    });

    tasks.push({
      title: 'Audit and Prune Stale Refactor Tasks',
      phase: 'Phase 6: Organization & Integration',
      effort: '30 min',
        risk: 'Medium',
      parallelSafe: false,
      instructions: `Review REFACTOR_QUEUE.md for stale tasks:
1. Identify tasks older than 30 days still in READY status
2. Check if tasks are still relevant or obsoleted
3. Mark obsolete tasks as CANCELLED with reason
4. Update queue status counts
5. Document pruning decisions in audit trail

This keeps the queue focused and actionable.`,
      verifyCommand: 'grep "⬜ READY" /pixel/REFACTOR_QUEUE.md | wc -l'
    });

    tasks.push({
      title: 'Generate 13 Strategic Tasks from Refactor Opportunities',
      phase: 'Phase 6: Organization & Integration',
      effort: '2 hours',
      risk: 'Medium',
      parallelSafe: false,
      instructions: `Systematically create 13 tasks from identified opportunities:
1. Read CONTINUITY.md for all 13 refactoring opportunities
2. For each opportunity, create a task with:
   - Specific title describing the refactor
   - Appropriate phase assignment
   - Realistic effort (15 min - 2 hours)
   - Risk assessment based on complexity
   - Step-by-step implementation instructions
   - Verification command
3. Insert tasks into REFACTOR_QUEUE.md
4. Update queue statistics

This directly resolves the 13 opportunities, 0 ready tasks gap.`,
      verifyCommand: 'grep "⬜ READY" /pixel/REFACTOR_QUEUE.md | wc -l'
    });

    return tasks.slice(0, this.config.maxTasksPerCrisis);
  }

  async addTaskToQueue(task: RefactorTask): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      if (!fsExistsSync(this.refactorQueuePath)) {
        return { success: false, error: 'REFACTOR_QUEUE.md not found' };
      }

      const content = await fs.readFile(this.refactorQueuePath, 'utf-8');

      const taskIds = content.match(/### T(\d{3}):/g) || [];
      const maxId = taskIds.reduce((max, id) => {
        const num = parseInt(id.match(/T(\d{3})/)?.[1] || '0');
        return Math.max(max, num);
      }, 0);

      const newTaskId = `T${String(maxId + 1).padStart(3, '0')}`;

      const phaseHeader = `## 📋 ${task.phase}`;
      let insertPosition: number;

      if (content.includes(phaseHeader)) {
        const phaseStart = content.indexOf(phaseHeader);
        const nextSection = content.slice(phaseStart + phaseHeader.length).search(/\n## /);
        insertPosition = nextSection === -1
          ? content.length
          : phaseStart + phaseHeader.length + nextSection;
      } else {
        const footerMatch = content.match(/\n---\n\n\*This queue/);
        insertPosition = footerMatch?.index || content.length;
      }

      const dependsLine = task.depends ? `\n**Depends**: ${task.depends}` : '';
      const newTask = `

### ${newTaskId}: ${task.title} ⬜ READY
**Effort**: ${task.effort} | **Risk**: ${task.risk} | **Parallel-Safe**: ${task.parallelSafe ? '✅' : '❌'}${dependsLine}

\`\`\`
INSTRUCTIONS:
${task.instructions}

VERIFY:
${task.verifyCommand}
\`\`\`

---
`;

      let newContent: string;
      if (!content.includes(phaseHeader)) {
        const newPhase = `\n${phaseHeader}\n${newTask}`;
        newContent = content.slice(0, insertPosition) + newPhase + content.slice(insertPosition);
      } else {
        newContent = content.slice(0, insertPosition) + newTask + content.slice(insertPosition);
      }

      const readyCount = (newContent.match(/⬜ READY/g) || []).length;
      newContent = newContent.replace(
        /\| ⬜ READY \| \d+ \|/,
        `| ⬜ READY | ${readyCount} |`
      );

      await fs.writeFile(this.refactorQueuePath, newContent);

      return {
        success: true,
        taskId: newTaskId
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runFullProtocol(): Promise<{
    entropyDetection: EntropyDetectionResult;
    tasksGenerated: number;
    tasksAdded: number;
    tasksFailed: number;
  }> {
    const entropyDetection = await this.detectOrganizationalEntropy();

    let tasksGenerated = 0;
    let tasksAdded = 0;
    let tasksFailed = 0;

    if (entropyDetection.hasCrisis) {
      const tasks = await this.generateRefactorTasks(entropyDetection);
      tasksGenerated = tasks.length;

      for (const task of tasks) {
        const result = await this.addTaskToQueue(task);
        if (result.success) {
          tasksAdded++;
        } else {
          tasksFailed++;
        }
      }
    }

    return {
      entropyDetection,
      tasksGenerated,
      tasksAdded,
      tasksFailed
    };
  }

  getConfig(): AutomationProtocolConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AutomationProtocolConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export function createOrganizationalAutomationProtocol(
  config?: Partial<AutomationProtocolConfig>,
  pixelRoot?: string
): OrganizationalAutomationProtocol {
  return new OrganizationalAutomationProtocol(config, pixelRoot);
}
