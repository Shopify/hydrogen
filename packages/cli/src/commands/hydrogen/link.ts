import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderConfirmationPrompt,
  renderSelectPrompt,
  renderWarning,
} from '@shopify/cli-kit/node/ui';
import {
  outputContent,
  outputInfo,
  outputSuccess,
  outputToken,
} from '@shopify/cli-kit/node/output';

import {commonFlags} from '../../lib/flags.js';
import {getHydrogenShop} from '../../lib/shop.js';
import {hydrogenStorefrontUrl} from '../../lib/admin-urls.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {getConfig, setStorefront} from '../../lib/shopify-config.js';
import {logMissingStorefronts} from '../../lib/missing-storefronts.js';

export default class Link extends Command {
  static description =
    "Link a local project to one of your shop's Hydrogen storefronts.";

  static hidden = true;

  static flags = {
    force: commonFlags.force,
    path: commonFlags.path,
    shop: commonFlags.shop,
    storefront: Flags.string({
      char: 'h',
      description: 'The name of a Hydrogen Storefront (e.g. "Jane\'s Apparel")',
      env: 'SHOPIFY_HYDROGEN_STOREFRONT',
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Link);
    await linkStorefront(flags);
  }
}

export interface LinkStorefrontArguments {
  force?: boolean;
  path?: string;
  shop?: string;
  storefront?: string;
  silent?: boolean;
}

export async function linkStorefront({
  force,
  path,
  shop: flagShop,
  storefront: flagStorefront,
  silent = false,
}: LinkStorefrontArguments) {
  const shop = await getHydrogenShop({path, shop: flagShop});
  const {storefront: configStorefront} = await getConfig(path ?? process.cwd());

  if (configStorefront && !force) {
    const overwriteLink = await renderConfirmationPrompt({
      message: `Your project is currently linked to ${configStorefront.title}. Do you want to link to a different Hydrogen storefront on Shopify?`,
    });

    if (!overwriteLink) {
      return;
    }
  }

  const {storefronts, adminSession} = await getStorefronts(shop);

  if (storefronts.length === 0) {
    logMissingStorefronts(adminSession);
    return;
  }

  let selectedStorefront;

  if (flagStorefront) {
    selectedStorefront = storefronts.find(
      ({title}) => title === flagStorefront,
    );

    if (!selectedStorefront) {
      renderWarning({
        headline: `Couldn't find ${flagStorefront}`,
        body: outputContent`There's no storefront matching ${flagStorefront} on your ${shop} shop. To see all available Hydrogen storefronts, run ${outputToken.genericShellCommand(
          `npx shopify hydrogen list`,
        )}`.value,
      });

      return;
    }
  } else {
    const choices = storefronts.map(({id, title, productionUrl}) => ({
      value: id,
      label: `${title} ${productionUrl}${
        id === configStorefront?.id ? ' (Current)' : ''
      }`,
    }));

    const storefrontId = await renderSelectPrompt({
      message: 'Choose a Hydrogen storefront to link this project to:',
      choices,
      defaultValue: 'true',
    });

    selectedStorefront = storefronts.find(({id}) => id === storefrontId);
  }

  if (!selectedStorefront) {
    return;
  }

  await setStorefront(path ?? process.cwd(), selectedStorefront);

  outputSuccess(`Linked to ${selectedStorefront.title}`);

  if (!silent) {
    outputInfo(
      `Admin URL: ${hydrogenStorefrontUrl(
        adminSession,
        selectedStorefront.parsedId,
      )}`,
    );
    outputInfo(`Site URL: ${selectedStorefront.productionUrl}`);
  }
}
