import {info} from '../../services/info.js';
import {load as loadApp, HydrogenApp} from '../../models/hydrogen.js';
import {hydrogenFlags} from '../../flags.js';
import {Flags} from '@oclif/core';
import {cli} from '@shopify/cli-kit';
import {output} from '@shopify/cli-kit';
import Command from '@shopify/cli-kit/node/base-command';
import {path} from '@shopify/cli-kit';

export default class Info extends Command {
  static description = 'Print basic information about your hydrogen app.';

  static flags = {
    ...cli.globalFlags,
    ...hydrogenFlags,
    showToken: Flags.boolean({
      hidden: false,
      description: 'Show storefront API token',
      default: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_SHOW_TOKEN',
    }),
  };

  public async run(): Promise<void> {
    const {flags} = await this.parse(Info);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();
    const app: HydrogenApp = await loadApp(directory);

    output.info(info(app, {showPrivateData: flags.showToken}));
    if (app.errors) process.exit(2);
  }
}
