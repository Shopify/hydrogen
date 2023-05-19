import {resolvePath} from '@shopify/cli-kit/node/path';
import {commonFlags} from '../../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {Args} from '@oclif/core';
import {getRemixConfig} from '../../../lib/config.js';
import {setupTailwind} from '../../../lib/setups/css-tailwind.js';

const STRATEGIES = ['tailwind' /*'css-modules', 'vanilla-extract'*/];

export default class SetupCSS extends Command {
  static description = 'Setup CSS strategies for your project.';

  static hidden = true;

  static flags = {
    path: commonFlags.path,
    force: commonFlags.force,
  };

  static args = {
    strategy: Args.string({
      name: 'strategy',
      description: `The CSS strategy to setup. One of ${STRATEGIES.join()}`,
      required: true,
      options: STRATEGIES,
    }),
  };

  async run(): Promise<void> {
    const {
      flags,
      args: {strategy},
    } = await this.parse(SetupCSS);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runSetupCSS({strategy, directory});
  }
}

export async function runSetupCSS({
  strategy,
  directory,
  force = false,
}: {
  strategy: string;
  directory: string;
  force?: boolean;
}) {
  const remixConfig = await getRemixConfig(directory);

  switch (strategy) {
    case 'tailwind':
      await setupTailwind({remixConfig, force});
      break;
    default:
      throw new Error('Unknown strategy');
  }
}
