import GenerateRoute from './route.js';
import Command from '@shopify/cli-kit/node/base-command';

class GenerateRoutes extends Command {
  static description = "Generates all supported standard shopify routes.";
  static hidden;
  static flags = GenerateRoute.flags;
  async run() {
    const { flags } = await this.parse(GenerateRoutes);
    await GenerateRoute.run([
      "all",
      ...Object.entries(flags).map(([name, value]) => {
        if (value === true) {
          return `--${name}`;
        }
        return `--${name}=${value}`;
      })
    ]);
  }
}

export { GenerateRoutes as default };
