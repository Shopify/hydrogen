import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {resolvePath} from '@shopify/cli-kit/node/path';
import GenerateRoute, {runGenerate} from './route.js';
import Command from '../../../lib/hydrogen-command.js';
import {generateRoutesJsonOutputSchema} from '../../../lib/setups/routes/types.js';

export default class GenerateRoutes extends Command {
  static get jsonOutputSchema(): typeof generateRoutesJsonOutputSchema {
    return generateRoutesJsonOutputSchema;
  }
  static descriptionWithMarkdown =
    'Generates all supported standard shopify routes.';
  static description = this.descriptionForHelp();
  static hidden: true;
  static flags = {...GenerateRoute.flags, ...jsonFlag};

  async run(): Promise<void> {
    const {flags} = await this.parse(GenerateRoutes);
    await runGenerate(
      {
        ...flags,
        directory: flags.path ? resolvePath(flags.path) : process.cwd(),
        routeName: 'all',
        localePrefix: flags['locale-param'],
      },
      flags.json,
    );
  }
}
