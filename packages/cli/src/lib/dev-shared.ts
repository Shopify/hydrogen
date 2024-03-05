import {Config} from '@oclif/core';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputInfo,
  outputContent,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {startTunnelPlugin, pollTunnelURL} from './tunneling.js';
import {runConfigPush} from '../commands/hydrogen/customer-accounts-api-config/push.js';

export async function startTunnelAndPushConfig(
  root: string,
  cliConfig: Config,
  port: number,
  storefrontId?: string,
) {
  outputInfo('\nStarting tunnel...\n');

  const tunnel = await startTunnelPlugin(cliConfig, port, 'cloudflare');
  const host = await pollTunnelURL(tunnel);

  await runConfigPush({
    path: root,
    devOrigin: host,
    storefrontId,
  });

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
