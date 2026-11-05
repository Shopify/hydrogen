import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {logoutJsonOutputSchema} from '../../lib/authentication/types.js';
import Command from '../../lib/hydrogen-command.js';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {outputNewline} from '@shopify/cli-kit/node/output';

import {commonFlags} from '../../lib/flags.js';
import {logout} from '../../lib/auth.js';

export default class Logout extends Command {
  static get jsonOutputSchema(): typeof logoutJsonOutputSchema {
    return logoutJsonOutputSchema;
  }

  static descriptionWithMarkdown = 'Log out from the current shop.';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Logout);
    await runLogout(flags, flags.json);
  }
}

interface LogoutArguments {
  path?: string;
}

export async function runLogout(
  {path: root = process.cwd()}: LogoutArguments,
  json?: boolean,
) {
  outputNewline();
  await logout(root);
  const result = {status: 'success' as const, loggedOut: true as const};
  if (!writeJsonResult(logoutJsonOutputSchema, result, json))
    renderSuccess({body: 'You are logged out from Shopify.'});
  return result;
}
