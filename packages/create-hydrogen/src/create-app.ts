#!/usr/bin/env node

import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runInit} from '@shopify/cli-hydrogen/commands/hydrogen/init';

/**
 * Parse --version flag from command line arguments
 * This allows: npm create @shopify/hydrogen -- --version 2025.1.3
 */
function parseVersion(): {version?: string; remainingArgs: string[]} {
  const args = process.argv.slice(2);
  const versionIndex = args.findIndex(
    (arg) => arg === '--version' || arg === '-v',
  );

  if (versionIndex === -1) {
    return {remainingArgs: args};
  }

  const version = args[versionIndex + 1];
  if (!version || version.startsWith('-')) {
    console.error(
      'Error: --version flag requires a value (e.g., --version 2025.1.3)',
    );
    process.exit(1);
  }

  // Remove version flags from args
  const remainingArgs = [...args];
  remainingArgs.splice(versionIndex, 2);

  return {version, remainingArgs};
}

let isReactError = false;
const reactErrorRE = /(useState|Invalid hook call)/gims;

const stdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = <typeof stdoutWrite>function (item, encoding, cb) {
  if (reactErrorRE.test(item?.toString() ?? '')) {
    isReactError = true;
  } else {
    stdoutWrite(item, encoding, cb);
  }
};

const stderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = <typeof stderrWrite>function (item, encoding, cb) {
  if (reactErrorRE.test(item?.toString() ?? '')) {
    isReactError = true;
  } else {
    stderrWrite(item, encoding, cb);
  }
};

process.on('beforeExit', () => {
  if (isReactError) {
    const randomTmpDir = join(tmpdir(), Math.random().toString(36).slice(2));
    const message =
      'There is a React version mismatch. If this command failed, try the following:\n\n' +
      `npm create @shopify/hydrogen@latest --legacy-peer-deps --cache ${randomTmpDir}` +
      '\n\nLearn more in https://github.com/Shopify/hydrogen/discussions/2055';

    console.warn('\n\x1b[30m\x1b[43m WARNING \x1b[0m', message);
  }
});

// Parse version and pass to init
const {version, remainingArgs} = parseVersion();

if (version) {
  // When version is specified, restore process.argv with remaining args
  // and pass version as an option
  const [node, script] = process.argv.slice(0, 2);
  process.argv = [node!, script!, ...remainingArgs];

  // Run init with version option - it will parse other flags internally
  runInit({version});
} else {
  // No version specified, let runInit handle everything as before
  runInit();
}
