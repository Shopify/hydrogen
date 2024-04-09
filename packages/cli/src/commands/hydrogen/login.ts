import Command from '@shopify/cli-kit/node/base-command';

import {commonFlags} from '../../lib/flags.js';
import {login, renderLoginSuccess} from '../../lib/auth.js';

export default class Login extends Command {

  static descriptionWithMarkdown = "Logs in to the specified shop and saves the shop domain to the project."

  static description = 'Login to your Shopify account.';

  static flags = {
    ...commonFlags.path,
    ...commonFlags.shop,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Login);
    await runLogin(flags);
  }
}

interface LoginArguments {
  path?: string;
  shop?: string;
}

async function runLogin({
  path: root = process.cwd(),
  shop: shopFlag,
}: LoginArguments) {
  const {config} = await login(root, shopFlag ?? true);
  renderLoginSuccess(config);
}
