// scripts/unpatch-cli.mjs
//
// Restores node_modules/@shopify/cli/bin/run.js to its original content,
// undoing the patch applied by patch-cli.mjs. Idempotent.

import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUN_JS = resolve(
  ROOT,
  'node_modules',
  '@shopify',
  'cli',
  'bin',
  'run.js',
);

const MARKER = '// [hydrogen-monorepo-patch]';

const current = readFileSync(RUN_JS, 'utf8');
if (!current.includes(MARKER)) process.exit(0); // already unpatched

const original = `#!/usr/bin/env node
const {default: runCLI} = await import('../dist/index.js');
runCLI({development: false});
`;

writeFileSync(RUN_JS, original);
