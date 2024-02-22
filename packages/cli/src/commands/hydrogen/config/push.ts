import path from 'node:path';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {
  renderSuccess,
  renderWarning,
  renderFatalError,
} from '@shopify/cli-kit/node/ui';
import {linkStorefront} from '../link.js';
import {commonFlags} from '../../../lib/flags.js';
import {getCliCommand} from '../../../lib/shell.js';
import {AdminSession, login} from '../../../lib/auth.js';
import {getConfig, type ShopifyConfig} from '../../../lib/shopify-config.js';
import {replaceCustomerApplicationUrls} from '../../../lib/graphql/admin/customer-application-update.js';
import {FatalErrorType} from '@shopify/cli-kit/node/error';

export default class ConfigPush extends Command {
  static description = 'Push project configuration to admin';

  static flags = {
    path: commonFlags.path,
    storefrontId: Flags.string({
      description:
        "The id of the storefront the configuration should be pushed to. Must start with 'gid://shopify/HydrogenStorefront/'",
      aliases: ['storefront-id'],
    }),
    developmentOrigin: Flags.string({
      description: 'The development domain of your application.',
      aliases: ['dev-origin'],
      required: true,
    }),
    redirectUriRelativeUrl: Flags.string({
      description:
        "The relative url of allowed callback url for Customer Account API OAuth flow. Default is '/account/authorize'",
      aliases: ['relative-redirect-uri'],
    }),
    logoutUriRelativeUrl: Flags.string({
      description:
        'The relative url of allowed url that will be redirected to post-logout for Customer Account API OAuth flow. Default to nothing.',
      aliases: ['relative-logout-uri'],
    }),
    removeRegex: Flags.string({
      description:
        "A regular express of all the urls that should be remove before new url are added. Default is '^https://.*.trycloudflare.com.*$'",
      aliases: ['remove-regex'],
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(ConfigPush);
    await runConfigPush(flags);
  }
}

export async function runConfigPush({
  path: root = process.cwd(),
  storefrontId: storefrontIdFromFlag,
  developmentOrigin,
  redirectUriRelativeUrl = '/account/authorize',
  logoutUriRelativeUrl,
  removeRegex = '^https://.*.trycloudflare.com.*$',
}: {
  path?: string;
  storefrontId?: string;
  developmentOrigin: string;
  redirectUriRelativeUrl?: string;
  logoutUriRelativeUrl?: string;
  removeRegex?: string;
}) {
  const {session, config} = await login(root);
  const storefrontId = await getStorefrontId(
    root,
    session,
    config,
    storefrontIdFromFlag,
  );

  if (!storefrontId) {
    renderFatalError({
      name: 'error',
      type: FatalErrorType.Abort,
      message: `No storefrontId was found`,
      skipOclifErrorHandling: true,
      tryMessage: 'Run running command with `--storefront-id` flag',
    });
    return;
  }

  const redirectUri = redirectUriRelativeUrl
    ? new URL(redirectUriRelativeUrl, developmentOrigin).toString()
    : developmentOrigin;
  const javascriptOrigin = developmentOrigin;
  const logoutUri = logoutUriRelativeUrl
    ? new URL(logoutUriRelativeUrl, developmentOrigin).toString()
    : developmentOrigin;

  if (!redirectUri && !javascriptOrigin && !logoutUri) {
    renderWarning({
      body: 'No urls was updated.',
    });
    return;
  }

  const {success} = await replaceCustomerApplicationUrls(
    session,
    storefrontId,
    {
      redirectUri: {
        add: redirectUri ? [redirectUri] : undefined,
        removeRegex,
      },
      javascriptOrigin: {
        add: javascriptOrigin ? [javascriptOrigin] : undefined,
        removeRegex,
      },
      logoutUris: {
        add: logoutUri ? [logoutUri] : undefined,
        removeRegex,
      },
    },
  );

  if (!success) {
    renderWarning({
      headline: 'Customer Account Application setup update fail.',
      body: [
        'Customer Account API Oauth requires your application urls to be included in the setup.\n\n',
        'Do this manually in Shopify admin >> Hydrogen Channel >> Storefront >> Customer Account API >> Application setup',
      ],
    });
    return;
  }

  renderSuccess({
    headline: "Hydrogen storefront's Customer Account application setup:",
    body: {
      list: {
        items: [
          redirectUri ? `Callback URI: ${redirectUri}\n` : '',
          javascriptOrigin ? `Javascript origin: ${javascriptOrigin}\n` : '',
          logoutUri ? `Logout URI: ${logoutUri}` : '',
        ],
      },
    },
  });
}

async function getStorefrontId(
  root: string,
  session: AdminSession,
  config: ShopifyConfig,
  storefrontIdFromFlag?: string,
) {
  if (storefrontIdFromFlag) return storefrontIdFromFlag;

  if (config.storefront?.id) return config.storefront.id;

  const cliCommand = await getCliCommand();

  const linkedStore = await linkStorefront(root, session, config, {
    cliCommand,
  });

  if (!linkedStore) {
    return;
  }

  const newConfig = await getConfig(root);
  return newConfig.storefront?.id;
}
