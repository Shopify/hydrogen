import path from 'path';
import fs from 'fs/promises';
import {createRequire} from 'module';
import {spawnSync} from 'child_process';
import {output} from '@shopify/cli-kit';
import type {Hook} from '@oclif/core';

const EXPERIMENTAL_VM_MODULES_FLAG = '--experimental-vm-modules';

const hook: Hook<'init'> = async function (options) {
  if (isHydrogenV1()) {
    output.warn(
      `You are running a deprecated version of Hydrogen. Please upgrade to the latest version: https://hydrogen.shopify.dev`,
    );

    if (await tryPatchCliForH1()) return restartProcessWithFlags();
  }

  if (
    options.id &&
    ['hydrogen:dev', 'hydrogen:preview'].includes(options.id) &&
    !process.execArgv.includes(EXPERIMENTAL_VM_MODULES_FLAG) &&
    !(process.env.NODE_OPTIONS ?? '').includes(EXPERIMENTAL_VM_MODULES_FLAG)
  ) {
    output.debug(
      `Restarting CLI process with ${EXPERIMENTAL_VM_MODULES_FLAG} flag.`,
    );

    return restartProcessWithFlags();
  }
};

export default hook;

function restartProcessWithFlags() {
  const [command, ...args] = process.argv;
  args.unshift(EXPERIMENTAL_VM_MODULES_FLAG);

  spawnSync(command!, args, {stdio: 'inherit'});

  // This code should not be reached
  process.exit(0);
}

function isHydrogenV1() {
  const require = createRequire(import.meta.url);
  try {
    const {version} = require('@shopify/hydrogen/package.json');
    return version.startsWith('1.');
  } catch {
    return false;
  }
}

const OCLIF_MANIFEST_FILE = 'oclif.manifest.json';

async function tryPatchCliForH1() {
  const pkgPath = new URL('../..', import.meta.url).pathname;
  const pkgJsonPath = path.join(pkgPath, 'package.json');

  try {
    const pkgJson = await fs.readFile(pkgJsonPath, 'utf-8');
    if (pkgJson.includes('dist/v1/commands')) return false; // Already patched

    await fs.rename(
      path.join(pkgPath, OCLIF_MANIFEST_FILE),
      path.join(pkgPath, 'hydrogen2-' + OCLIF_MANIFEST_FILE),
    );

    await fs.rename(
      path.join(pkgPath, 'hydrogen1-' + OCLIF_MANIFEST_FILE),
      path.join(pkgPath, OCLIF_MANIFEST_FILE),
    );

    await fs.writeFile(
      pkgJsonPath,
      pkgJson.replace(`"dist/commands"`, `"dist/v1/commands"`),
      'utf-8',
    );

    return true;
  } catch (e: unknown) {
    const error = e as Error;
    error.message = 'Could not patch CLI for Hydrogen v1. ' + error.message;
    throw error;
  }
}
