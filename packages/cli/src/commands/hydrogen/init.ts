import {cli as remixCli} from '@remix-run/dev';
// TODO: why can't we use the shopify kit version of this?
import {Flags, Command} from '@oclif/core';

export default class Init extends Command {
  static description = 'Creates a new Hydrogen storefront project';
  static flags = {
    typescript: Flags.boolean({
      description: 'Use TypeScript',
      env: 'SHOPIFY_HYDROGEN_FLAG_TYPESCRIPT',
    }),
  };

  async run(): Promise<void> {
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
