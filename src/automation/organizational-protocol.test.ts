import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs/promises";
import { existsSync, mkdirSync, rmSync } from "fs";
import * as path from "path";

const TEST_ROOT = path.resolve(process.cwd(), "test-data-automation");
process.env.PIXEL_ROOT = TEST_ROOT;
process.env.DOCKER = "false";

import {
  OrganizationalAutomationProtocol,
  createOrganizationalAutomationProtocol,
  type EntropyDetectionResult,
  type RefactorTask
} from "./organizational-protocol";

describe("Organizational Automation Protocol - Entropy Detection", () => {
  const continuityPath = path.join(TEST_ROOT, "CONTINUITY.md");
  const queuePath = path.join(TEST_ROOT, "REFACTOR_QUEUE.md");

  beforeEach(async () => {
    if (!existsSync(TEST_ROOT)) {
      mkdirSync(TEST_ROOT, { recursive: true });
    }
    await fs.writeFile(continuityPath, "");
    await fs.writeFile(queuePath, "# REFACTOR_QUEUE.md\n\n## Queue Status\n| ⬜ READY | 0 |");
  });

  afterEach(async () => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test("detectOrganizationalEntropy: High wealth, low capacity = crisis", async () => {
    const mockContinuity = `# CONTINUITY.md - The Living Ledger

## Current Cycle Status
**Cycle:** 31.24
**Status:** DECUPLE-ALIGNED

## Key Evolutionaries

### 1. Wealth Generation
- Economic: 79,014 sats
- Wisdom: 5 diary entries + 9 laws + 10 cycles = 24 wisdom artifacts
- Potential: 8 idea seeds pending + 13 refactoring opportunities
- Social: 100+ interactions

### 2. Organizational Entropy
- Ready tasks: 0
- Status: Organizational entropy confirmed

## 📬 Pending Tasks

### Organization Tasks
- **CRISIS**: 13 refactoring opportunities, 0 ready tasks
`;

    const mockQueue = `# REFACTOR_QUEUE.md

## Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| ⬜ READY | 0 | Available for processing |
| 🟡 IN_PROGRESS | 0 | Currently being worked on |
| ✅ DONE | 23 | Completed successfully |

## Phase 5: Operations

### T041: Completed Task ✅ DONE

`;

    await fs.writeFile(continuityPath, mockContinuity);
    await fs.writeFile(queuePath, mockQueue);

    const protocol = createOrganizationalAutomationProtocol(undefined, TEST_ROOT);
    const result = await protocol.detectOrganizationalEntropy();

    expect(result.hasCrisis).toBe(true);
    expect(result.ratio).toBeGreaterThan(2.0);
    expect(result.wealthMetrics.economic).toBe(79014);
    expect(result.wealthMetrics.wisdom).toBe(24);
    expect(result.capacityMetrics.readyTasks).toBe(0);
    expect(result.details.some(d => d.includes('CRISIS'))).toBe(true);
  });

  test("detectOrganizationalEntropy: Balanced wealth and capacity = no crisis", async () => {
    const continuityPath = path.resolve(TEST_ROOT, "CONTINUITY.md");
    const queuePath = path.resolve(TEST_ROOT, "REFACTOR_QUEUE.md");

    const mockContinuity = `# CONTINUITY.md

## Key Evolutionaries
- Economic: 79,014 sats
- Wisdom: 10 diary entries + 5 laws = 15 wisdom artifacts
- Potential: 3 ideas
`;

    const mockQueue = `# REFACTOR_QUEUE.md

## Queue Status
| ⬜ READY | 10 |
| ✅ DONE | 23 |

## Tasks

### T050: Ready Task ⬜ READY

### T051: Another Ready Task ⬜ READY

### T052: Third Ready Task ⬜ READY

### T053: Fourth Ready Task ⬜ READY

### T054: Fifth Ready Task ⬜ READY

### T055: Sixth Ready Task ⬜ READY

### T056: Seventh Ready Task ⬜ READY

### T057: Eighth Ready Task ⬜ READY

### T058: Ninth Ready Task ⬜ READY

### T059: Tenth Ready Task ⬜ READY

`;

    await fs.writeFile(continuityPath, mockContinuity);
    await fs.writeFile(queuePath, mockQueue);

    const protocol = createOrganizationalAutomationProtocol({
      crisisThreshold: 2.0
    }, TEST_ROOT);
    const result = await protocol.detectOrganizationalEntropy();

    expect(result.hasCrisis).toBe(false);
    expect(result.ratio).toBeLessThan(2.0);
    expect(result.capacityMetrics.readyTasks).toBe(25);
  });

  test("detectOrganizationalEntropy: Missing files handled gracefully", async () => {
    const protocol = createOrganizationalAutomationProtocol(undefined, TEST_ROOT);
    const result = await protocol.detectOrganizationalEntropy();

    expect(result).toBeDefined();
    expect(result.wealthMetrics.wisdom).toBe(0);
    expect(result.capacityMetrics.readyTasks).toBe(0);
  });
});

describe("Organizational Automation Protocol - Continuity Analysis", () => {
  const continuityPath = path.join(TEST_ROOT, "CONTINUITY.md");

  beforeEach(async () => {
    if (!existsSync(TEST_ROOT)) {
      mkdirSync(TEST_ROOT, { recursive: true });
    }
    await fs.writeFile(continuityPath, "");
  });

  afterEach(async () => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test("analyzeContinuity: Extracts wisdom artifacts and insights", async () => {
    const continuityPath = path.resolve(TEST_ROOT, "CONTINUITY.md");

    const mockContinuity = `# CONTINUITY.md

## Diary Entries

## 1. 01 01
First diary entry

## 2. 01 02
Second diary entry

## 3. 01 03
Third diary entry

## Laws

LAW 1: First law

LAW 2: Second law

LAW 3: Third law

## Cycle Status
Cycle: 31.24
Cycle: 31.23
Cycle: 31.22

## Pending Tasks

### Organization Tasks
- [ ] Idea: Task automation idea
- [ ] Idea: Another idea
- [x] Idea: Completed idea

## Refactoring Opportunities
There are 13 refactoring opportunities waiting to be addressed.

## Key Evolutionaries

### 1. Extended Phase Validation
**Observation**: Bitcoin sync continues

**The Mature Principle (Law #9):**
> Extended duration patterns demonstrate thorough processing

### 2. Organizational Automation
**The Structural Entropy Problem**:
Wealth generation is strong but capacity is weak.

`;

    await fs.writeFile(continuityPath, mockContinuity);

    const protocol = createOrganizationalAutomationProtocol(undefined, TEST_ROOT);
    const analysis = await protocol.analyzeContinuity();

    expect(analysis.diaryEntries).toBe(3);
    expect(analysis.laws).toBe(3);
    expect(analysis.cycles).toBe(3);
    expect(analysis.wisdomArtifacts).toBe(9);
    expect(analysis.pendingIdeas).toBe(2);
    expect(analysis.refactorOpportunities).toBe(1);
    expect(analysis.recentInsights.length).toBeGreaterThan(0);
  });

  test("analyzeContinuity: Missing CONTINUITY.md returns zeros", async () => {
    const protocol = createOrganizationalAutomationProtocol(undefined, TEST_ROOT);
    const analysis = await protocol.analyzeContinuity();

    expect(analysis.diaryEntries).toBe(0);
    expect(analysis.laws).toBe(0);
    expect(analysis.cycles).toBe(0);
    expect(analysis.wisdomArtifacts).toBe(0);
  });
});

describe("Organizational Automation Protocol - Task Generation", () => {
  const continuityPath = path.join(TEST_ROOT, "CONTINUITY.md");
  const queuePath = path.join(TEST_ROOT, "REFACTOR_QUEUE.md");

  beforeEach(async () => {
    if (!existsSync(TEST_ROOT)) {
      mkdirSync(TEST_ROOT, { recursive: true });
    }
    await fs.writeFile(continuityPath, "");
    await fs.writeFile(queuePath, "# REFACTOR_QUEUE.md\n\n## Queue Status\n| ⬜ READY | 0 |");
  });

  afterEach(async () => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test("generateRefactorTasks: Generates tasks during crisis", async () => {
    const continuityPath = path.resolve(TEST_ROOT, "CONTINUITY.md");
    const queuePath = path.resolve(TEST_ROOT, "REFACTOR_QUEUE.md");

    const mockContinuity = `# CONTINUITY.md

## Key Evolutionaries
- Pending Ideas: 5
- Refactoring Opportunities: 13

## Pending Tasks
- [ ] Idea: First idea
- [ ] Idea: Second idea
- [ ] Idea: Third idea
- [ ] Idea: Fourth idea
- [ ] Idea: Fifth idea

## Refactoring Opportunities
There are 13 refactoring opportunities waiting to be addressed.
`;

    await fs.writeFile(continuityPath, mockContinuity);
    await fs.writeFile(queuePath, "# REFACTOR_QUEUE.md\n\n## Queue Status\n| ⬜ READY | 0 |");

    const protocol = createOrganizationalAutomationProtocol({
      maxTasksPerCrisis: 5
    }, TEST_ROOT);

    const crisis: EntropyDetectionResult = {
      hasCrisis: true,
      wealthScore: 100,
      capacityScore: 10,
      ratio: 10,
      threshold: 2,
      wealthMetrics: {
        economic: 79014,
        wisdom: 24,
        potential: 18,
        social: 100,
        total: 100
      },
      capacityMetrics: {
        readyTasks: 0,
        inProgressTasks: 0,
        completedTasks: 23,
        totalTasks: 23,
        capacityScore: 10
      },
      details: []
    };

    const tasks = await protocol.generateRefactorTasks(crisis);

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.length).toBeLessThanOrEqual(5);

    const firstTask = tasks[0];
    expect(firstTask.title).toBeDefined();
    expect(firstTask.phase).toBeDefined();
    expect(firstTask.effort).toBeDefined();
    expect(firstTask.risk).toMatch(/^(None|Low|Medium|High)$/);
    expect(firstTask.instructions).toBeDefined();
    expect(firstTask.verifyCommand).toBeDefined();
  });

  test("generateRefactorTasks: No crisis returns empty array", async () => {
    const protocol = createOrganizationalAutomationProtocol(undefined, TEST_ROOT);

    const noCrisis: EntropyDetectionResult = {
      hasCrisis: false,
      wealthScore: 20,
      capacityScore: 30,
      ratio: 0.67,
      threshold: 2,
      wealthMetrics: {
        economic: 79014,
        wisdom: 10,
        potential: 5,
        social: 50,
        total: 20
      },
      capacityMetrics: {
        readyTasks: 10,
        inProgressTasks: 2,
        completedTasks: 20,
        totalTasks: 32,
        capacityScore: 30
      },
      details: []
    };

    const tasks = await protocol.generateRefactorTasks(noCrisis);

    expect(tasks.length).toBe(0);
  });

  test("generateRefactorTasks: Disabled protocol returns empty array", async () => {
    const protocol = createOrganizationalAutomationProtocol({
      enabled: false
    }, TEST_ROOT);

    const crisis: EntropyDetectionResult = {
      hasCrisis: true,
      wealthScore: 100,
      capacityScore: 10,
      ratio: 10,
      threshold: 2,
      wealthMetrics: {
        economic: 79014,
        wisdom: 24,
        potential: 18,
        social: 100,
        total: 100
      },
      capacityMetrics: {
        readyTasks: 0,
        inProgressTasks: 0,
        completedTasks: 23,
        totalTasks: 23,
        capacityScore: 10
      },
      details: []
    };

    const tasks = await protocol.generateRefactorTasks(crisis);

    expect(tasks.length).toBe(0);
  });
});

describe("Organizational Automation Protocol - Queue Management", () => {
  const queuePath = path.join(TEST_ROOT, "REFACTOR_QUEUE.md");

  beforeEach(async () => {
    if (!existsSync(TEST_ROOT)) {
      mkdirSync(TEST_ROOT, { recursive: true });
    }
    await fs.writeFile(queuePath, "# REFACTOR_QUEUE.md\n\n## Queue Status\n| ⬜ READY | 0 |");
  });

  afterEach(async () => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test("addTaskToQueue: Adds task with correct formatting", async () => {
    const queuePath = path.resolve(TEST_ROOT, "REFACTOR_QUEUE.md");

    const mockQueue = `# REFACTOR_QUEUE.md

## Queue Status

| Status | Count | Description |
|--------|-------|-------------|
| ⬜ READY | 0 | Available for processing |
| 🟡 IN_PROGRESS | 0 | Currently being worked on |
| ✅ DONE | 0 | Completed successfully |

## 📋 Phase 6: Organization & Integration

---

`;

    await fs.writeFile(queuePath, mockQueue);

    const protocol = createOrganizationalAutomationProtocol(undefined, TEST_ROOT);

    const task: RefactorTask = {
      title: "Test Task",
      phase: "Phase 6: Organization & Integration",
      effort: "30 min",
      risk: "Low",
      parallelSafe: true,
      instructions: "Test instructions",
      verifyCommand: "echo 'verified'"
    };

    const result = await protocol.addTaskToQueue(task);

    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();

    const content = await fs.readFile(queuePath, "utf-8");
    expect(content).toContain(result.taskId);
    expect(content).toContain("Test Task");
    expect(content).toContain("⬜ READY");
    expect(content).toContain("| ⬜ READY | 1 |");
  });

  test("addTaskToQueue: Handles missing queue file", async () => {
    const protocol = createOrganizationalAutomationProtocol(undefined, TEST_ROOT);

    const task: RefactorTask = {
      title: "Test Task",
      phase: "Phase 1",
      effort: "30 min",
      risk: "Low",
      parallelSafe: true,
      instructions: "Test instructions",
      verifyCommand: "echo 'verified'"
    };

    const result = await protocol.addTaskToQueue(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  test("addTaskToQueue: Creates new phase if needed", async () => {
    const queuePath = path.resolve(TEST_ROOT, "REFACTOR_QUEUE.md");

    const mockQueue = `# REFACTOR_QUEUE.md

## Queue Status
| ⬜ READY | 0 |

---

*This queue is maintained by Syntropy*
`;

    await fs.writeFile(queuePath, mockQueue);

    const protocol = createOrganizationalAutomationProtocol(undefined, TEST_ROOT);

    const task: RefactorTask = {
      title: "Test Task",
      phase: "Phase 7: New Phase",
      effort: "1 hour",
      risk: "Medium",
      parallelSafe: false,
      instructions: "Test instructions for new phase",
      verifyCommand: "test -f /tmp/test"
    };

    const result = await protocol.addTaskToQueue(task);

    expect(result.success).toBe(true);

    const content = await fs.readFile(queuePath, "utf-8");
    expect(content).toContain("## 📋 Phase 7: New Phase");
    expect(content).toContain("Test Task");
  });
});

describe("Organizational Automation Protocol - Full Protocol", () => {
  const continuityPath = path.join(TEST_ROOT, "CONTINUITY.md");
  const queuePath = path.join(TEST_ROOT, "REFACTOR_QUEUE.md");

  beforeEach(async () => {
    if (!existsSync(TEST_ROOT)) {
      mkdirSync(TEST_ROOT, { recursive: true });
    }
    await fs.writeFile(continuityPath, "");
    await fs.writeFile(queuePath, "# REFACTOR_QUEUE.md\n\n## Queue Status\n| ⬜ READY | 0 |");
  });

  afterEach(async () => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test("runFullProtocol: End-to-end automation", async () => {
    const continuityPath = path.resolve(TEST_ROOT, "CONTINUITY.md");
    const queuePath = path.resolve(TEST_ROOT, "REFACTOR_QUEUE.md");

    const mockContinuity = `# CONTINUITY.md

## Key Evolutionaries
- Economic: 79,014 sats
- Wisdom: 5 diary entries + 9 laws + 10 cycles = 24 wisdom artifacts
- Potential: 8 idea seeds + 13 refactoring opportunities
- Social: 100+ interactions

## Pending Tasks
- [ ] Idea: Automation idea 1
- [ ] Idea: Automation idea 2
- [ ] Idea: Automation idea 3

## Refactoring Opportunities
13 refactoring opportunities awaiting task generation.

`;

    const mockQueue = `# REFACTOR_QUEUE.md

## Queue Status
| ⬜ READY | 0 |
| ✅ DONE | 23 |

## 📋 Phase 6: Organization & Integration

---

`;

    await fs.writeFile(continuityPath, mockContinuity);
    await fs.writeFile(queuePath, mockQueue);

    const protocol = createOrganizationalAutomationProtocol({
      crisisThreshold: 2.0,
      maxTasksPerCrisis: 8
    }, TEST_ROOT);

    const result = await protocol.runFullProtocol();

    expect(result.entropyDetection.hasCrisis).toBe(true);
    expect(result.tasksGenerated).toBeGreaterThan(0);
    expect(result.tasksGenerated).toBeLessThanOrEqual(8);
    expect(result.tasksAdded).toBe(result.tasksGenerated);
    expect(result.tasksFailed).toBe(0);

    const queueContent = await fs.readFile(queuePath, "utf-8");
    expect(queueContent).toContain("⬜ READY");
    expect((queueContent.match(/⬜ READY/g) || []).length).toBe(result.tasksAdded);
  });

  test("runFullProtocol: No crisis, no tasks generated", async () => {
    const continuityPath = path.resolve(TEST_ROOT, "CONTINUITY.md");
    const queuePath = path.resolve(TEST_ROOT, "REFACTOR_QUEUE.md");

    const mockContinuity = `# CONTINUITY.md

## Key Evolutionaries
- Economic: 79,014 sats
- Wisdom: 5 diary entries
- Potential: 2 ideas

`;

    const mockQueue = `# REFACTOR_QUEUE.md

## Queue Status
| ⬜ READY | 25 |
| ✅ DONE | 50 |

## Tasks

### T050: Ready Task ⬜ READY

### T051: Another Ready Task ⬜ READY

### T052: Third Ready Task ⬜ READY

### T053: Fourth Ready Task ⬜ READY

### T054: Fifth Ready Task ⬜ READY

### T055: Sixth Ready Task ⬜ READY

### T056: Seventh Ready Task ⬜ READY

### T057: Eighth Ready Task ⬜ READY

### T058: Ninth Ready Task ⬜ READY

### T059: Tenth Ready Task ⬜ READY

### T060: Eleventh Ready Task ⬜ READY

### T061: Twelfth Ready Task ⬜ READY

### T062: Thirteenth Ready Task ⬜ READY

### T063: Fourteenth Ready Task ⬜ READY

### T064: Fifteenth Ready Task ⬜ READY

### T065: Sixteenth Ready Task ⬜ READY

### T066: Seventeenth Ready Task ⬜ READY

### T067: Eighteenth Ready Task ⬜ READY

### T068: Nineteenth Ready Task ⬜ READY

### T069: Twentieth Ready Task ⬜ READY

### T070: Twenty-First Ready Task ⬜ READY

### T071: Twenty-Second Ready Task ⬜ READY

### T072: Twenty-Third Ready Task ⬜ READY

### T073: Twenty-Fourth Ready Task ⬜ READY

### T074: Twenty-Fifth Ready Task ⬜ READY

### T075: Done Task 1 ✅ DONE

### T076: Done Task 2 ✅ DONE

### T077: Done Task 3 ✅ DONE

### T078: Done Task 4 ✅ DONE

### T079: Done Task 5 ✅ DONE

### T080: Done Task 6 ✅ DONE

### T081: Done Task 7 ✅ DONE

### T082: Done Task 8 ✅ DONE

### T083: Done Task 9 ✅ DONE

### T084: Done Task 10 ✅ DONE

### T085: Done Task 11 ✅ DONE

### T086: Done Task 12 ✅ DONE

### T087: Done Task 13 ✅ DONE

### T088: Done Task 14 ✅ DONE

### T089: Done Task 15 ✅ DONE

### T090: Done Task 16 ✅ DONE

### T091: Done Task 17 ✅ DONE

### T092: Done Task 18 ✅ DONE

### T093: Done Task 19 ✅ DONE

### T094: Done Task 20 ✅ DONE

### T095: Done Task 21 ✅ DONE

### T096: Done Task 22 ✅ DONE

### T097: Done Task 23 ✅ DONE

### T098: Done Task 24 ✅ DONE

### T099: Done Task 25 ✅ DONE

### T100: Done Task 26 ✅ DONE

### T101: Done Task 27 ✅ DONE

### T102: Done Task 28 ✅ DONE

### T103: Done Task 29 ✅ DONE

### T104: Done Task 30 ✅ DONE

### T105: Done Task 31 ✅ DONE

### T106: Done Task 32 ✅ DONE

### T107: Done Task 33 ✅ DONE

### T108: Done Task 34 ✅ DONE

### T109: Done Task 35 ✅ DONE

### T110: Done Task 36 ✅ DONE

### T111: Done Task 37 ✅ DONE

### T112: Done Task 38 ✅ DONE

### T113: Done Task 39 ✅ DONE

### T114: Done Task 40 ✅ DONE

### T115: Done Task 41 ✅ DONE

### T116: Done Task 42 ✅ DONE

### T117: Done Task 43 ✅ DONE

### T118: Done Task 44 ✅ DONE

### T119: Done Task 45 ✅ DONE

### T120: Done Task 46 ✅ DONE

### T121: Done Task 47 ✅ DONE

### T122: Done Task 48 ✅ DONE

### T123: Done Task 49 ✅ DONE

### T124: Done Task 50 ✅ DONE

`;

    await fs.writeFile(continuityPath, mockContinuity);
    await fs.writeFile(queuePath, mockQueue);

    const protocol = createOrganizationalAutomationProtocol({
      crisisThreshold: 2.0
    }, TEST_ROOT);

    const result = await protocol.runFullProtocol();

    expect(result.entropyDetection.hasCrisis).toBe(false);
    expect(result.tasksGenerated).toBe(0);
    expect(result.tasksAdded).toBe(0);
  });
});

describe("Organizational Automation Protocol - Configuration", () => {
  test("getConfig: Returns current configuration", () => {
    const protocol = createOrganizationalAutomationProtocol({
      crisisThreshold: 3.0,
      maxTasksPerCrisis: 10
    });

    const config = protocol.getConfig();

    expect(config.crisisThreshold).toBe(3.0);
    expect(config.maxTasksPerCrisis).toBe(10);
    expect(config.enabled).toBe(true);
  });

  test("updateConfig: Updates configuration", () => {
    const protocol = createOrganizationalAutomationProtocol();

    protocol.updateConfig({
      crisisThreshold: 5.0,
      enabled: false
    });

    const config = protocol.getConfig();

    expect(config.crisisThreshold).toBe(5.0);
    expect(config.enabled).toBe(false);
  });
});
