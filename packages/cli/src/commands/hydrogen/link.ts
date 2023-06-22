import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderConfirmationPrompt,
  renderSelectPrompt,
  renderSuccess,
  renderWarning,
} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';

import {commonFlags} from '../../lib/flags.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {setStorefront, type ShopifyConfig} from '../../lib/shopify-config.js';
import {logMissingStorefronts} from '../../lib/missing-storefronts.js';
import {getCliCommand} from '../../lib/shell.js';
import {login} from '../../lib/auth.js';
import type {AdminSession} from '../../lib/auth.js';

export default class Link extends Command {
  static description =
    "Link a local project to one of your shop's Hydrogen storefronts.";

  static flags = {
    force: commonFlags.force,
    path: commonFlags.path,
    storefront: Flags.string({
      description: 'The name of a Hydrogen Storefront (e.g. "Jane\'s Apparel")',
      env: 'SHOPIFY_HYDROGEN_STOREFRONT',
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Link);
    await runLink(flags);
  }
}

export interface LinkStorefrontArguments {
  force?: boolean;
  path?: string;
  storefront?: string;
}

export async function runLink({
  force,
  path: root = process.cwd(),
  storefront: flagStorefront,
}: LinkStorefrontArguments) {
  const [{session, config}, cliCommand] = await Promise.all([
    login(root, true),
    getCliCommand(),
  ]);

  const linkedStore = await linkStorefront(root, session, config, {
    force,
    flagStorefront,
    cliCommand,
  });

  if (!linkedStore) return;

  renderSuccess({
    body: [{userInput: linkedStore.title}, 'is now linked'],
    nextSteps: [
      [
        'Run',
        {command: `${cliCommand} dev`},
        'to start your local development server and start building',
      ],
    ],
  });
}

export async function linkStorefront(
  root: string,
  session: AdminSession,
  config: ShopifyConfig,
  {
    force = false,
    flagStorefront,
    cliCommand,
  }: {force?: boolean; flagStorefront?: string; cliCommand: string},
) {
  if (!config.shop) {
    throw new AbortError('No shop found in local config, login first.');
  }

  if (config.storefront?.id && !force) {
    const overwriteLink = await renderConfirmationPrompt({
      message: `Your project is currently linked to ${config.storefront.title}. Do you want to link to a different Hydrogen storefront on Shopify?`,
    });

    if (!overwriteLink) {
      return;
    }
  }

  const storefronts = await getStorefronts(session);

  if (storefronts.length === 0) {
    logMissingStorefronts(session);
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
        body: [
          "There's no storefront matching",
          {userInput: flagStorefront},
          'on your',
          {userInput: config.shop},
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

  await setStorefront(root, selectedStorefront);

  return selectedStorefront;
}
