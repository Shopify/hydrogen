import {toStoreDomain} from '../../lib/json-contract.js';
import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {
  linkJsonOutputSchema,
  toStorefront,
} from '../../lib/storefronts/types.js';
import {Flags} from '@oclif/core';
import Command from '../../lib/hydrogen-command.js';
import {basename} from '@shopify/cli-kit/node/path';

import {
  renderConfirmationPrompt,
  renderSuccess,
  renderTasks,
  renderTextPrompt,
} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';

import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {setStorefront, type ShopifyConfig} from '../../lib/shopify-config.js';
import {createStorefront} from '../../lib/graphql/admin/create-storefront.js';
import {waitForJob} from '../../lib/graphql/admin/fetch-job.js';
import {titleize} from '../../lib/string.js';
import {getCliCommand} from '../../lib/shell.js';
import {login} from '../../lib/auth.js';
import {abandonOnAbort} from '../../lib/abort.js';
import type {AdminSession} from '../../lib/auth.js';
import {
  type HydrogenStorefront,
  type ParsedHydrogenStorefront,
  generateRandomName,
  handleStorefrontSelection,
} from '../../lib/onboarding/common.js';

export default class Link extends Command {
  static get jsonOutputSchema(): typeof linkJsonOutputSchema {
    return linkJsonOutputSchema;
  }

  static descriptionWithMarkdown = `Links your local development environment to a remote Hydrogen storefront. You can link an unlimited number of development environments to a single Hydrogen storefront.

  Linking to a Hydrogen storefront enables you to run [dev](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-dev) and automatically inject your linked Hydrogen storefront's environment variables directly into the server runtime.

  After you run the \`link\` command, you can access the [env list](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-env-list), [env pull](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-env-pull), and [unlink](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-unlink) commands.`;

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.force,
    ...commonFlags.path,
    ...commonFlags.shop,
    storefront: Flags.string({
      description: 'The name of a Hydrogen Storefront (e.g. "Jane\'s Apparel")',
      env: 'SHOPIFY_HYDROGEN_STOREFRONT',
      exclusive: ['create-storefront', 'name'],
    }),
    'create-storefront': Flags.boolean({
      description: 'Create a new Hydrogen storefront.',
      env: 'SHOPIFY_HYDROGEN_FLAG_CREATE_STOREFRONT',
      exclusive: ['storefront'],
    }),
    name: Flags.string({
      description: 'The name to use when creating a new Hydrogen storefront.',
      env: 'SHOPIFY_HYDROGEN_FLAG_NAME',
      exclusive: ['storefront'],
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Link);
    await runLink(flagsToCamelObject(flags), flags.json);
  }
}

export interface LinkStorefrontArguments {
  force?: boolean;
  path?: string;
  shop?: string;
  storefront?: string;
  createStorefront?: boolean;
  name?: string;
}

export async function runLink(
  {
    createStorefront: flagCreateStorefront,
    force,
    path: root = process.cwd(),
    shop,
    storefront: flagStorefront,
    name,
  }: LinkStorefrontArguments,
  json?: boolean,
) {
  const [{session, config}, cliCommand] = await Promise.all([
    login(root, shop),
    getCliCommand(),
  ]);

  const linkedStore = await linkStorefront(root, session, config, {
    force,
    flagCreateStorefront,
    flagStorefront,
    storefrontName: name,
    cliCommand,
  });

  const result = {
    status: linkedStore ? ('success' as const) : ('cancelled' as const),
    changed: Boolean(linkedStore),
    storeDomain: toStoreDomain(session.storeFqdn),
    storefront: linkedStore ? toStorefront(linkedStore) : null,
  };
  if (writeJsonResult(linkJsonOutputSchema, result, json) || !linkedStore)
    return result;

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
  return result;
}

