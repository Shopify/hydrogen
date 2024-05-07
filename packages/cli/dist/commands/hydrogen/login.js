import Command from '@shopify/cli-kit/node/base-command';
import { commonFlags } from '../../lib/flags.js';
import { login, renderLoginSuccess } from '../../lib/auth.js';

class Login extends Command {
  static descriptionWithMarkdown = "Logs in to the specified shop and saves the shop domain to the project.";
  static description = "Login to your Shopify account.";
  static flags = {
    ...commonFlags.path,
    ...commonFlags.shop
  };
  async run() {
    const { flags } = await this.parse(Login);
    await runLogin(flags);
  }
}
async function runLogin({
  path: root = process.cwd(),
  shop: shopFlag
}) {
  const { config } = await login(root, shopFlag ?? true);
  renderLoginSuccess(config);
}

export { Login as default };
