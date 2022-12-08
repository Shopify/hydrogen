import type {Hook} from '@oclif/core';
import {spawnSync} from 'child_process';
import {output} from '@shopify/cli-kit';

const EXPERIMENTAL_VM_MODULES_FLAG = '--experimental-vm-modules';

const hook: Hook<'init'> = async function (options) {
  if (
    !options.id ||
    !['hydrogen:dev', 'hydrogen:preview'].includes(options.id)
  ) {
    return;
  }

  if (
    !process.execArgv.includes(EXPERIMENTAL_VM_MODULES_FLAG) &&
    !(process.env.NODE_OPTIONS ?? '').includes(EXPERIMENTAL_VM_MODULES_FLAG)
  ) {
    output.debug(
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
