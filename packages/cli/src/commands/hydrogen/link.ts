import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {basename} from '@shopify/cli-kit/node/path';

import {
  renderConfirmationPrompt,
  renderSuccess,
  renderTasks,
  renderTextPrompt,
  renderWarning,
} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';

import {commonFlags} from '../../lib/flags.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {setStorefront, type ShopifyConfig} from '../../lib/shopify-config.js';
import {createStorefront} from '../../lib/graphql/admin/create-storefront.js';
import {waitForJob} from '../../lib/graphql/admin/fetch-job.js';
import {titleize} from '../../lib/string.js';
import {getCliCommand} from '../../lib/shell.js';
import {login} from '../../lib/auth.js';
import type {AdminSession} from '../../lib/auth.js';
import {
  type HydrogenStorefront,
  handleStorefrontSelection,
} from '../../lib/onboarding/common.js';

export default class Link extends Command {
  static description =
    "Link a local project to one of your shop's Hydrogen storefronts.";

  static flags = {
    ...commonFlags.force,
    ...commonFlags.path,
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
    login(root),
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

  let selectedStorefront: HydrogenStorefront | undefined;

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
    selectedStorefront = await handleStorefrontSelection(storefronts);

    if (!selectedStorefront) {
      selectedStorefront = await createNewStorefront(root, session);
    }
  }

  await setStorefront(root, selectedStorefront);

  return selectedStorefront;
}

async function createNewStorefront(root: string, session: AdminSession) {
  const projectDirectory = basename(root);
  const storefronts = await getStorefronts(session);

  let defaultProjectName = titleize(projectDirectory);
  const nameAlreadyUsed = storefronts.some(
    ({title}) => title === defaultProjectName,
  );
  // Append a random hash to the default project name if it's already used
  if ( nameAlreadyUsed ) {
    defaultProjectName += ` ${Math.random().toString(36).substring(2, 6)}`;
  };

  const projectName = await renderTextPrompt({
    message: 'New storefront name',
    defaultValue: defaultProjectName,
  });

  let storefront: HydrogenStorefront | undefined;
  let jobId: string | undefined;

  await renderTasks([
    {
      title: 'Creating storefront',
      task: async () => {
        const result = await createStorefront(session, projectName);
        storefront = result.storefront;
        jobId = result.jobId;
      },
    },
    {
      title: 'Creating API tokens',
      task: async () => {
        try {
          await waitForJob(session, jobId!);
        } catch (_err) {
          storefront = undefined;
        }
      },
      skip: () => !jobId,
    },
  ]);

  if (!storefront) {
    throw new AbortError(
      'Unknown error ocurred. Please try again or contact support if the error persists.',
    );
  }

  return storefront;
}
