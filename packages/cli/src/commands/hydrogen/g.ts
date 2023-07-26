import Command from '@shopify/cli-kit/node/base-command';
import GenerateRoute from './generate/route.js';
import GenerateComponent from './generate/component.js';

export default class GenerateShortcut extends Command {
  static description =
    'Shortcut for `hydrogen generate`. See `hydrogen generate --help` for more information.';

  static strict = false;

  static hidden = true;

  async run(): Promise<void> {
    const [command, ...args] = this.argv;

    if (command === 'r' || command === 'route') {
      return new GenerateRoute(args, this.config).run();
    }

    if (command === 'c' || command === 'component') {
      return new GenerateComponent(args, this.config).run();
    }

    throw new Error(`Invalid command argument "${command}".`);
  }
}
