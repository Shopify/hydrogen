import {previewInWorker, previewInNode} from '../../services/preview.js';
import {hydrogenFlags} from '../../flags.js';
import {Flags} from '@oclif/core';
import {cli} from '@shopify/cli-kit';
import Command from '@shopify/cli-kit/node/base-command';
import {path} from '@shopify/cli-kit';

export default class Preview extends Command {
  static description =
    'Run a Hydrogen storefront locally in a worker environment.';
  static flags = {
    ...cli.globalFlags,
    path: hydrogenFlags.path,
    port: Flags.string({
      char: 'p',
      hidden: true,
      description: 'the port to run the preview server on',
      default: '3000',
      env: 'SHOPIFY_FLAG_PORT',
    }),
    env: Flags.string({
      char: 'e',
      description: 'the file path to your .env',
      default: undefined,
      parse: (input, _) => Promise.resolve(path.resolve(input)),
      env: 'SHOPIFY_FLAG_ENV_PATH',
    }),
    target: Flags.string({
      char: 't',
      description: 'the target environment (worker or node)',
      options: ['node', 'worker'],
      default: 'worker',
      env: 'SHOPIFY_FLAG_PREVIEW_TARGET',
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Preview);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();
    const port = parseInt(flags.port, 10);
    const envPath = flags.env;

    if (flags.target === 'worker') {
      await previewInWorker({directory, port, envPath});
    } else if (flags.target === 'node') {
      await previewInNode({directory, port});
    }
  }
}