export async function linkStorefront(
  root: string,
  session: AdminSession,
  config: ShopifyConfig,
  {
    force = false,
    flagCreateStorefront,
    flagStorefront,
    storefrontName,
    cliCommand,
    storefronts,
    signal,
  }: {
    force?: boolean;
    flagCreateStorefront?: boolean;
    flagStorefront?: string;
    storefrontName?: string;
    cliCommand: string;
    storefronts?: ParsedHydrogenStorefront[];
    signal?: AbortSignal;
  },
) {
  signal?.throwIfAborted();
  storefrontName = storefrontName?.trim() || undefined;

  if (flagStorefront && (flagCreateStorefront || storefrontName)) {
    throw new AbortError(
      '`--storefront` cannot be used with storefront creation flags.',
      'Use `--storefront` to link an existing storefront or `--name` to create a new one.',
    );
  }

  if (!config.shop) {
    throw new AbortError('No shop found in local config, login first.');
  }

  if (config.storefront?.id && !force) {
    const overwriteLink = await renderConfirmationPrompt({
      message: `Your project is currently linked to ${config.storefront!.title}. Do you want to link to a different Hydrogen storefront on Shopify?`,
      ...(signal ? {abortSignal: signal} : {}),
    });
    signal?.throwIfAborted();

    if (!overwriteLink) {
      return;
    }
  }

  if (!storefronts) {
    storefronts = await abandonOnAbort(() => getStorefronts(session), signal);
  }
  signal?.throwIfAborted();

  let selectedStorefront: HydrogenStorefront | undefined;

  if (flagStorefront) {
    selectedStorefront = storefronts.find(
      ({title}) => title === flagStorefront,
    );

    if (!selectedStorefront) {
      throw new AbortError(
        `Couldn't find ${flagStorefront}`,
        `No storefront with that name exists on ${config.shop}. Run ${cliCommand} list to see available storefronts.`,
      );
    }
  } else if (flagCreateStorefront || storefrontName) {
    return createNewStorefront(
      root,
      session,
      storefronts,
      storefrontName,
      signal,
    );
  } else {
    selectedStorefront = await handleStorefrontSelection(storefronts, signal);
    signal?.throwIfAborted();

    if (!selectedStorefront) {
      return createNewStorefront(root, session, storefronts, undefined, signal);
    }
  }

  signal?.throwIfAborted();
  await setStorefront(root, selectedStorefront);
  signal?.throwIfAborted();

  return selectedStorefront;
}

async function createNewStorefront(
  root: string,
  session: AdminSession,
  storefronts: ParsedHydrogenStorefront[],
  storefrontName?: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const projectDirectory = basename(root);
  let defaultProjectName = titleize(projectDirectory);
  const nameAlreadyUsed = storefronts.some(
    ({title}: {title: string}) => title === defaultProjectName,
  );
  if (nameAlreadyUsed) {
    defaultProjectName = generateRandomName();
  }

  const projectName =
    storefrontName ??
    (await renderTextPrompt({
      message: 'New storefront name',
      defaultValue: defaultProjectName,
      ...(signal ? {abortSignal: signal} : {}),
    }));
  signal?.throwIfAborted();

  let storefront: HydrogenStorefront | undefined;
  let jobId: string | undefined;

  try {
    await renderTasks([
      {
        title: 'Creating storefront',
        task: async () => {
          signal?.throwIfAborted();
          const result = await createStorefront(session, projectName);
          storefront = result.storefront;
          jobId = result.jobId;
          signal?.throwIfAborted();
        },
      },
      {
        title: 'Creating API tokens',
        task: async () => {
          await waitForJob(session, jobId!, signal);
        },
        skip: () => !jobId,
      },
    ]);
    signal?.throwIfAborted();
  } catch (error) {
    // Cancellation can stop polling after creation has committed remotely.
    if (signal?.aborted && error === signal.reason && storefront) {
      await setStorefront(root, storefront);
    }
    throw error;
  }

  if (!storefront) {
    throw new AbortError(
      'Unknown error occurred. Please try again or contact support if the error persists.',
    );
  }

  await setStorefront(root, storefront);
  signal?.throwIfAborted();
  return storefront;
}
