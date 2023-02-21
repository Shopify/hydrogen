#!/usr/bin/env node

const path = require('path');
const {spawnSync} = require('child_process');

let cliPath: string | undefined;

try {
  cliPath = require.resolve('@shopify/cli/package.json', {
    paths: [process.cwd()],
  });
} catch (error: any) {
  if (error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
    cliPath = error.message.split(' ').pop();
  }
}

if (!cliPath) {
  throw new Error('Could not find a local installation of @shopify/cli');
}

cliPath = path.join(
  cliPath.replace(/package\.json$/, ''),
  'bin',
  'run.js',
) as string;

const [, , ...args] = process.argv;

const shortcuts = {
  g: ['generate'],
  gr: ['generate', 'route'],
} as Record<string, string[]>;

const expanded = shortcuts[args[0]!];
if (expanded) {
  args.splice(0, 1, ...expanded);
}

args.unshift(cliPath, 'hydrogen');

spawnSync('node', args, {
  stdio: 'inherit',
  cwd: process.cwd(),
});
