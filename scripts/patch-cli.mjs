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

// --- Monorepo detection ---
// Walk up from cwd to find the hydrogen monorepo root.
// We look for packages/cli/package.json — if it exists, we know we're
// inside the monorepo and should load the local @shopify/cli-hydrogen
const {existsSync} = await import('node:fs');
const {resolve, dirname} = await import('node:path');

let monorepoRoot = null;
let dir = process.cwd();
while (true) {
  const candidate = resolve(dir, 'packages', 'cli', 'package.json');
  if (existsSync(candidate)) {
    monorepoRoot = dir;
    break;
  }
  const parent = dirname(dir);
  if (parent === dir) break; // reached filesystem root
  dir = parent;
}

if (monorepoRoot) {
  // We're in the hydrogen monorepo. Start @shopify/cli normally but
  // inject pluginAdditions so oclif loads @shopify/cli-hydrogen from
  // the monorepo's workspace (packages/cli) instead of the version
  // bundled inside @shopify/cli/dist.
  //
  // This uses the same pluginAdditions mechanism that ShopifyConfig
  // uses internally
  const {fileURLToPath} = await import('node:url');
  const {Config, run, flush} = await import('@oclif/core');

  // root must point to @shopify/cli's installed location so oclif
  // can find its package.json, oclif config, and bundled commands.
  const cliRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

  const c = '\\x1b[38;5;209m';
  const d = '\\x1b[2m';
  const r = '\\x1b[0m';
  console.log('');
  console.log(c + '  \u250C\u2500\u2500 hydrogen-monorepo \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510' + r);
  console.log(c + '  \u2502' + r + '                                                          ' + c + '\u2502' + r);
  console.log(c + '  \u2502' + r + '  Using local cli-hydrogen plugin from packages/cli       ' + c + '\u2502' + r);
  console.log(c + '  \u2502' + r + d + '  Bundled commands replaced with local source             ' + r + c + '\u2502' + r);
  console.log(c + '  \u2502' + r + '                                                          ' + c + '\u2502' + r);
  console.log(c + '  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518' + r);
  console.log('');

  // Tell ShopifyConfig to skip its own monorepo detection since we
  // are handling pluginAdditions ourselves.
  process.env.IGNORE_HYDROGEN_MONOREPO = '1';

  const config = new Config({
    root: cliRoot,
    // pluginAdditions tells oclif's plugin loader to read the
    // monorepo root's package.json, find @shopify/cli-hydrogen in
    // its dependencies (workspace:*), and load that as a core plugin.
    // Because workspace:* symlinks to packages/cli, oclif loads the
    // local source code — exactly what we want for development.
    pluginAdditions: {
      core: ['@shopify/cli-hydrogen'],
      path: monorepoRoot,
    },
    // Skip the oclif manifest cache so commands are loaded fresh from
    // disk rather than from a potentially stale oclif.manifest.json.
    ignoreManifest: true,
  });

  await config.load();

  // --- Post-load command replacement ---
  // After loading, both the bundled hydrogen commands (from @shopify/cli's
  // root plugin) and the local ones (from pluginAdditions) are registered.
  // Since oclif v3.83.0, determinePriority is no longer an overridable
  // instance method, so we manually replace the bundled commands with
  // the external plugin's versions using oclif's private _commands Map.
  const externalPlugin = Array.from(config.plugins.values()).find(
    (p) => p.name === '@shopify/cli-hydrogen' && !p.isRoot,
  );

  if (externalPlugin) {
    const cmds = config._commands;
    if (!cmds || !(cmds instanceof Map)) {
      console.warn('[hydrogen-monorepo] Cannot replace bundled commands: oclif internals changed');
    } else {
      // Delete bundled hydrogen commands (canonical IDs + aliases + hidden aliases)
      for (const command of externalPlugin.commands) {
        if (!command.id.startsWith('hydrogen')) continue;
        cmds.delete(command.id);
        for (const alias of [...(command.aliases ?? []), ...(command.hiddenAliases ?? [])]) {
          cmds.delete(alias);
        }
      }
      // Re-insert commands from the local plugin. loadCommands handles
      // alias registration and command permutations correctly.
      config.loadCommands(externalPlugin);
    }
  }

  await run(process.argv.slice(2), config);
  await flush();
} else {
  // Not in the monorepo — run the standard @shopify/cli entrypoint.
  const {default: runCLI} = await import('../dist/index.js');
  runCLI({development: false});
}
`;

writeFileSync(RUN_JS, patched);
