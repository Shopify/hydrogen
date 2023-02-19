import Command from '@shopify/cli-kit/node/base-command';
import {path} from '@shopify/cli-kit';
import Flags from '@oclif/core/lib/flags.js';
import {commonFlags} from '../../utils/flags.js';
import {isGitClean} from '../../utils/git.js';
import setupSeo from '../../setups/seo/seo.js';

import {AbortError} from '@shopify/cli-kit/node/error';

const SETUPS = ['seo', 'analytics', 'tailwind'];

// @ts-ignore
export default class Upgrade extends Command {
  static description = 'Apply steps to setup various components.';
  static flags = {
    path: commonFlags.path,
    force: commonFlags.force,
    silent: Flags.boolean({
      name: 'silent',
      description: `Don't print any output.`,
      env: 'SHOPIFY_HYDROGEN_FLAG_SILENT',
    }),
    dry: Flags.boolean({
      name: 'dry',
      description: `Don't actually make any changes.`,
      env: 'SHOPIFY_HYDROGEN_FLAG_DRY',
    }),
    diff: Flags.boolean({
      name: 'diff',
      description: `Show a diff of the changes.`,
      env: 'SHOPIFY_HYDROGEN_FLAG_DIFF',
    }),
  };

  static args = [
    {
      name: 'setup',
      description: `The setup to use.`,
      required: true,
      options: SETUPS,
      env: 'SHOPIFY_HYDROGEN_ARG_SETUP',
    },
  ];

  async run(): Promise<void> {
    const {flags, args} = await this.parse(Upgrade);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();
    // TODO: move to cli-kit
    const isClean = await isGitClean(directory);

    if (!flags.force && !flags.dry && !isClean) {
      throw new AbortError(
        `The current directory is not clean.`,
        `Please commit or stash your changes before running this command.`,
      );
    }

    let tasks;

    switch (args.setup) {
      case 'seo':
        tasks = await setupSeo(directory, flags);
        break;
      // case 'analytics':
      //   tasks = await setupAnalytics(directory, flags);
      //   break;
      default:
        throw new AbortError(`Unknown setup ${args.setup}`);
    }

    await tasks.run();
  }
}
