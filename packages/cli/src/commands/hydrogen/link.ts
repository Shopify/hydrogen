import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderConfirmationPrompt,
  renderSelectPrompt,
  renderSuccess,
  renderWarning,
} from '@shopify/cli-kit/node/ui';

import {commonFlags} from '../../lib/flags.js';
import {getHydrogenShop} from '../../lib/shop.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {getConfig, setStorefront} from '../../lib/shopify-config.js';
import {logMissingStorefronts} from '../../lib/missing-storefronts.js';
import {getCliCommand} from '../../lib/shell.js';

export default class Link extends Command {
  static description =
    "Link a local project to one of your shop's Hydrogen storefronts.";

  static flags = {
    force: commonFlags.force,
    path: commonFlags.path,
    shop: commonFlags.shop,
    storefront: Flags.string({
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
  const cliCommand = await getCliCommand();

  if (flagStorefront) {
    selectedStorefront = storefronts.find(
      ({title}) => title === flagStorefront,
    );

    if (!selectedStorefront) {
      renderWarning({
        headline: `Couldn't find ${flagStorefront}`,
        body: [
          "There's no storefront matching",
          {userInput: flagStorefront},
          'on your',
          {userInput: shop},
          'shop. To see all available Hydrogen storefronts, run',
          {
            command: `${cliCommand} list`,
          },
        ],
      });

      return;
    }
  } else {
    const choices = storefronts.map(({id, title, productionUrl}) => ({
      value: id,
      label: `${title} (${productionUrl})`,
    }));

    const storefrontId = await renderSelectPrompt({
      message: 'Choose a Hydrogen storefront to link',
      choices,
    });

    selectedStorefront = storefronts.find(({id}) => id === storefrontId);
  }

  if (!selectedStorefront) {
    return;
  }

  await setStorefront(path ?? process.cwd(), selectedStorefront);

  if (!silent) {
    renderSuccess({
      body: [{userInput: selectedStorefront.title}, 'is now linked'],
      nextSteps: [
        [
          'Run',
          {command: `${cliCommand} dev`},
          'to start your local development server and start building',
        ],
      ],
    });
  }
}
