import {spawnSync} from 'node:child_process';
import type {Hook} from '@oclif/core';
import {outputDebug} from '@shopify/cli-kit/node/output';
import {isTruthy} from '@shopify/cli-kit/node/context/utilities';

const hook: Hook<'init'> = async function (options) {
  // Check if this is a Hydrogen command to avoid running this
  // hook for commands in other plugins such as themes or apps.
  if (!options.id?.startsWith('hydrogen:') || options.id === 'hydrogen:init') {
    return;
  }

  const separatorIndex = options.argv.indexOf('--');
  const argv =
    separatorIndex < 0 ? options.argv : options.argv.slice(0, separatorIndex);
  if (
    argv.some((arg) => ['--help', '-h', '--json-schema'].includes(arg)) ||
    isTruthy(process.env.SHOPIFY_FLAG_JSON_SCHEMA)
  )
    return;

  if (
    commandNeedsVM(options.id) &&
    !process.execArgv.includes(EXPERIMENTAL_VM_MODULES_FLAG) &&
    !(process.env.NODE_OPTIONS ?? '').includes(EXPERIMENTAL_VM_MODULES_FLAG)
  ) {
    outputDebug(
      `Restarting CLI process with ${EXPERIMENTAL_VM_MODULES_FLAG} flag.`,
    );

    const [command, ...args] = process.argv;
    args.unshift(EXPERIMENTAL_VM_MODULES_FLAG);

    const result = spawnSync(command!, args, {stdio: 'inherit'});

    // If we don't have a status we can assume that the process errored out
    process.exit(result.status ?? 1);
  }
};

const EXPERIMENTAL_VM_MODULES_FLAG = '--experimental-vm-modules';

function commandNeedsVM(id = '') {
  // All the commands that rely on MiniOxygen's Node sandbox:
  return id === 'hydrogen:debug:cpu';
}

export default hook;
