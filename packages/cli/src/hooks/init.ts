import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import type {Hook} from '@oclif/core';
import {outputDebug, outputNewline} from '@shopify/cli-kit/node/output';
import {cwd, joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import {renderWarning} from '@shopify/cli-kit/node/ui';

const hook: Hook<'init'> = async function (options) {
  if (options.id === 'hydrogen:init') return;

  let projectPath = cwd();
  const pathFlagRE = /^--path($|=)/;
  const pathFlagIndex = options.argv.findIndex((arg) => pathFlagRE.test(arg));

  if (pathFlagIndex !== -1) {
    const pathFlagValue =
      options.argv[pathFlagIndex]?.split('=')[1] ??
      options.argv[pathFlagIndex + 1];

    if (pathFlagValue && !pathFlagValue.startsWith('--')) {
      projectPath = resolvePath(projectPath, pathFlagValue);
    }
  }

  if (!isHydrogenProject(projectPath)) {
    outputNewline();
    renderWarning({
      headline: `Looks like you're trying to run a Hydrogen command outside of a Hydrogen project.`,
      body: [
        'Run',
        {command: 'shopify hydrogen init'},
        'to create a new Hydrogen project or use the',
        {command: '--path'},
        'flag to specify an existing Hydrogen project.\n\n',
        {subdued: projectPath},
      ],
      reference: [
        'Getting started: https://shopify.dev/docs/storefronts/headless/hydrogen',
        'CLI commands: https://shopify.dev/docs/api/shopify-cli/hydrogen',
      ],
    });

    // Throwing errors here does not end the process:
    process.exit(1);
  }

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

    const result = spawnSync(command!, args, {stdio: 'inherit'});

    // If we don't have a status we can assume that the process errored out
    process.exit(result.status ?? 1);
  }
};

const EXPERIMENTAL_VM_MODULES_FLAG = '--experimental-vm-modules';

function commandNeedsVM(id = '', argv: string[] = []) {
  // All the commands that rely on MiniOxygen's Node sandbox:
  return (
    id === 'hydrogen:debug:cpu' ||
    (['hydrogen:dev', 'hydrogen:preview'].includes(id) &&
      argv.includes('--legacy-runtime'))
  );
}

function isHydrogenProject(projectPath: string) {
  try {
    const require = createRequire(import.meta.url);
    const {dependencies} = require(joinPath(projectPath, 'package.json'));
    return (
      !!dependencies['@shopify/hydrogen'] ||
      // Diff examples only have this package as a dependency
      !!dependencies['@shopify/cli-hydrogen']
    );
  } catch {
    return false;
  }
}

export default hook;
