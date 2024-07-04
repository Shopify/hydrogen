import { fanoutHooks } from '@shopify/cli-kit/node/plugins';
import { outputDebug } from '@shopify/cli-kit/node/output';
import { BugError, AbortError } from '@shopify/cli-kit/node/error';

async function startTunnelPlugin(config, port, provider) {
  const hooks = await fanoutHooks(config, "tunnel_start", { port, provider });
  const results = Object.values(hooks).filter(
    (tunnelResponse) => !tunnelResponse?.isErr() || tunnelResponse.error.type !== "invalid-provider"
  );
  const first = results[0];
  if (!first)
    throw new BugError(`We couldn't find the ${provider} tunnel plugin`);
  if (first.isErr())
    throw new AbortError(
      `${provider} failed to start the tunnel.
${first.error.message}`
    );
  return first.value;
}
async function pollTunnelURL(tunnelClient) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const pollTunnelStatus = async () => {
      const result = tunnelClient.getTunnelStatus();
      outputDebug(
        `Polling tunnel status for ${tunnelClient.provider} (attempt ${retries}): ${result.status}`
      );
      if (result.status === "error")
        return reject(new AbortError(result.message, result.tryMessage));
      if (result.status === "connected") {
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

export { pollTunnelURL, startTunnelPlugin };
