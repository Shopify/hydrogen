// Ensure fetch is replaced as appropriate, so that we can support HTTP proxies.
import 'cross-fetch/polyfill';

import {setGlobalDispatcher, ProxyAgent} from 'undici';
import {createGlobalProxyAgent} from 'global-agent';

export function enableProxySupport(): void {
  // Get the proxy server from the possible environment variables.
  const proxyServer =
    process.env['SHOPIFY_HTTP_PROXY'] ??
    process.env['SHOPIFY_HTTPS_PROXY'] ??
    null;

  // If no proxy server setting is available, bail out.
  if (proxyServer === null) {
    return;
  }

  // Configure undici to use a proxy server.
  const proxyAgent = new ProxyAgent(proxyServer);
  setGlobalDispatcher(proxyAgent);

  // Optionally configure `global-agent` if the global dispatcher is not already configured.
  if (!('GLOBAL_AGENT' in globalThis)) {
    createGlobalProxyAgent({
      environmentVariableNamespace: 'SHOPIFY_',
      socketConnectionTimeout: 60000,
    });
  }
}
