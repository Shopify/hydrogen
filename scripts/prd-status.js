#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

// Load current configuration
function loadCurrentConfig() {
  const mdPath = path.join('.claude', 'current-prd.md');

  if (fs.existsSync(mdPath)) {
    try {
      const content = fs.readFileSync(mdPath, 'utf8');
      return parseMarkdownConfig(content);
    } catch (e) {
      console.error(
        `${colors.red}Error: Could not parse config file${colors.reset}`,
      );
      console.error(e.message);
      process.exit(1);
    }
  }

  return null;
}

// Parse Markdown config
function parseMarkdownConfig(content) {
  const lines = content.split('\n');
  const config = {current: {}};

  // Extract active PRD name
  const activeMatch = lines.find((l) => l.startsWith('## Active PRD:'));
  if (activeMatch) {
    config.current.name = activeMatch.replace('## Active PRD:', '').trim();
  }

  // Extract selected date
  const selectedMatch = lines.find((l) => l.startsWith('Selected:'));
  if (selectedMatch) {
    config.selected_at = selectedMatch.replace('Selected:', '').trim();
  }

  // Extract file paths (remove @ prefix)
  const prdMatch = lines.find((l) => l.includes('PRD:') && l.includes('@'));
  if (prdMatch) {
    config.current.prd = prdMatch.split('@')[1].trim();
  }

  const tasksMatch = lines.find((l) => l.includes('Tasks:') && l.includes('@'));
  if (tasksMatch) {
    config.current.tasks = tasksMatch.split('@')[1].trim();
    config.current.tasksExists = true;
  } else {
    config.current.tasksExists = false;
  }

  return config;
}

// Count tasks in a task file
function countTasks(taskPath) {
  if (!fs.existsSync(taskPath)) {
    return {total: 0, completed: 0, pending: 0};
  }

  const content = fs.readFileSync(taskPath, 'utf8');
  const lines = content.split('\n');

  let total = 0;
  let completed = 0;

  for (const line of lines) {
    // Match task checkboxes
    const uncheckedMatch = line.match(/^\s*-\s*\[\s*\]/);
    const checkedMatch = line.match(/^\s*-\s*\[x\]/i);

    if (uncheckedMatch) {
      total++;
    } else if (checkedMatch) {
      total++;
      completed++;
    }
  }

  return {
    total,
    completed,
    pending: total - completed,
  };
}

// Get file size in KB
function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) {
    return 'N/A';
  }
  const stats = fs.statSync(filePath);
  const sizeInKB = (stats.size / 1024).toFixed(1);
  return `${sizeInKB} KB`;
}

// Get relative time string
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

// Extract task list from task file
function extractTaskList(taskPath) {
  if (!fs.existsSync(taskPath)) {
    return null;
  }

  const content = fs.readFileSync(taskPath, 'utf8');
  const lines = content.split('\n');

  // Find where tasks section starts
  const taskStartIndex = lines.findIndex((line) => line.trim() === '## Tasks');
  if (taskStartIndex === -1) {
    return null;
  }

  // Extract from ## Tasks to the end of file
  const taskLines = lines.slice(taskStartIndex);
  return taskLines.join('\n');
}

// Main status display
function showStatus(showFull = false) {
  const config = loadCurrentConfig();

  console.log(
    `\n${colors.bright}${colors.blue}PRD/Task Status${colors.reset}\n`,
  );

  if (!config || !config.current) {
    console.log(`${colors.yellow}No PRD currently selected${colors.reset}`);
    console.log(
      `${colors.gray}Run 'npm run prd:select' to choose a PRD${colors.reset}\n`,
    );
    return;
  }

  const {current} = config;

  // Display current PRD info
  console.log(
    `${colors.bright}Current PRD:${colors.reset} ${colors.cyan}${current.name}${colors.reset}`,
  );
  console.log(
    `${colors.gray}Selected: ${getRelativeTime(config.selected_at)}${colors.reset}\n`,
  );

  // File paths
  console.log(`${colors.bright}Files:${colors.reset}`);
  console.log(
    `  PRD:   ${current.prd} ${colors.gray}(${getFileSize(current.prd)})${colors.reset}`,
  );

  if (current.tasksExists) {
    console.log(
      `  Tasks: ${current.tasks} ${colors.gray}(${getFileSize(current.tasks)})${colors.reset}`,
    );
  } else {
    console.log(
      `  Tasks: ${colors.yellow}No task list exists yet${colors.reset}`,
    );
    console.log(
      `         ${colors.gray}Run the task generation cursor rule to create one${colors.reset}`,
    );
  }

  // Task progress - always calculate dynamically
  if (current.tasksExists) {
    const taskStats = countTasks(current.tasks);

    if (taskStats.total > 0) {
      const percentage = Math.round(
        (taskStats.completed / taskStats.total) * 100,
      );
      const progressBar = createProgressBar(percentage, 30);

      console.log(`\n${colors.bright}Progress:${colors.reset}`);
      console.log(`  ${progressBar} ${percentage}%`);
      console.log(
        `  ${colors.green}✓ Completed:${colors.reset} ${taskStats.completed}`,
      );
      console.log(
        `  ${colors.yellow}○ Pending:${colors.reset}   ${taskStats.pending}`,
      );
      console.log(
        `  ${colors.gray}─ Total:${colors.reset}     ${taskStats.total}`,
      );
    }
  }

  // Show full task list if requested
  if (showFull && current.tasksExists) {
    const taskList = extractTaskList(current.tasks);
    if (taskList) {
      console.log(`\n${colors.gray}${'─'.repeat(60)}${colors.reset}`);
      console.log(`\n${colors.bright}Full Task List:${colors.reset}\n`);
      console.log(taskList);
    }
  }

  console.log();
}

// Create a visual progress bar
function createProgressBar(percentage, width) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const filledChar = '█';
  const emptyChar = '░';

  const bar =
    colors.green +
    filledChar.repeat(filled) +
    colors.gray +
    emptyChar.repeat(empty) +
    colors.reset;

  return bar;
}

// Run if executed directly
if (require.main === module) {
  // Check for --full flag
  const args = process.argv.slice(2);
  const showFull = args.includes('--full');
  showStatus(showFull);
}
