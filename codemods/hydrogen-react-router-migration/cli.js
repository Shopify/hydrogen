#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const transformPath = path.join(__dirname, 'transform.js');

// Check if any files/directories were provided
if (args.length === 0 || args.every(arg => arg.startsWith('-'))) {
  console.error('Error: You must provide at least one file or directory to transform.');
  console.error('Usage: node cli.js [options] <file/directory>...');
  console.error('Example: node cli.js app/root.tsx');
  process.exit(1);
}

// Extract files/directories (non-flag arguments)
const paths = args.filter(arg => !arg.startsWith('-'));
const flags = args.filter(arg => arg.startsWith('-'));

// Verify all paths exist
for (const p of paths) {
  const resolvedPath = path.resolve(p);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Path does not exist: ${resolvedPath}`);
    process.exit(1);
  }
}

// Build the jscodeshift command
const jscodeshiftCmd = [
  'npx',
  'jscodeshift',
  '-t', transformPath,
  '--parser=tsx',
  ...flags,
  ...paths
].join(' ');

console.log('Running codemod...');
console.log('Command:', jscodeshiftCmd);

try {
  execSync(jscodeshiftCmd, { stdio: 'inherit' });
} catch (error) {
  console.error('Codemod execution failed');
  process.exit(1);
}