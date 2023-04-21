import GenerateRoute from './route.js';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {commonFlags} from '../../../lib/flags.js';

export default class GenerateRoutes extends Command {
  static description = 'Generates all supported standard shopify routes.';

  static hidden: true;

  static flags = {
    adapter: Flags.string({
      description:
        'Remix adapter used in the route. The default is `@shopify/remix-oxygen`.',
      env: 'SHOPIFY_HYDROGEN_FLAG_ADAPTER',
    }),
    typescript: Flags.boolean({
      description: 'Generate TypeScript files',
      env: 'SHOPIFY_HYDROGEN_FLAG_TYPESCRIPT',
    }),
    force: commonFlags.force,
    path: commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(GenerateRoutes);

    await GenerateRoute.run([
      'all',
      ...Object.entries(flags).map(([name, value]) => {
        if (value === true) {
          return `--${name}`;
        }

        return `--${name}=${value}`;
      }),
    ]);
  }
}
