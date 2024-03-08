import {Config} from '@oclif/core';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputInfo,
  outputContent,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {runCustomerAccountPush} from '../commands/hydrogen/customer-account/push.js';
import {getLocalVariables} from '../lib/environment-variables.js';
import {getCliCommand} from '../lib/shell.js';
import {startTunnelPlugin, pollTunnelURL} from './tunneling.js';

export async function checkMockShopAndByPassTunnel(
  root: string,
  customerAccountPushFlag: boolean,
) {
  if (customerAccountPushFlag) {
    const {variables} = await getLocalVariables(root);

    if (
      variables?.PUBLIC_STORE_DOMAIN &&
      variables?.PUBLIC_STORE_DOMAIN.includes('mock.shop')
    ) {
      const cliCommand = await getCliCommand();

      renderInfo({
        headline:
          'Using mock.shop with `--customer-account-push` flag is not supported',
        body: 'The functionalities of this flag had been removed.',
        nextSteps: [
          'You may continue knowing Customer Account API (/account) interactions will fail.',
          [
            'Or run',
            {
              command: `${cliCommand} env pull`,
            },
            'to link to your store credentials.',
          ],
        ],
      });

      return false;
    }
  }

  return customerAccountPushFlag;
}

export async function startTunnelAndPushConfig(
  root: string,
  cliConfig: Config,
  port: number,
  storefrontId?: string,
) {
  outputInfo('\nStarting tunnel...\n');

  const tunnel = await startTunnelPlugin(cliConfig, port, 'cloudflare');
  const host = await pollTunnelURL(tunnel);

  try {
    await runCustomerAccountPush({
      path: root,
      devOrigin: host,
      storefrontId,
    });
  } catch (error) {
    if (error instanceof AbortError) {
      renderInfo({
        headline: 'Customer Account Application setup update fail.',
        body: error.tryMessage || undefined,
        nextSteps: error.nextSteps,
      });
    }
  }

  return host;
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
  )} or open DevTools in http://localhost:${String(publicInspectorPort)}.`
    .value;
}
