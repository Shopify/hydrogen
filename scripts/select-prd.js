#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Find all PRD/task pairs in the repository
function findPRDPairs() {
  // Find all PRD files in any docs/tasks directory
  const prdFiles = glob.sync('**/docs/tasks/prd-*.md', {
    ignore: ['node_modules/**', '.git/**'],
  });

  const pairs = [];

  for (const prdPath of prdFiles) {
    const basename = path.basename(prdPath);
    // Expected task file name pattern: tasks-prd-{name}.md
    const taskFileName = basename.replace('prd-', 'tasks-prd-');
    const taskPath = path.join(path.dirname(prdPath), taskFileName);

    // Check if corresponding task file exists
    if (fs.existsSync(taskPath)) {
      const stats = fs.statSync(taskPath);
      const name = basename.replace('prd-', '').replace('.md', '');

      pairs.push({
        name: name,
        prd: prdPath,
        tasks: taskPath,
        modified: stats.mtime,
        prdExists: true,
        tasksExists: true,
      });
    } else {
      // Include PRDs without task lists (might be new)
      const stats = fs.statSync(prdPath);
      const name = basename.replace('prd-', '').replace('.md', '');

      pairs.push({
        name: name,
        prd: prdPath,
        tasks: taskPath,
        modified: stats.mtime,
        prdExists: true,
        tasksExists: false,
      });
    }
  }

  // Sort by modification time (most recent first)
  return pairs.sort((a, b) => b.modified - a.modified);
}

// Load current configuration if it exists
function loadCurrentConfig() {
  const mdPath = path.join('.claude', 'current-prd.md');

  if (fs.existsSync(mdPath)) {
    try {
      const content = fs.readFileSync(mdPath, 'utf8');
      return parseMarkdownConfig(content);
    } catch (e) {
      console.error(
        `${colors.yellow}Warning: Could not parse existing config${colors.reset}`,
      );
      return null;
    }
  }

  return null;
}

// Parse Markdown config to extract current PRD info
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

  // Extract file paths (remove @ prefix for internal use)
  const prdMatch = lines.find((l) => l.includes('PRD:') && l.includes('@'));
  if (prdMatch) {
    config.current.prd = prdMatch.split('@')[1].trim();
  }

  const tasksMatch = lines.find((l) => l.includes('Tasks:') && l.includes('@'));
  if (tasksMatch) {
    config.current.tasks = tasksMatch.split('@')[1].trim();
    config.current.tasksExists = true;
  }

  return config;
}

// Save selected PRD/task pair to config
function saveSelection(selection) {
  const configDir = '.claude';
  const mdPath = path.join(configDir, 'current-prd.md');

  const now = new Date().toISOString();

  // Generate Markdown content
  const markdown = `# Current PRD Configuration

## Active PRD: ${selection.name}
Selected: ${now}

## Files to Read
- PRD: @${selection.prd}${
    selection.tasksExists
      ? `
- Tasks: @${selection.tasks}`
      : ''
  }
`;

  fs.writeFileSync(mdPath, markdown);

  return {
    current: {
      name: selection.name,
      prd: selection.prd,
      tasks: selection.tasks,
      tasksExists: selection.tasksExists,
    },
    selected_at: now,
  };
}

// Display menu and handle selection
async function selectPRD() {
  const pairs = findPRDPairs();
  const currentConfig = loadCurrentConfig();

  if (pairs.length === 0) {
    console.log(
      `${colors.yellow}No PRD/task pairs found in docs/tasks folders${colors.reset}`,
    );
    console.log(
      `${colors.gray}Create a PRD first using the appropriate cursor rule${colors.reset}`,
    );
    process.exit(0);
  }

  console.log(
    `\n${colors.bright}${colors.blue}Available PRD/Task Pairs:${colors.reset}\n`,
  );

  // Display options with numbers
  pairs.forEach((pair, index) => {
    const isCurrent = currentConfig?.current?.name === pair.name;
    const marker = isCurrent ? `${colors.green}► ${colors.reset}` : '  ';
    const status = pair.tasksExists
      ? `${colors.green}✓ Has tasks${colors.reset}`
      : `${colors.yellow}⚠ No tasks yet${colors.reset}`;
    const modifiedDate = pair.modified.toLocaleDateString();

    console.log(
      `${marker}${colors.bright}[${index + 1}]${colors.reset} ${colors.cyan}${pair.name}${colors.reset}`,
    );
    console.log(
      `      ${status} ${colors.gray}(modified: ${modifiedDate})${colors.reset}`,
    );
    console.log(`      ${colors.gray}PRD: ${pair.prd}${colors.reset}`);
    if (pair.tasksExists) {
      console.log(`      ${colors.gray}Tasks: ${pair.tasks}${colors.reset}`);
    }
    console.log();
  });

  // Simple prompt for selection
  process.stdout.write(
    `${colors.bright}Select PRD number (1-${pairs.length}):${colors.reset} `,
  );

  // Read user input
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const input = data.toString().trim();
      const selection = parseInt(input) - 1;

      if (selection >= 0 && selection < pairs.length) {
        const selected = pairs[selection];
        resolve(selected);
      } else {
        console.log(
          `${colors.yellow}Invalid selection. Please run the command again.${colors.reset}`,
        );
        process.exit(1);
      }
    });
  });
}

// Main function
async function main() {
  try {
    // Show current selection if any
    const currentConfig = loadCurrentConfig();
    if (currentConfig?.current) {
      console.log(
        `${colors.gray}Current PRD: ${currentConfig.current.name}${colors.reset}`,
      );
    }

    const selected = await selectPRD();

    // Save the selection
    saveSelection(selected);

    // Success message
    console.log(
      `\n${colors.green}${colors.bright}✅ Selected: ${selected.name}${colors.reset}`,
    );
    console.log(`   ${colors.gray}PRD: ${selected.prd}${colors.reset}`);
    if (selected.tasksExists) {
      console.log(`   ${colors.gray}Tasks: ${selected.tasks}${colors.reset}`);
    } else {
      console.log(
        `   ${colors.yellow}Note: No task list exists yet for this PRD${colors.reset}`,
      );
      console.log(
        `   ${colors.gray}Run the task generation cursor rule to create one${colors.reset}`,
      );
    }
    console.log(
      `\n${colors.gray}Configuration saved to .claude/current-prd.md${colors.reset}`,
    );

    process.exit(0);
  } catch (error) {
    console.error(
      `${colors.bright}${colors.yellow}Error:${colors.reset}`,
      error.message,
    );
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Selection cancelled${colors.reset}`);
  process.exit(0);
});

// Run if executed directly
if (require.main === module) {
  main();
}
