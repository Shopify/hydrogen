import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {outputWarn} from '@shopify/cli-kit/node/output';

import {linkStorefront} from '../commands/hydrogen/link.js';
import {login} from './auth.js';
import {getCliCommand} from './shell.js';
import {renderMissingLink, renderMissingStorefront} from './render-errors.js';
import {getOxygenToken} from './graphql/admin/oxygen-token.js';

interface Arguments {
  root: string;
  /**
   * Optional shop override that developers would have passed using the --shop
   * flag.
   */
  flagShop?: string;
}

export async function getOxygenDeploymentToken({
  root,
}: Arguments): Promise<string | undefined> {
  const [{session, config}, cliCommand] = await Promise.all([
    login(root),
    getCliCommand(),
  ]);

  if (!config.storefront?.id) {
    renderMissingLink({session, cliCommand});

    const runLink = await renderConfirmationPrompt({
      message: ['Run', {command: `${cliCommand} link`}],
    });

    if (!runLink) {
      return;
    }

    config.storefront = await linkStorefront(root, session, config, {
      cliCommand,
    });
  }

  if (!config.storefront) {
    return;
  }

  const {storefront} = await getOxygenToken(session, config.storefront.id);

  if (!storefront) {
    renderMissingStorefront({
      session,
      storefront: config.storefront,
      cliCommand,
    });

    return;
  }

  if (!storefront.oxygenDeploymentToken) {
    outputWarn(`Could not retrieve a deployment token.`);
    return;
  }

  return storefront.oxygenDeploymentToken;
}
