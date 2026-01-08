#!/usr/bin/env node
/**
 * Verification script for REFACTOR_QUEUE.md and REFACTOR_ARCHIVE.md sync
 * Checks for:
 * - Tasks marked DONE in queue but not in archive
 * - Tasks marked IN_PROGRESS but not actually running
 */

import fs from 'fs';
import path from 'path';

const QUEUE_FILE = '/pixel/REFACTOR_QUEUE.md';
const ARCHIVE_FILE = '/pixel/REFACTOR_ARCHIVE.md';

function extractTasksFromQueue(content) {
  const lines = content.split('\n');
  const tasks = {};

  lines.forEach((line, index) => {
    // Match task headers like "### T044: Implement Worker Visibility Layer for Async Builds ✅ DONE"
    const match = line.match(/^### (T\d+):\s+([^\n]+)\s+(⬜ READY|🟡 IN_PROGRESS|✅ DONE|❌ FAILED|⏸️ BLOCKED)/);
    if (match) {
      const taskId = match[1];
      const title = match[2];
      const status = match[3];
      tasks[taskId] = { title, status, lineNumber: index + 1 };
    }
  });

  return tasks;
}

function extractTasksFromArchive(content) {
  const lines = content.split('\n');
  const tasks = {};

  lines.forEach((line, index) => {
    // Match archive table rows like "| **T044** | ✅ DONE | Implement Worker Visibility Layer..."
    const match = line.match(/^\|\s+\*\*(T\d+)\*\*\s+\|\s+(✅ DONE|❌ FAILED)\s+\|\s+([^\n]+)/);
    if (match) {
      const taskId = match[1];
      const status = match[2];
      const title = match[3];
      tasks[taskId] = { title, status, lineNumber: index + 1 };
    }
  });

  return tasks;
}

function main() {
  console.log('Checking REFACTOR_QUEUE.md and REFACTOR_ARCHIVE.md sync...\n');

  if (!fs.existsSync(QUEUE_FILE)) {
    console.error(`❌ Queue file not found: ${QUEUE_FILE}`);
    process.exit(1);
  }

  if (!fs.existsSync(ARCHIVE_FILE)) {
    console.error(`❌ Archive file not found: ${ARCHIVE_FILE}`);
    process.exit(1);
  }

  const queueContent = fs.readFileSync(QUEUE_FILE, 'utf8');
  const archiveContent = fs.readFileSync(ARCHIVE_FILE, 'utf8');

  const queueTasks = extractTasksFromQueue(queueContent);
  const archiveTasks = extractTasksFromArchive(archiveContent);

  let issues = 0;

  // Check for tasks marked DONE in queue but not in archive
  console.log('📊 Checking DONE tasks in queue...');
  Object.entries(queueTasks).forEach(([taskId, task]) => {
    if (task.status === '✅ DONE' && !archiveTasks[taskId]) {
      console.log(`  ❌ ${taskId} (${task.title}) is DONE in queue but not in archive`);
      issues++;
    } else if (task.status === '✅ DONE' && archiveTasks[taskId]) {
      console.log(`  ✅ ${taskId} is properly synced`);
    }
  });

  // Check for tasks marked IN_PROGRESS
  console.log('\n📊 Checking IN_PROGRESS tasks in queue...');
  Object.entries(queueTasks).forEach(([taskId, task]) => {
    if (task.status === '🟡 IN_PROGRESS') {
      console.log(`  ⚠️  ${taskId} (${task.title}) is IN_PROGRESS - verify worker is running`);
      issues++;
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  if (issues === 0) {
    console.log('✅ No sync issues found');
    console.log(`   Queue tasks: ${Object.keys(queueTasks).length}`);
    console.log(`   Archive tasks: ${Object.keys(archiveTasks).length}`);
    process.exit(0);
  } else {
    console.log(`❌ Found ${issues} issue(s)`);
    process.exit(1);
  }
}

main();
