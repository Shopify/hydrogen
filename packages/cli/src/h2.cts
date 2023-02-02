#!/usr/bin/env node

const path = require('path');
const {spawnSync} = require('child_process');

let cliPath: string;

try {
  cliPath = require.resolve('@shopify/cli/package.json', {
    paths: [process.cwd()],
  });
} catch (error: any) {
  if (error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
    cliPath = error.message.split(' ').pop();
  } else {
    throw error;
  }
}

if (!cliPath) {
  throw new Error('Could not find @shopify/cli');
}

cliPath = path.join(cliPath.replace(/package\.json$/, ''), 'bin', 'run.js');

const [, , ...args] = process.argv;

args.unshift('--experimental-vm-modules', cliPath, 'hydrogen');

spawnSync('node', args, {
  stdio: 'inherit',
  cwd: process.cwd(),
});
