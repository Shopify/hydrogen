#!/usr/bin/env node
// scripts/unpatch-cli.mjs
//
// Restores @shopify/cli/bin/run.js to its original content.

import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let patchModule;
try {
  patchModule = await import('../packages/cli/dist/lib/patch-cli.js');
} catch {
  console.error(
    '[unpatch-cli] packages/cli must be built first. Run: pnpm build --filter=@shopify/cli-hydrogen',
  );
  process.exit(1);
}

const {removePatch, getRunJsPath} = patchModule;
const runJsPath = getRunJsPath(ROOT);
const removed = removePatch(runJsPath);
if (removed) console.log('[unpatch-cli] Restored original run.js');
else console.log('[unpatch-cli] Nothing to unpatch - run.js is not patched');
