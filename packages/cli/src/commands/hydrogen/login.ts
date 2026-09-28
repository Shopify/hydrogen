import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {loginJsonOutputSchema} from '../../lib/authentication/types.js';
import Command from '../../lib/hydrogen-command.js';
import {outputNewline} from '@shopify/cli-kit/node/output';
import {commonFlags} from '../../lib/flags.js';
import {login, renderLoginSuccess} from '../../lib/auth.js';
import {enhanceAuthLogs} from '../../lib/log.js';

export default class Login extends Command {
  static get jsonOutputSchema(): typeof loginJsonOutputSchema {
    return loginJsonOutputSchema;
  }

  static descriptionWithMarkdown =
    'Logs in to the specified shop and saves the shop domain to the project.';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
    ...commonFlags.shop,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Login);
    await runLogin(flags, flags.json);
  }
}

interface LoginArguments {
  path?: string;
  shop?: string;
}

export async function runLogin(
  {path: root = process.cwd(), shop: shopFlag}: LoginArguments,
  json?: boolean,
) {
  outputNewline();
  enhanceAuthLogs(true);
  const {config} = await login(root, shopFlag ?? true);
  const {shop, shopName, email} = config;
  const result = {shop, shopName, email};
  if (!writeJsonResult(loginJsonOutputSchema, result, json))
    renderLoginSuccess(config);
  return result;
}
