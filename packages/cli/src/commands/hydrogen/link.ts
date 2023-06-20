import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {basename} from '@shopify/cli-kit/node/path';

import {
  renderConfirmationPrompt,
  renderSelectPrompt,
  renderSuccess,
  renderTasks,
  renderTextPrompt,
  renderWarning,
} from '@shopify/cli-kit/node/ui';

import {commonFlags} from '../../lib/flags.js';
import {getHydrogenShop} from '../../lib/shop.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {createStorefront} from '../../lib/graphql/admin/create-storefront.js';
import {waitForJob} from '../../lib/graphql/admin/fetch-job.js';
import {getConfig, setStorefront} from '../../lib/shopify-config.js';
import {logMissingStorefronts} from '../../lib/missing-storefronts.js';
import {titleize} from '../../lib/string.js';
import {getCliCommand} from '../../lib/shell.js';
import {renderError, renderUserErrors} from '../../lib/user-errors.js';

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

interface HydrogenStorefront {
  id: string;
  title: string;
  productionUrl: string;
}

const CREATE_NEW_STOREFRONT_ID = 'NEW_STOREFRONT';

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

  let selectedStorefront: HydrogenStorefront | undefined;
  let selectCreateNewStorefront = false;
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

    choices.unshift({
      value: CREATE_NEW_STOREFRONT_ID,
      label: 'Create a new storefront',
    });

    const storefrontId = await renderSelectPrompt({
      message: 'Choose a Hydrogen storefront to link',
      choices,
    });

    if (storefrontId === CREATE_NEW_STOREFRONT_ID) {
      selectCreateNewStorefront = true;
    } else {
      selectedStorefront = storefronts.find(({id}) => id === storefrontId);
    }
  }

  if (selectCreateNewStorefront) {
    const storefront = await createNewStorefront(path, shop);

    if (!storefront) {
      return;
    }

    selectedStorefront = storefront;
  }

  if (selectedStorefront) {
    await linkExistingStorefront(path, selectedStorefront, silent, cliCommand);
  }
}

async function createNewStorefront(
  path: string | undefined,
  shop: string,
): Promise<HydrogenStorefront | undefined> {
  const projectDirectory = path && basename(path);

  const projectName = await renderTextPrompt({
    message: 'What do you want to name the Hydrogen storefront on Shopify?',
    defaultValue: titleize(projectDirectory) || 'Hydrogen Storefront',
  });

  let storefront: HydrogenStorefront | undefined;
  let jobId: string | undefined;

  await renderTasks([
    {
      title: 'Creating storefront',
      task: async () => {
        const result = await createStorefront(shop, projectName);

        storefront = result.storefront;
        jobId = result.jobId;

        if (result.userErrors.length > 0) {
          renderUserErrors(result.userErrors);
        }
      },
    },
    {
      title: 'Creating API tokens',
      task: async () => {
        try {
          await waitForJob(shop, jobId!);
        } catch (_err) {
          storefront = undefined;
          renderError(
            'Please try again or contact support if the error persists.',
          );
        }
      },
      skip: () => !jobId,
    },
  ]);

  return storefront;
}

async function linkExistingStorefront(
  path: string | undefined,
  selectedStorefront: HydrogenStorefront,
  silent: boolean,
  cliCommand: string,
) {
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
