import {Config} from '@oclif/core';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputInfo,
  outputContent,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  getStorefrontId,
  runCustomerAccountPush,
} from '../commands/hydrogen/customer-account-push.js';
import {getLocalVariables} from '../lib/environment-variables.js';
import {startTunnelPlugin, pollTunnelURL} from './tunneling.js';
import {getConfig} from './shopify-config.js';
import {getGraphiQLUrl} from './graphiql-url.js';

export function isMockShop(envVariables: Record<string, string>) {
  return (
    envVariables.PUBLIC_STORE_DOMAIN === 'mock.shop' ||
    // We fallback to mock.shop if the env var is falsy.
    // When it's undefined, it might be overwritten by remote variables.
    envVariables.PUBLIC_STORE_DOMAIN === ''
  );
}

export function notifyIssueWithTunnelAndMockShop(cliCommand: string) {
  renderInfo({
    headline:
      'Using mock.shop with `--customer-account-push` flag is not supported',
    body: 'The functionalities of this flag are disabled.',
    nextSteps: [
      'You may continue knowing Customer Account API (/account) interactions will fail.',
      [
        'Or run',
        {command: `${cliCommand} env pull`},
        'to link to your store credentials.',
      ],
    ],
  });
}

export async function getDevConfigInBackground(
  root: string,
  customerAccountPushFlag: boolean,
  envFile: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const {variables: localVariables} = await getLocalVariables(root, envFile);
  signal?.throwIfAborted();
  const customerAccountPush =
    customerAccountPushFlag && !isMockShop(localVariables);

  // Linking can update the project config, so finish it before reading that config.
  if (customerAccountPush) {
    await getStorefrontId(root, undefined, signal);
  }

  signal?.throwIfAborted();
  const {shop, storefront} = await getConfig(root);
  signal?.throwIfAborted();
  const storefrontId = storefront?.id;

  return {
    storefrontId,
    customerAccountPush,
    fetchRemote: !!shop && !!storefrontId,
    localVariables,
    storefrontTitle: storefront?.title,
  };
}

export const TUNNEL_DOMAIN = Object.freeze({
  ORIGINAL: '.trycloudflare.com',
  REBRANDED: '.tryhydrogen.dev',
});

export async function startTunnelAndPushConfig(
  root: string,
  cliConfig: Config,
  port: number,
  storefrontId?: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  outputInfo('\nStarting tunnel...\n');

  const tunnel = await startTunnelPlugin(cliConfig, port, 'cloudflare');
  try {
    const host = await pollTunnelURL(tunnel, signal).then((host) =>
      // Replace branded tunnel domain:
      host.replace(TUNNEL_DOMAIN.ORIGINAL, TUNNEL_DOMAIN.REBRANDED),
    );
    signal?.throwIfAborted();

    const cleanup = await runCustomerAccountPush({
      path: root,
      devOrigin: host,
      storefrontId,
      signal,
    }).catch((error) => {
      signal?.throwIfAborted();
      if (error instanceof AbortError) {
        renderInfo({
          headline: 'Customer Account Application setup update fail.',
          body: error.tryMessage || undefined,
          nextSteps: error.nextSteps,
        });
      }
    });

    return {
      host,
      cleanup: async () => {
        tunnel.stopTunnel();
        await cleanup?.();
      },
    };
  } catch (error) {
    tunnel.stopTunnel();
    throw error;
  }
}

export function getDebugBannerLine(publicInspectorPort: number) {
  const isVSCode = process.env.TERM_PROGRAM === 'vscode';
  const debuggingDocsLink =
    'https://h2o.fyi/debugging/server-code' +
    (isVSCode ? '#visual-studio-code' : '#step-2-attach-a-debugger');

  return outputContent`Debugging enabled on port ${String(
    publicInspectorPort,
  )}.\nAttach a ${outputToken.link(
    colors.yellow(isVSCode ? 'VSCode debugger' : 'debugger'),
    debuggingDocsLink,
  )} or open DevTools in http://127.0.0.1:${String(publicInspectorPort)}.`
    .value;
}

export function getUtilityBannerlines(host: string, localHost?: string) {
  host = host.endsWith('/') ? host.slice(0, -1) : host;
  const toolHost = localHost ? localHost.replace(/\/$/, '') : host;

  return [
    `View GraphiQL API browser: \n${getGraphiQLUrl({
      host: toolHost,
    })}`,
    `View server network requests: \n${toolHost}/subrequest-profiler`,
  ].map((value, index) => ({
    subdued: `${index === 0 ? '' : '\n\n'}${value}`,
  }));
}
