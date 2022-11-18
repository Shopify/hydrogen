// TODO: why can't we use the shopify kit version of this?
import {Flags, Command} from '@oclif/core';

import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const remix = require('@remix-run/dev/dist/cli/run');

export default class Init extends Command {
  static description = 'Builds a Hydrogen storefront for production';
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

  remix.run(['create', ...defaults]);
}
