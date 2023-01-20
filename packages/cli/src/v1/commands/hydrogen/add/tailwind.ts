import {hydrogenFlags} from '../../../flags.js';
import {Flags} from '@oclif/core';
import {cli} from '@shopify/cli-kit';
import Command from '@shopify/cli-kit/node/base-command';
import {output} from '@shopify/cli-kit';

export default class AddTailwind extends Command {
  static flags = {
    ...cli.globalFlags,
    ...hydrogenFlags,
    force: Flags.boolean({
      hidden: false,
      char: 'f',
      description: 'overwrite existing configuration',
      default: false,
      env: 'SHOPIFY_FLAG_FORCE',
    }),
  };

  public async run(): Promise<void> {
    output.info('This command has been deprecated.');
  }
}
