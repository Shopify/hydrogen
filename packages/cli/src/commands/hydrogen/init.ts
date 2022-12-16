import {cli as remixCli} from '@remix-run/dev';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';

// @ts-ignore
export default class Init extends Command {
  static description = 'Creates a new Hydrogen storefront project';
  static flags = {
    typescript: Flags.boolean({
      description: 'Use TypeScript',
      env: 'SHOPIFY_HYDROGEN_FLAG_TYPESCRIPT',
    }),
    template: Flags.string({
      description: 'The template to use',
      env: 'SHOPIFY_HYDROGEN_FLAG_TEMPLATE',
      default: '../../templates/demo-store',
      required: true,
    }),
    token: Flags.string({
      description:
        'A GitHub token used to access access private repository templates',
    }),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Init);

    await runInit({...flags});
  }
}

export function runInit({
  template,
  typescript,
  token,
}: {
  template: string;
  typescript?: Boolean;
  token?: string;
}) {
  const defaults = [
    '--template',
    template,
    '--install',
    typescript ? '--typescript' : '--no-typescript',
    token ? `--token ${token}` : '',
  ];

  remixCli.run(['create', ...defaults]);
}
