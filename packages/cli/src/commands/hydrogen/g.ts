import Command from '../../lib/hydrogen-command.js';
import GenerateRoute from './generate/route.js';

// Hidden compatibility alias; the JSON contract belongs to generate route.
// eslint-disable-next-line @shopify/cli/command-json-output
export default class GenerateRouteShortcut extends Command {
  static description =
    'Shortcut for `hydrogen generate`. See `hydrogen generate --help` for more information.';

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
