import {
  renderConfirmationPrompt,
  renderFatalError,
} from '@shopify/cli-kit/node/ui';
import {
  outputContent,
  outputInfo,
  outputToken,
} from '@shopify/cli-kit/node/output';

import {linkStorefront} from '../commands/hydrogen/link.js';

import {adminRequest, parseGid} from './graphql.js';
import {getHydrogenShop} from './shop.js';
import {getAdminSession} from './admin-session.js';
import {getConfig} from './shopify-config.js';
import {hydrogenStorefrontsUrl} from './admin-urls.js';

import {
  PullVariablesQuery,
  PullVariablesSchema,
} from './graphql/admin/pull-variables.js';

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

export async function pullRemoteEnvironmentVariables({
  root,
  flagShop,
  silent,
}: Arguments) {
  const shop = await getHydrogenShop({path: root, shop: flagShop});
  const adminSession = await getAdminSession(shop);
  let configStorefront = (await getConfig(root)).storefront;

  if (!configStorefront?.id) {
    if (!silent) {
      renderFatalError({
        name: 'NoLinkedStorefrontError',
        type: 0,
        message: `No linked Hydrogen storefront on ${adminSession.storeFqdn}`,
        tryMessage:
          outputContent`To pull environment variables, link this project to a Hydrogen storefront. To select a storefront to link, run ${outputToken.genericShellCommand(
            `npx shopify hydrogen link`,
          )}.`.value,
      });

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

  if (!silent) {
    outputInfo(
      `Fetching Preview environment variables from ${configStorefront.title}...`,
    );
  }
  const result: PullVariablesSchema = await adminRequest(
    PullVariablesQuery,
    adminSession,
    {
      id: configStorefront.id,
    },
  );

  const storefront = result.hydrogenStorefront;

  if (!storefront) {
    if (!silent) {
      renderFatalError({
        name: 'NoStorefrontError',
        type: 0,
        message: outputContent`${outputToken.errorText(
          'Couldn’t find Hydrogen storefront.',
        )}`.value,
        tryMessage: outputContent`Couldn’t find ${
          configStorefront.title
        } (ID: ${parseGid(configStorefront.id)}) on ${
          adminSession.storeFqdn
        }. Check that the storefront exists and run ${outputToken.genericShellCommand(
          `npx shopify hydrogen link`,
        )} to link this project to it.\n\n${outputToken.link(
          'Hydrogen Storefronts Admin',
          hydrogenStorefrontsUrl(adminSession),
        )}`.value,
      });
    }

    return [];
  }

  if (!storefront.environmentVariables.length) {
    if (!silent) {
      outputInfo(`No Preview environment variables found.`);
    }
    return [];
  }

  return storefront.environmentVariables;
}
