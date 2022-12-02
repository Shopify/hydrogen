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
    }),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Init);

    await runInit({...flags});
  }
}

function runInit({
  template,
  typescript,
}: {
  template: string;
  typescript?: Boolean;
}) {
  const defaults = [
    '--template',
    template,
    '--install',
    typescript ? '--typescript' : '',
  ];

  remixCli.run(['create', ...defaults]);
}
