import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {
  outputContent,
  outputInfo,
  outputToken,
} from '@shopify/cli-kit/node/output';

import {linkStorefront} from '../commands/hydrogen/link.js';
import {getHydrogenShop} from './shop.js';
import {getAdminSession} from './admin-session.js';
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
  flagShop,
  silent,
}: Arguments) {
  const shop = await getHydrogenShop({path: root, shop: flagShop});
  const adminSession = await getAdminSession(shop);
  let configStorefront = (await getConfig(root)).storefront;

  if (!configStorefront?.id) {
    if (!silent) {
      renderMissingLink({adminSession});

      const runLink = await renderConfirmationPrompt({
        message: outputContent`Run ${outputToken.genericShellCommand(
          `npx shopify hydrogen link`,
        )}?`.value,
      });

      if (!runLink) {
        return [];
      }

      await linkStorefront({path: root, shop: flagShop, silent});
    }
  }

  configStorefront = (await getConfig(root)).storefront;

  if (!configStorefront) {
    return [];
  }

  const {storefront} = await getOxygenToken(adminSession, configStorefront.id);

  if (!storefront) {
    if (!silent) {
      renderMissingStorefront({adminSession, storefront: configStorefront});
    }

    return [];
  }

  if (!storefront.oxygenDeploymentToken) {
    if (!silent) {
      outputInfo(
        `Deployment token not found. Use the "token" flag to supply a token.`,
      );
    }
    return [];
  }

  return storefront.oxygenDeploymentToken;
}
