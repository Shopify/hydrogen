import Command from '@shopify/cli-kit/node/base-command';
import { resolvePath } from '@shopify/cli-kit/node/path';
import { commonFlags } from '../../lib/flags.js';
import { getRemixConfig } from '../../lib/remix-config.js';
import { logMissingRoutes, findMissingRoutes } from '../../lib/missing-routes.js';
import { Args } from '@oclif/core';

class GenerateRoute extends Command {
  static descriptionWithMarkdown = `Checks whether your Hydrogen app includes a set of standard Shopify routes.`;
  static description = "Returns diagnostic information about a Hydrogen storefront.";
  static flags = {
    ...commonFlags.path
  };
  static args = {
    resource: Args.string({
      name: "resource",
      description: `The resource to check. Currently only 'routes' is supported.`,
      required: true,
      options: ["routes"]
    })
  };
  async run() {
    const { flags, args } = await this.parse(GenerateRoute);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();
    if (args.resource === "routes") {
      await runCheckRoutes({ directory });
    } else {
      throw new Error("Invalid command argument.");
    }
  }
}
async function runCheckRoutes({ directory }) {
  const remixConfig = await getRemixConfig(directory);
  logMissingRoutes(findMissingRoutes(remixConfig));
}

export { GenerateRoute as default, runCheckRoutes };
