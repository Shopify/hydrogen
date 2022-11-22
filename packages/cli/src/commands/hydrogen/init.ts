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
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Init);

    await runInit({...flags});
  }
}

function runInit({typescript}: {typescript?: Boolean}) {
  const defaults = [
    '--template',
    '../../templates/demo-store',
    '--install',
    typescript ? '--typescript' : '',
  ];

  remixCli.run(['create', ...defaults]);
}
