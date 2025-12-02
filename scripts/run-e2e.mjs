#!/usr/bin/env node

/**
 * E2E test runner script that handles custom flags
 * Supports: --smoke, --headed, --matrix, --port flags
 */

import {spawn} from 'child_process';

// Parse arguments into custom flags and playwright args
function parseArgs(args) {
  const customFlags = {
    smoke: false,
    headed: false,
    matrix: null,
    port: null,
  };
  const playwrightArgs = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--smoke') {
      customFlags.smoke = true;
    } else if (arg === '--headed') {
      customFlags.headed = true;
    } else if (arg.startsWith('--matrix=')) {
      customFlags.matrix = arg.split('=')[1];
    } else if (arg === '--matrix') {
      customFlags.matrix = args[++i];
    } else if (arg.startsWith('--port=')) {
      customFlags.port = arg.split('=')[1];
    } else if (arg === '--port') {
      customFlags.port = args[++i];
    } else {
      playwrightArgs.push(arg);
    }
  }

  return {customFlags, playwrightArgs};
}

// Build environment variables from custom flags
function buildEnv(customFlags) {
  const env = {...process.env};

  if (customFlags.smoke) env.SMOKE_TEST = 'true';
  if (customFlags.matrix) env.MATRIX_MODE = customFlags.matrix;
  if (customFlags.port) env.E2E_PORT = customFlags.port;

  return env;
}

// Main execution
const {customFlags, playwrightArgs} = parseArgs(process.argv.slice(2));

// Add --headed to playwright args if needed
if (customFlags.headed) {
  playwrightArgs.push('--headed');
}

// Run Playwright with configured environment and args
const child = spawn('npx', ['playwright', 'test', ...playwrightArgs], {
  env: buildEnv(customFlags),
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code));
