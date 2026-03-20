#!/usr/bin/env node
// scripts/patch-cli.mjs
//
// Patches @shopify/cli/bin/run.js to load local packages/cli source.
// Requires packages/cli to be built first (pnpm build).

if (process.env.CI) process.exit(0);

import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let patchModule;
try {
  patchModule = await import('../packages/cli/dist/lib/patch-cli.js');
} catch {
  console.warn(
    '[patch-cli] Skipping - packages/cli not built yet.',
  );
  process.exit(0);
}

try {
  const {applyPatch, getRunJsPath} = patchModule;
  const runJsPath = getRunJsPath(ROOT);
  const applied = applyPatch(runJsPath);
  if (applied) console.log('[patch-cli] Patched run.js — local packages/cli will be used');
} catch (err) {
  if (err instanceof Error && err.message.includes('@shopify/cli is not installed')) {
    console.warn('[patch-cli] Skipping - @shopify/cli not installed yet.');
    process.exit(0);
  }
  throw err;
}
