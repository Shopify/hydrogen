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
  console.error(
    '[patch-cli] packages/cli must be built first. Run: pnpm build --filter=@shopify/cli-hydrogen',
  );
  process.exit(1);
}

const {applyPatch, getRunJsPath} = patchModule;
const runJsPath = getRunJsPath(ROOT);
const applied = applyPatch(runJsPath);
if (applied) console.log('[patch-cli] Patched run.js — local packages/cli will be used');
