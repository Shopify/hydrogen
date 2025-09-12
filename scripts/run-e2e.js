#!/usr/bin/env node

/**
 * E2E test runner script that handles custom flags
 * Supports: --smoke, --headed, --matrix flags
 */

const {spawn} = require('child_process');

const args = process.argv.slice(2);
const env = {...process.env};
const playwrightArgs = [];

// Parse custom flags
let smokeMode = false;
let headedMode = false;
let matrixMode = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--smoke') {
    smokeMode = true;
  } else if (arg === '--headed') {
    headedMode = true;
  } else if (arg.startsWith('--matrix=')) {
    matrixMode = arg.split('=')[1];
  } else if (arg === '--matrix' && i + 1 < args.length) {
    matrixMode = args[++i];
  } else {
    // Pass through other args to Playwright
    playwrightArgs.push(arg);
  }
}

// Set environment variables based on flags
if (smokeMode) {
  env.SMOKE_TEST = 'true';
}

if (matrixMode) {
  env.MATRIX_MODE = matrixMode;
}

// Add headed flag to Playwright args if needed
if (headedMode) {
  playwrightArgs.push('--headed');
}

// Run Playwright with configured environment and args
const child = spawn('npx', ['playwright', 'test', ...playwrightArgs], {
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code);
});
