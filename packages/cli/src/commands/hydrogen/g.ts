import {jsonFlag} from '@shopify/cli-kit/node/cli';
import Command from '../../lib/hydrogen-command.js';
import GenerateRoute from './generate/route.js';

export default class GenerateRouteShortcut extends Command {
  static flags = {...jsonFlag};

  static get jsonOutputSchema(): typeof GenerateRoute.jsonOutputSchema {
    return GenerateRoute.jsonOutputSchema;
  }

  static descriptionWithMarkdown =
    'Shortcut for `hydrogen generate`. See `hydrogen generate --help` for more information.';

  static description = this.descriptionForHelp();

  static strict = false;

  static hidden = true;

  async run(): Promise<void> {
    const [command, ...args] = this.argv;

    if (command === 'r' || command === 'route') {
      return new GenerateRoute(args, this.config).run();
    }

    throw new Error(`Invalid command argument "${command}".`);
  }
}
