import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';

import {commonFlags} from '../../lib/flags.js';
import {login} from '../../lib/auth.js';

export default class Login extends Command {
  static description = 'Login to your Shopify account.';

  static flags = {
    path: commonFlags.path,
    shop: Flags.string({
      char: 's',
      description:
        'Shop URL. It can be the shop prefix (janes-apparel)' +
        ' or the full myshopify.com URL (janes-apparel.myshopify.com, https://janes-apparel.myshopify.com).',
      env: 'SHOPIFY_SHOP',
      parse: async (input) => normalizeStoreFqdn(input),
    }),
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

  renderSuccess({
    headline: 'Shopify authentication complete',
    body: [
      'You are now logged in to',
      {userInput: config.shopName ?? config.shop ?? 'your store'},
      ...(config.email ? ['as', {userInput: config.email!}] : []),
    ],
  });
}
