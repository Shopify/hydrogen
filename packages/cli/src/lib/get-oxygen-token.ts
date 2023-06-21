import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {
  outputContent,
  outputInfo,
  outputToken,
  outputWarn,
} from '@shopify/cli-kit/node/output';

import {linkStorefront} from '../commands/hydrogen/link.js';
import {login} from './auth.js';
import {getCliCommand} from './shell.js';
import {getConfig} from './shopify-config.js';
import {renderMissingLink, renderMissingStorefront} from './render-errors.js';
import {getOxygenToken} from './graphql/admin/oxygen-token.js';

interface Arguments {
  root: string;
  /**
   * Optional shop override that developers would have passed using the --shop
   * flag.
   */
  flagShop?: string;
  /**
   * Does not prompt the user to fix any errors that are encountered (e.g. no
   * linked storefront)
   */
  silent?: boolean;
}

export async function getOxygenDeploymentToken({
  root,
  silent,
}: Arguments): Promise<string | undefined> {
  const [{session, config}, cliCommand] = await Promise.all([
    login(root),
    getCliCommand(),
  ]);
  let configStorefront = (await getConfig(root)).storefront;

  if (!configStorefront?.id) {
    if (!silent) {
      renderMissingLink({session, cliCommand});

      const runLink = await renderConfirmationPrompt({
        message: outputContent`Run ${outputToken.genericShellCommand(
          `npx shopify hydrogen link`,
        )}?`.value,
      });

      if (!runLink) {
        return;
      }

      config.storefront = await linkStorefront(root, session, config, {
        cliCommand,
      });
    }
  }

  configStorefront = (await getConfig(root)).storefront;

  if (!configStorefront) {
    return;
  }

  const {storefront} = await getOxygenToken(session, configStorefront.id);

  if (!storefront) {
    if (!silent) {
      renderMissingStorefront({
        session,
        storefront: configStorefront,
        cliCommand,
      });
    }

    return;
  }

  if (!storefront.oxygenDeploymentToken) {
    if (!silent) {
      outputWarn(`Could not retrieve a deployment token.`);
    }
    return;
  }

  return storefront.oxygenDeploymentToken;
}
