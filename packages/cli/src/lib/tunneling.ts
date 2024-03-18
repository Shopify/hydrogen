import {fanoutHooks} from '@shopify/cli-kit/node/plugins';
import {outputDebug} from '@shopify/cli-kit/node/output';
import {AbortError, BugError} from '@shopify/cli-kit/node/error';

import type {Config} from '@oclif/core';
import type {TunnelClient} from '@shopify/cli-kit/node/plugins/tunnel';

export async function startTunnelPlugin(
  config: Config,
  port: number,
  provider: string,
): Promise<TunnelClient> {
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
 * Poll the tunnel provider every 0.5 until an URL or error is returned.
 */
export async function pollTunnelURL(
  tunnelClient: TunnelClient,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let retries = 0;
    const pollTunnelStatus = async () => {
      const result = tunnelClient.getTunnelStatus();
      outputDebug(
        `Polling tunnel status for ${tunnelClient.provider} (attempt ${retries}): ${result.status}`,
      );
      if (result.status === 'error')
        return reject(new AbortError(result.message, result.tryMessage));
      if (result.status === 'connected') {
        resolve(result.url);
      } else {
        retries += 1;
        startPolling();
      }
    };
    const startPolling = () => {
      setTimeout(pollTunnelStatus, 500);
    };

    pollTunnelStatus();
  });
}
