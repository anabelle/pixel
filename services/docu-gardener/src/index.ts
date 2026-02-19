import express from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import * as path from 'path';

const PORT = process.env.PORT || 3006;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '300000', 10);
const PIXEL_ROOT = process.env.PIXEL_ROOT || '/pixel';

interface TaskEntry {
  id: string;
  status: 'READY' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'BLOCKED';
  title: string;
  content: string;
  timestamp?: string;
}

interface SyncEvent {
  timestamp: string;
  taskId: string;
  action: 'archived' | 'skipped_duplicate' | 'skipped_malformed' | 'error';
  details?: string;
}

class DocuGardenerService {
  private app: express.Application;
  private queuePath: string;
  private archivePath: string;
  private logPath: string;
  private syncEvents: SyncEvent[] = [];
  private lastSyncTime: Date | null = null;

  constructor() {
    this.app = express();
    this.queuePath = path.join(PIXEL_ROOT, 'REFACTOR_QUEUE.md');
    this.archivePath = path.join(PIXEL_ROOT, 'REFACTOR_ARCHIVE.md');
    this.logPath = path.join(PIXEL_ROOT, 'logs', 'docu-gardener.log');

    this.initializeMiddleware();
    this.initializeRoutes();
  }

  private initializeMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private initializeRoutes(): void {
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Docu-Gardener',
        version: '1.0.0',
        description: 'Automated REFACTOR_QUEUE.md → REFACTOR_ARCHIVE.md synchronization',
        endpoints: {
          health: 'GET /health',
          status: 'GET /status',
          metrics: 'GET /metrics',
          forceSync: 'POST /sync/force',
        },
      });
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'docu-gardener', timestamp: new Date().toISOString() });
    });

    this.app.get('/status', (req, res) => {
      res.json({
        service: 'docu-gardener',
        status: 'running',
        lastSyncTime: this.lastSyncTime?.toISOString() || null,
        pollIntervalMs: POLL_INTERVAL_MS,
        queuePath: this.queuePath,
        archivePath: this.archivePath,
        recentEvents: this.syncEvents.slice(-10),
      });
    });

    this.app.get('/metrics', (req, res) => {
      const stats = {
        archived: this.syncEvents.filter(e => e.action === 'archived').length,
        skipped_duplicates: this.syncEvents.filter(e => e.action === 'skipped_duplicate').length,
        skipped_malformed: this.syncEvents.filter(e => e.action === 'skipped_malformed').length,
        errors: this.syncEvents.filter(e => e.action === 'error').length,
        totalEvents: this.syncEvents.length,
      };
      res.json(stats);
    });

    this.app.post('/sync/force', async (req, res) => {
      try {
        await this.processQueue();
        res.json({ status: 'ok', message: 'Sync completed' });
      } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    });

    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  private async logEvent(event: SyncEvent): Promise<void> {
    this.syncEvents.push(event);
    const logMessage = `[${event.timestamp}] Task ${event.taskId}: ${event.action}${event.details ? ` - ${event.details}` : ''}\n`;
    
    try {
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });
      await fs.appendFile(this.logPath, logMessage);
    } catch (error: any) {
      console.error('Failed to write log:', error);
    }
  }

  private async readFileSafe(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn(`File not found: ${filePath}`);
        return '';
      }
      throw error;
    }
  }

  private async writeFileAtomic(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, content);
    await fs.rename(tempPath, filePath);
  }

  private parseTaskEntry(content: string, taskId: string): TaskEntry | null {
    const lines = content.split('\n');
    let title = '';
    let status: TaskEntry['status'] = 'READY';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('###') && trimmed.includes(taskId)) {
        title = trimmed.replace('###', '').trim();
        const statusMatch = trimmed.match(/(READY|IN_PROGRESS|DONE|FAILED|BLOCKED)/);
        if (statusMatch) {
          status = statusMatch[1] as TaskEntry['status'];
        }
        break;
      }
    }

    if (!title) {
      return null;
    }

    return { id: taskId, status, title, content };
  }

  private async extractDoneTasks(): Promise<TaskEntry[]> {
    const queueContent = await this.readFileSafe(this.queuePath);
    if (!queueContent) return [];

    const taskPattern = /### T(\d+):/g;
    const tasks: TaskEntry[] = [];
    const processedTaskIds = new Set<string>();

    let match;
    while ((match = taskPattern.exec(queueContent)) !== null) {
      const taskId = match[1];
      if (processedTaskIds.has(taskId)) continue;
      processedTaskIds.add(taskId);

      const taskStart = match.index;
      const nextTaskMatch = taskPattern.exec(queueContent);
      const taskEnd = nextTaskMatch ? nextTaskMatch.index : queueContent.length;
      
      const taskContent = queueContent.slice(taskStart, taskEnd);
      const task = this.parseTaskEntry(taskContent, taskId);

      if (task && task.status === 'DONE') {
        tasks.push(task);
      }
      
      if (nextTaskMatch) {
        taskPattern.lastIndex = nextTaskMatch.index;
      }
    }

    return tasks;
  }

  private async isTaskArchived(taskId: string): Promise<boolean> {
    const archiveContent = await this.readFileSafe(this.archivePath);
    if (!archiveContent) return false;

    const pattern = new RegExp(`\\|\\s*\\*\\*T${taskId}\\*\\*\\s*\\|`);
    return pattern.test(archiveContent);
  }

  private async archiveTask(task: TaskEntry): Promise<void> {
    const timestamp = task.timestamp || new Date().toISOString().split('T')[0];
    
    const archiveEntry = `| **T${task.id}** | ✅ DONE | ${task.title.replace(/^T\d+:\s*/, '')} | ${timestamp} | Docu-Gardener |\n`;
    
    const archiveContent = await this.readFileSafe(this.archivePath);
    const separator = '## 📜 Completed Tasks Log';
    
    let newArchiveContent;
    if (archiveContent.includes(separator)) {
      const separatorIndex = archiveContent.indexOf(separator) + separator.length;
      newArchiveContent = archiveContent.slice(0, separatorIndex) + '\n' + archiveEntry + archiveContent.slice(separatorIndex);
    } else {
      newArchiveContent = `${separator}\n${archiveEntry}\n`;
    }

    await this.writeFileAtomic(this.archivePath, newArchiveContent);
    await this.removeFromQueue(task.id);
  }

  private async removeFromQueue(taskId: string): Promise<void> {
    const queueContent = await this.readFileSafe(this.queuePath);
    if (!queueContent) return;

    const taskPattern = new RegExp(`### T${taskId}:[\\s\\S]*?(?=### T\\d+:|---\\s*$)`, 'g');
    const newQueueContent = queueContent.replace(taskPattern, '').replace(/\n{3,}/g, '\n\n');

    await this.writeFileAtomic(this.queuePath, newQueueContent);
  }

  private async updateQueueStats(archivedCount: number): Promise<void> {
    const queueContent = await this.readFileSafe(this.queuePath);
    if (!queueContent) return;

    const statsPattern = /\| ⬜ READY \| (\d+) \|\n.*\n.*\n\| 🟡 IN_PROGRESS \| (\d+) \|\n.*\n.*\n\| ✅ DONE \| (\d+) \|\n.*\n.*\n\| ❌ FAILED \| (\d+) \|\n.*\n.*\n\| ⏸️ BLOCKED \| (\d+) \|/;
    const match = queueContent.match(statsPattern);

    if (match) {
      const doneCount = parseInt(match[3], 10);
      const newDoneCount = Math.max(0, doneCount - archivedCount);
      const newStats = `| ⬜ READY | ${match[1]} |\n| Description | Available for processing |\n| 🟡 IN_PROGRESS | ${match[2]} |\n| Description | Currently being worked on |\n| ✅ DONE | ${newDoneCount} |\n| Description | Completed successfully |\n| ❌ FAILED | ${match[4]} |\n| Description | Failed, needs human review |\n| ⏸️ BLOCKED | ${match[5]} |\n| Description | Waiting on dependency |`;
      
      const newQueueContent = queueContent.replace(statsPattern, newStats);
      await this.writeFileAtomic(this.queuePath, newQueueContent);
    }
  }

  async processQueue(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Starting queue processing...`);
    
    try {
      const doneTasks = await this.extractDoneTasks();
      console.log(`[${new Date().toISOString()}] Found ${doneTasks.length} DONE tasks`);

      let archivedCount = 0;
      
      for (const task of doneTasks) {
        try {
          const isArchived = await this.isTaskArchived(task.id);

          if (isArchived) {
            console.log(`[${new Date().toISOString()}] Task T${task.id} already archived, removing from queue`);
            await this.removeFromQueue(task.id);
            await this.logEvent({
              timestamp: new Date().toISOString(),
              taskId: task.id,
              action: 'skipped_duplicate',
              details: 'Already in archive',
            });
            continue;
          }

          if (!task.title || !task.content) {
            console.warn(`[${new Date().toISOString()}] Task T${task.id} malformed, skipping`);
            await this.logEvent({
              timestamp: new Date().toISOString(),
              taskId: task.id,
              action: 'skipped_malformed',
              details: 'Missing title or content',
            });
            continue;
          }

          console.log(`[${new Date().toISOString()}] Archiving task T${task.id}: ${task.title}`);
          await this.archiveTask(task);
          archivedCount++;
          
          await this.logEvent({
            timestamp: new Date().toISOString(),
            taskId: task.id,
            action: 'archived',
            details: task.title,
          });

        } catch (error: any) {
          console.error(`[${new Date().toISOString()}] Error processing task T${task.id}:`, error.message);
          await this.logEvent({
            timestamp: new Date().toISOString(),
            taskId: task.id,
            action: 'error',
            details: error.message,
          });
        }
      }

      if (archivedCount > 0) {
        await this.updateQueueStats(archivedCount);
        console.log(`[${new Date().toISOString()}] Updated queue stats: archived ${archivedCount} tasks`);
      }

      this.lastSyncTime = new Date();
      console.log(`[${new Date().toISOString()}] Queue processing complete`);

    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Fatal error processing queue:`, error);
      await this.logEvent({
        timestamp: new Date().toISOString(),
        taskId: 'SYSTEM',
        action: 'error',
        details: error.message,
      });
    }
  }

  start(): void {
    console.log(`Docu-Gardener service starting on port ${PORT}`);
    console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);
    console.log(`Queue path: ${this.queuePath}`);
    console.log(`Archive path: ${this.archivePath}`);

    this.app.listen(PORT, () => {
      console.log(`Docu-Gardener service listening on port ${PORT}`);
    });

    this.processQueue().catch(err => console.error('Initial sync failed:', err));
    
    setInterval(() => {
      this.processQueue().catch(err => console.error('Scheduled sync failed:', err));
    }, POLL_INTERVAL_MS);
  }

  getApp(): express.Application {
    return this.app;
  }
}

if (require.main === module) {
  const service = new DocuGardenerService();
  service.start();
}

export { DocuGardenerService };
