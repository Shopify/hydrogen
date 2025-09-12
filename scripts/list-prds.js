#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
};

// Load current configuration
function loadCurrentConfig() {
  const configPath = path.join('.claude', 'current-prd.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Count tasks in a task file
function countTasks(taskPath) {
  if (!fs.existsSync(taskPath)) {
    return {total: 0, completed: 0};
  }

  const content = fs.readFileSync(taskPath, 'utf8');
  const lines = content.split('\n');

  let total = 0;
  let completed = 0;

  for (const line of lines) {
    const uncheckedMatch = line.match(/^\s*-\s*\[\s*\]/);
    const checkedMatch = line.match(/^\s*-\s*\[x\]/i);

    if (uncheckedMatch) {
      total++;
    } else if (checkedMatch) {
      total++;
      completed++;
    }
  }

  return {total, completed};
}

// Find all PRD/task pairs
function findAllPRDs() {
  const prdFiles = glob.sync('**/docs/tasks/prd-*.md', {
    ignore: ['node_modules/**', '.git/**'],
  });

  const pairs = [];

  for (const prdPath of prdFiles) {
    const basename = path.basename(prdPath);
    const taskFileName = basename.replace('prd-', 'tasks-prd-');
    const taskPath = path.join(path.dirname(prdPath), taskFileName);
    const name = basename.replace('prd-', '').replace('.md', '');

    const prdStats = fs.statSync(prdPath);
    const tasksExist = fs.existsSync(taskPath);

    let taskInfo = {total: 0, completed: 0};
    if (tasksExist) {
      taskInfo = countTasks(taskPath);
    }

    pairs.push({
      name,
      prd: prdPath,
      tasks: taskPath,
      tasksExist,
      modified: prdStats.mtime,
      taskInfo,
    });
  }

  return pairs.sort((a, b) => b.modified - a.modified);
}

// Main list function
function listPRDs() {
  const config = loadCurrentConfig();
  const currentName = config?.current?.name;

  console.log(
    `\n${colors.bright}${colors.blue}All PRD/Task Pairs${colors.reset}\n`,
  );

  const pairs = findAllPRDs();

  if (pairs.length === 0) {
    console.log(
      `${colors.yellow}No PRDs found in docs/tasks folders${colors.reset}`,
    );
    console.log(
      `${colors.gray}Create a PRD using the appropriate cursor rule${colors.reset}\n`,
    );
    return;
  }

  // Summary
  const totalPRDs = pairs.length;
  const withTasks = pairs.filter((p) => p.tasksExist).length;
  const totalTasks = pairs.reduce((sum, p) => sum + p.taskInfo.total, 0);
  const completedTasks = pairs.reduce(
    (sum, p) => sum + p.taskInfo.completed,
    0,
  );

  console.log(
    `${colors.gray}Found ${totalPRDs} PRD${totalPRDs !== 1 ? 's' : ''}, ${withTasks} with task lists${colors.reset}`,
  );
  if (totalTasks > 0) {
    console.log(
      `${colors.gray}Total progress: ${completedTasks}/${totalTasks} tasks completed (${Math.round((completedTasks / totalTasks) * 100)}%)${colors.reset}`,
    );
  }
  console.log();

  // List each PRD
  pairs.forEach((pair, index) => {
    const isCurrent = currentName === pair.name;
    const marker = isCurrent ? `${colors.green}►${colors.reset} ` : '  ';
    const num = `${colors.gray}[${index + 1}]${colors.reset}`;

    console.log(`${marker}${num} ${colors.cyan}${pair.name}${colors.reset}`);

    // Status indicators
    const indicators = [];

    if (isCurrent) {
      indicators.push(`${colors.green}current${colors.reset}`);
    }

    if (pair.tasksExist) {
      const {total, completed} = pair.taskInfo;
      if (total > 0) {
        const percentage = Math.round((completed / total) * 100);
        if (percentage === 100) {
          indicators.push(`${colors.green}✓ complete${colors.reset}`);
        } else if (percentage > 0) {
          indicators.push(`${colors.yellow}${percentage}% done${colors.reset}`);
        } else {
          indicators.push(`${colors.gray}not started${colors.reset}`);
        }
        indicators.push(
          `${colors.gray}${completed}/${total} tasks${colors.reset}`,
        );
      } else {
        indicators.push(`${colors.green}✓ has tasks${colors.reset}`);
      }
    } else {
      indicators.push(`${colors.yellow}no tasks${colors.reset}`);
    }

    // Modified date
    const modDate = pair.modified.toLocaleDateString();
    indicators.push(`${colors.gray}${modDate}${colors.reset}`);

    console.log(`     ${indicators.join(' · ')}`);
    console.log(`     ${colors.gray}${pair.prd}${colors.reset}`);
    console.log();
  });

  // Commands hint
  console.log(`${colors.gray}Commands:${colors.reset}`);
  console.log(
    `  ${colors.gray}npm run prd:select  - Select a PRD to work on${colors.reset}`,
  );
  console.log(
    `  ${colors.gray}npm run prd:status  - Show current PRD status${colors.reset}`,
  );
  console.log();
}

// Run if executed directly
if (require.main === module) {
  try {
    listPRDs();
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}
