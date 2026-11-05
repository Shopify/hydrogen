import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {customerAccountPushJsonOutputSchema} from '../../lib/customer-account/types.js';
import Command from '../../lib/hydrogen-command.js';
import {Flags} from '@oclif/core';
import {AbortError} from '@shopify/cli-kit/node/error';
import {outputDebug} from '@shopify/cli-kit/node/output';
import {linkStorefront} from './link.js';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {getCliCommand} from '../../lib/shell.js';
import {type AdminSession, login} from '../../lib/auth.js';
import {
  type ShopifyConfig,
  getConfig,
  setCustomerAccountConfig,
} from '../../lib/shopify-config.js';
import {replaceCustomerApplicationUrls} from '../../lib/graphql/admin/customer-application-update.js';

type CustomerAccountConfig = NonNullable<
  NonNullable<ShopifyConfig['storefront']>['customerAccountConfig']
>;

export default class CustomerAccountPush extends Command {
  static get jsonOutputSchema(): typeof customerAccountPushJsonOutputSchema {
    return customerAccountPushJsonOutputSchema;
  }

  static descriptionWithMarkdown = 'Push project configuration to admin';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
    'storefront-id': Flags.string({
      description:
        "The id of the storefront the configuration should be pushed to. Must start with 'gid://shopify/HydrogenStorefront/'",
    }),
    'dev-origin': Flags.string({
      description: 'The development domain of your application.',
      required: true,
    }),
    'javascript-origin': Flags.string({
      description:
        'The origin to register as the allowed JavaScript origin for the Customer Account API OAuth flow. Defaults to --dev-origin. Must not include a port (Shopify rejects origins with ports); use this to register a portless origin while keeping a portful --dev-origin.',
    }),
    'relative-redirect-uri': Flags.string({
      description:
        "The relative url of allowed callback url for Customer Account API OAuth flow. Default is '/account/authorize'",
    }),
    'relative-logout-uri': Flags.string({
      description:
        'The relative url of allowed url that will be redirected to post-logout for Customer Account API OAuth flow. Default to nothing.',
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(CustomerAccountPush);
    const outcome = await pushCustomerAccountConfig({
      ...flagsToCamelObject(flags),
      redirectUriRelativeUrl: flags['relative-redirect-uri'],
      logoutUriRelativeUrl: flags['relative-logout-uri'],
    });
    writeJsonResult(
      customerAccountPushJsonOutputSchema,
      outcome.result,
      flags.json,
    );
  }
}

/** Compatibility entry point used by the dev server to remove temporary URLs. */
export async function runCustomerAccountPush(
  options: Parameters<typeof pushCustomerAccountConfig>[0],
) {
  return (await pushCustomerAccountConfig(options)).cleanup;
}

export async function pushCustomerAccountConfig({
  path: root = process.cwd(),
  storefrontId: storefrontIdFromFlag,
  devOrigin,
  javascriptOrigin: javascriptOriginFromArg,
  redirectUriRelativeUrl = '/account/authorize',
  logoutUriRelativeUrl,
  signal,
}: {
  path?: string;
  storefrontId?: string;
  devOrigin: string;
  javascriptOrigin?: string;
  redirectUriRelativeUrl?: string;
  logoutUriRelativeUrl?: string;
  removeRegex?: string;
  signal?: AbortSignal;
}) {
  const storefrontId = await getStorefrontId(
    root,
    storefrontIdFromFlag,
    signal,
  );

  try {
    if (!storefrontId) {
      throw new Error(
        'No storefrontId was found in --storefront-id flag or .shopify/project.json',
      );
    }

    const redirectUri = redirectUriRelativeUrl
      ? new URL(redirectUriRelativeUrl, devOrigin).toString()
      : devOrigin;
    const javascriptOrigin = javascriptOriginFromArg ?? devOrigin;
    const logoutUri = logoutUriRelativeUrl
      ? new URL(logoutUriRelativeUrl, devOrigin).toString()
      : devOrigin;
    const result = customerAccountPushJsonOutputSchema.validate({
      storefrontGid: storefrontId,
      redirectUri,
      javascriptOrigin,
      logoutUri,
    });

    const {session, config} = await login(root, undefined, signal);
    const customerAccountConfig =
      config?.storefront?.id === storefrontId
        ? config.storefront.customerAccountConfig
        : undefined;
    const urls = {redirectUri, javascriptOrigin, logoutUri};
    signal?.throwIfAborted();
    // Finish side effects before cancellation so their rollback has a known result.
    const {success, userErrors} = await replaceCustomerApplicationUrls(
      session,
      storefrontId,
      {
        redirectUri: {
          add: [redirectUri],
          removeRegex: customerAccountConfig?.redirectUri,
        },
        javascriptOrigin: {
          add: [javascriptOrigin],
          removeRegex: customerAccountConfig?.javascriptOrigin,
        },
        logoutUris: {
          add: [logoutUri],
          removeRegex: customerAccountConfig?.logoutUri,
        },
      },
    );

    if (!success || userErrors.length) {
      const error: any = new Error(
        'Customer Account Application setup update fail.',
      );
      error.userErrors = userErrors;
      throw error;
    }

    if (signal?.aborted) {
      await cleanupCustomerApplicationUrls(
        session,
        storefrontId,
        urls,
        customerAccountConfig,
      );
      signal.throwIfAborted();
    }
    try {
      await setCustomerAccountConfig(root, urls);
    } catch (error) {
      await cleanupCustomerApplicationUrls(
        session,
        storefrontId,
        urls,
        customerAccountConfig,
      );
      throw error;
    }

    return {
      result,
      cleanup: () =>
        cleanupCustomerApplicationUrls(session, storefrontId, {
          redirectUri,
          javascriptOrigin,
          logoutUri,
        }),
    };
  } catch (error: any) {
    signal?.throwIfAborted();
    let confidentialAccessFound = false;

    const errors: string[] = error?.userErrors?.length
      ? error.userErrors.map(
          (value: {message: string; field: [string]; code: string}) => {
            if (
              /Javascript origin is not allowed for this application type/i.test(
                value.message,
              )
            ) {
              confidentialAccessFound = true;
            }
            return `${value.field}: ${value.message}`;
          },
        )
      : error.message
        ? [error.message]
        : [];

    const nextSteps = [
      {
        link: {
          label: 'Manually update application setup',
          url: 'https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#update-the-application-setup',
        },
      },
    ];

    if (confidentialAccessFound) {
      nextSteps.unshift({
        link: {
          label: 'Enable Public access for Hydrogen',
          url: 'https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/getting-started#step-1-enable-customer-account-api-access',
        },
      });
    }

    throw new AbortError(
      'Customer Account Application setup update fail.',
      errors.length
        ? [
            {
              list: {
                title: 'The following error occurs during update:',
                items: errors.map(
                  (value, index) => `${index != 0 ? '\n\n' : ''}${value}`,
                ),
              },
            },
          ]
        : undefined,
      nextSteps,
    );
  }
}

/**
 * Removes Customer Application URLs, optionally restoring the previous config.
 */
async function cleanupCustomerApplicationUrls(
  session: AdminSession,
  storefrontId: string,
  customerAccountConfig: CustomerAccountConfig = {},
  previousConfig?: CustomerAccountConfig,
) {
  if (!Object.values(customerAccountConfig).some(Boolean)) return;

  outputDebug(
    `Cleaning up Customer Application url "${customerAccountConfig.redirectUri}"`,
  );

  await replaceCustomerApplicationUrls(session, storefrontId, {
    redirectUri: {
      removeRegex: customerAccountConfig.redirectUri,
      ...(previousConfig?.redirectUri
        ? {add: [previousConfig.redirectUri]}
        : {}),
    },
    javascriptOrigin: {
      removeRegex: customerAccountConfig.javascriptOrigin,
      ...(previousConfig?.javascriptOrigin
        ? {add: [previousConfig.javascriptOrigin]}
        : {}),
    },
    logoutUris: {
      removeRegex: customerAccountConfig.logoutUri,
      ...(previousConfig?.logoutUri ? {add: [previousConfig.logoutUri]} : {}),
    },
  }).catch((error) => {
    outputDebug(
      `Failed to clean up Customer Application url "${customerAccountConfig.redirectUri}":\n${error?.message}`,
    );
  });
}

export async function getStorefrontId(
  root: string,
  storefrontIdFromFlag?: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (storefrontIdFromFlag) return storefrontIdFromFlag;

  const {session, config} = await login(root, undefined, signal);

  if (config.storefront?.id) return config.storefront.id;

  const cliCommand = await getCliCommand();
  signal?.throwIfAborted();

  // Keep the session owned until storefront creation and config writes settle.
  const linkedStore = await linkStorefront(root, session, config, {
    cliCommand,
    signal,
  });

  if (!linkedStore) {
    return;
  }

  const newConfig = await getConfig(root);
  return newConfig.storefront?.id;
}
