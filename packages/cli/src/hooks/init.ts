import {spawnSync} from 'node:child_process';
import type {Hook} from '@oclif/core';
import {outputDebug, outputNewline} from '@shopify/cli-kit/node/output';
import {cwd, resolvePath} from '@shopify/cli-kit/node/path';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import {AbortError, handler} from '@shopify/cli-kit/node/error';
import {jsonOutputEnabled} from '@shopify/cli-kit/node/environment';
import {isTruthy} from '@shopify/cli-kit/node/context/utilities';
import {
  applyHydrogenCommandPolicy,
  isHydrogenProject,
} from '../lib/hydrogen-command-policy.js';

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
  ) {
    return;
  }

  let projectPath = cwd();
  const pathFlagIndex = argv.findIndex((arg) => /^--path($|=)/.test(arg));
  if (pathFlagIndex !== -1) {
    const pathFlagValue =
      argv[pathFlagIndex]?.split('=')[1] ?? argv[pathFlagIndex + 1];
    if (pathFlagValue && !pathFlagValue.startsWith('--')) {
      projectPath = resolvePath(projectPath, pathFlagValue);
    }
  }

  if (!isHydrogenProject(projectPath)) {
    const headline =
      "Looks like you're trying to run a Hydrogen command outside of a Hydrogen project.";
    if (jsonOutputEnabled()) {
      // Init hooks run before the command's error handler. Render and flush
      // the standard JSON error before exiting so execution cannot continue.
      await handler(
        new AbortError(
          headline,
          'Run `shopify hydrogen init` to create a new Hydrogen project or use the `--path` flag to specify an existing Hydrogen project.',
        ),
      );
    } else {
      outputNewline();
      renderWarning({
        headline,
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
    }
    process.exit(1);
  }

  if (await applyHydrogenCommandPolicy({id: options.id, projectPath})) {
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
  return id === 'hydrogen:debug:cpu';
}

export default hook;
