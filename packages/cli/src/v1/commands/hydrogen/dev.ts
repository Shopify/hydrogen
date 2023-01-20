import devService from '../../services/dev.js';
import {hydrogenFlags} from '../../flags.js';
import {Flags} from '@oclif/core';
import {cli} from '@shopify/cli-kit';
import Command from '@shopify/cli-kit/node/base-command';
import {path} from '@shopify/cli-kit';

export default class Dev extends Command {
  static description = 'Run a Hydrogen storefront locally for development.';
  static flags = {
    ...cli.globalFlags,
    path: hydrogenFlags.path,
    force: Flags.boolean({
      description: 'force dependency pre-bundling.',
      env: 'SHOPIFY_FLAG_DEV_FORCE',
    }),
    host: Flags.boolean({
      description:
        'listen on all addresses, including LAN and public addresses.',
      env: 'SHOPIFY_FLAG_DEV_HOST',
    }),
    open: Flags.boolean({
      description: 'automatically open the app in the browser',
      env: 'SHOPIFY_FLAG_DEV_OPEN',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Dev);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await devService({directory, ...flags, commandConfig: this.config});
  }
}
