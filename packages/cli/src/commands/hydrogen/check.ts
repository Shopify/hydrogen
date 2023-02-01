import Command from '@shopify/cli-kit/node/base-command';
import {path} from '@shopify/cli-kit';
import {commonFlags} from '../../utils/flags.js';
import {getRemixConfig} from '../../utils/config.js';
import {
  findMissingRoutes,
  logMissingRoutes,
} from '../../utils/missing-routes.js';

export default class GenerateRoute extends Command {
  static flags = {
    path: commonFlags.path,
  };

  static args = [
    {
      name: 'resource',
      description: `The resource to check. Currently only 'routes' is supported.`,
      required: true,
      options: ['routes'],
    },
  ];

  async run(): Promise<void> {
    // @ts-ignore
    const {flags, args} = await this.parse(GenerateRoute);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    if (args.resource === 'routes') {
      await runCheckRoutes({directory});
    } else {
      throw new Error('Invalid command argument.');
    }
  }
}

async function runCheckRoutes({directory}: {directory: string}) {
  const remixConfig = await getRemixConfig(directory, '', '');
  logMissingRoutes(findMissingRoutes(remixConfig));
}
