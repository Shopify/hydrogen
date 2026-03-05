// scripts/patch-cli.js
//
// Overwrites node_modules/@shopify/cli/bin/run.js so that `shopify hydrogen`
// subcommands are delegated to the local packages/cli source instead of the
// bundled plugin. The patch is version-agnostic (writes the full file rather
// than applying a diff) and idempotent.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only patch in local development, not CI
if (process.env.CI) process.exit(0);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUN_JS = resolve(
  ROOT,
  'node_modules',
  '@shopify',
  'cli',
  'bin',
  'run.js',
);

// Marker comment is how we detect if the patch has already been applied
const MARKER = '// [hydrogen-monorepo-patch]';

// Gets the @shopify/cli run.js from node_modules and then
// checks that file for our marker comment
// if it is there, it is patched, exit
const current = readFileSync(RUN_JS, 'utf8');
if (current.includes(MARKER)) process.exit(0); // already patched

const patched = `#!/usr/bin/env node
${MARKER}

process.removeAllListeners('warning')

// Only intercept "shopify hydrogen ..." commands when running inside
// the monorepo. Everything else falls through to the standard CLI.
let handled = false;

if (process.argv[2] === 'hydrogen') {
  const {existsSync} = await import('node:fs');
  const {resolve, dirname} = await import('node:path');
  const {pathToFileURL} = await import('node:url');

  // Walk up from cwd to find the monorepo's local CLI dev entry point
  // at packages/cli/bin/dev.js. This lets us run the locally-built
  // cli-hydrogen plugin instead of the one bundled in node_modules.
  let dir = process.cwd();

  while (true) {
    const candidate = resolve(dir, 'packages', 'cli', 'bin', 'dev.js');
    if (existsSync(candidate)) {
      // Found the monorepo's cli-hydrogen package — load it as the
      // oclif plugin so hydrogen commands run against local source.
      console.log('\\x1b[36m[hydrogen-monorepo] Using local cli-hydrogen plugin\\x1b[0m');
      const {execute} = await import('@oclif/core');
      await execute({dir: pathToFileURL(candidate).href});
      handled = true;
      break;
    }

    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
}

// Non-hydrogen command, or not in the monorepo — run the standard
// @shopify/cli entrypoint.
if (!handled) {
  const {default: runCLI} = await import('../dist/index.js');
  runCLI({development: false});
}
`;

writeFileSync(RUN_JS, patched);
