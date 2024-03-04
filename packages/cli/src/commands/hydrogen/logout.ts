import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess} from '@shopify/cli-kit/node/ui';

import {commonFlags} from '../../lib/flags.js';
import {logout} from '../../lib/auth.js';

export default class Logout extends Command {
  static description = 'Logout of your local session.';

  static flags = {
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Logout);
    await runLogout(flags);
  }
}

interface LogoutArguments {
  path?: string;
}

async function runLogout({path: root = process.cwd()}: LogoutArguments) {
  await logout(root);
  renderSuccess({body: 'You are logged out from Shopify.'});
}
