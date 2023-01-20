import {hydrogenFlags} from '../../../flags.js';
import {Flags} from '@oclif/core';
import {cli, output} from '@shopify/cli-kit';
import Command from '@shopify/cli-kit/node/base-command';

export default class AddESLint extends Command {
  static flags = {
    ...cli.globalFlags,
    ...hydrogenFlags,
    force: Flags.boolean({
      hidden: false,
      char: 'f',
      description: 'Overwrite existing configuration',
      default: false,
      env: 'SHOPIFY_FLAG_FORCE',
    }),
  };

  public async run(): Promise<void> {
    output.info('This command has been deprecated.');
  }
}
