import {fanoutHooks} from '@shopify/cli-kit/node/plugins';
import {outputDebug} from '@shopify/cli-kit/node/output';
import {AbortError, BugError} from '@shopify/cli-kit/node/error';
import {setTimeout} from 'node:timers/promises';

import type {Config} from '@oclif/core';
import type {TunnelClient} from '@shopify/cli-kit/node/plugins/tunnel';

export async function startTunnelPlugin(
  config: Config,
  port: number,
  provider: string,
): Promise<TunnelClient> {
  // Shopify CLI 4.9 bundles the Cloudflare tunnel_start hook in its root plugin.
  // Registering plugin-cloudflare again in Hydrogen would start duplicate tunnels.
  const hooks = await fanoutHooks(config, 'tunnel_start', {port, provider});
  const results = Object.values(hooks).filter(
    (tunnelResponse) =>
      !tunnelResponse?.isErr() ||
      tunnelResponse.error.type !== 'invalid-provider',
  );
  const first = results[0];
  if (!first)
    throw new BugError(`We couldn't find the ${provider} tunnel plugin`);
  if (first.isErr())
    throw new AbortError(
      `${provider} failed to start the tunnel.\n${first.error.message}`,
    );
  return first.value;
}

/**
 * Poll the tunnel provider every 0.5 seconds until a URL or error is returned.
 */
export async function pollTunnelURL(
  tunnelClient: TunnelClient,
  signal?: AbortSignal,
): Promise<string> {
  let retries = 0;
  while (true) {
    signal?.throwIfAborted();
    const result = tunnelClient.getTunnelStatus();
    outputDebug(
      `Polling tunnel status for ${tunnelClient.provider} (attempt ${retries}): ${result.status}`,
    );
    if (result.status === 'error')
      throw new AbortError(result.message, result.tryMessage);
    if (result.status === 'connected') return result.url;
    retries += 1;
    await setTimeout(500, undefined, {signal});
  }
}
