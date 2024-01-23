import {spawnSync} from 'child_process';
import {outputDebug} from '@shopify/cli-kit/node/output';
import type {Hook} from '@oclif/core';

const EXPERIMENTAL_VM_MODULES_FLAG = '--experimental-vm-modules';

function commandNeedsVM(id = '', argv: string[] = []) {
  // All the commands that rely on MiniOxygen's Node sandbox:
  return (
    'hydrogen:debug:cpu' ||
    (['hydrogen:dev', 'hydrogen:preview'].includes(id) &&
      argv.includes('--legacy-runtime'))
  );
}

const hook: Hook<'init'> = async function (options) {
  if (
    commandNeedsVM(options.id, options.argv) &&
    !process.execArgv.includes(EXPERIMENTAL_VM_MODULES_FLAG) &&
    !(process.env.NODE_OPTIONS ?? '').includes(EXPERIMENTAL_VM_MODULES_FLAG)
  ) {
    outputDebug(
      `Restarting CLI process with ${EXPERIMENTAL_VM_MODULES_FLAG} flag.`,
    );

    const [command, ...args] = process.argv;
    args.unshift(EXPERIMENTAL_VM_MODULES_FLAG);

    spawnSync(command!, args, {stdio: 'inherit'});

    // This code should not be reached
    process.exit(0);
  }
};

export default hook;
