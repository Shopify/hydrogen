import GenerateRoute from './route.js';
import Command from '@shopify/cli-kit/node/base-command';

export default class GenerateRoutes extends Command {
  static description = 'Generates all supported standard shopify routes.';

  static hidden: true;

  static flags = GenerateRoute.flags;

  async run(): Promise<void> {
    // @ts-ignore
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
