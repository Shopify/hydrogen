import Command from '@shopify/cli-kit/node/base-command';
import {path} from '@shopify/cli-kit';
import Flags from '@oclif/core/lib/flags.js';
import {commonFlags} from '../../utils/flags.js';
import v2023_1_6 from '../../upgrades/v2023.1.6/v2023.1.6.js';

import {simpleGit} from 'simple-git';
import {AbortError} from '@shopify/cli-kit/node/error';

const VERSIONS = ['2023.1.6'];

// @ts-ignore
export default class Upgrade extends Command {
  static description =
    'Apply steps to upgrade a Hydrogen storefront to a new version.';
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
      name: 'version',
      description: `The version to upgrade to.`,
      required: true,
      options: VERSIONS,
      env: 'SHOPIFY_HYDROGEN_ARG_VERSION',
      default: VERSIONS.at(-1),
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

    let migrations;

    switch (args.version) {
      case '2023.1.6':
        migrations = await v2023_1_6(directory, flags);
        break;
      default:
        throw new AbortError(`Unknown version ${args.version}`);
    }

    await migrations.run();
  }
}

async function isGitClean(directory: string): Promise<boolean> {
  const status = await simpleGit(directory).status();
  return status.isClean();
}
