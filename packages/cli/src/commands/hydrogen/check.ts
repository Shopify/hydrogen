import Command from '@shopify/cli-kit/node/base-command';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {commonFlags} from '../../utils/flags.js';
import {getRemixConfig} from '../../utils/config.js';
import {
  findMissingRoutes,
  logMissingRoutes,
} from '../../utils/missing-routes.js';

import {Args} from '@oclif/core';

export default class GenerateRoute extends Command {
  static description =
    'Returns diagnostic information about a Hydrogen storefront.';

  static flags = {
    path: commonFlags.path,
  };

  static args = {
    firstArg: Args.string({
      name: 'resource',
      description: `The resource to check. Currently only 'routes' is supported.`,
      required: true,
      options: ['routes'],
    }),
  };

  async run(): Promise<void> {
    const {flags, args} = await this.parse(GenerateRoute);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    if (args.firstArg === 'routes') {
      await runCheckRoutes({directory});
    } else {
      throw new Error('Invalid command argument.');
    }
  }
}

async function runCheckRoutes({directory}: {directory: string}) {
  const remixConfig = await getRemixConfig(directory);
  logMissingRoutes(findMissingRoutes(remixConfig));
}
