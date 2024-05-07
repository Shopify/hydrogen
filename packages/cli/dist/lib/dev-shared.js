import colors from '@shopify/cli-kit/node/colors';
import { outputInfo, outputContent, outputToken } from '@shopify/cli-kit/node/output';
import { renderInfo } from '@shopify/cli-kit/node/ui';
import { AbortError } from '@shopify/cli-kit/node/error';
import { getStorefrontId, runCustomerAccountPush } from '../commands/hydrogen/customer-account/push.js';
import { getLocalVariables } from '../lib/environment-variables.js';
import { startTunnelPlugin, pollTunnelURL } from './tunneling.js';
import { getConfig } from './shopify-config.js';
import { getGraphiQLUrl } from './graphiql-url.js';

function isMockShop(envVariables) {
  return envVariables.PUBLIC_STORE_DOMAIN === "mock.shop" || // We fallback to mock.shop if the env var is falsy.
  // When it's undefined, it might be overwritten by remote variables.
  envVariables.PUBLIC_STORE_DOMAIN === "";
}
function notifyIssueWithTunnelAndMockShop(cliCommand) {
  renderInfo({
    headline: "Using mock.shop with `--customer-account-push` flag is not supported",
    body: "The functionalities of this flag are disabled.",
    nextSteps: [
      "You may continue knowing Customer Account API (/account) interactions will fail.",
      [
        "Or run",
        { command: `${cliCommand} env pull` },
        "to link to your store credentials."
      ]
    ]
  });
}
function getDevConfigInBackground(root, customerAccountPushFlag) {
  return getLocalVariables(root).then(async ({ variables: localVariables }) => {
    const customerAccountPush = customerAccountPushFlag && !isMockShop(localVariables);
    if (customerAccountPush) {
      await getStorefrontId(root);
    }
    const { shop, storefront } = await getConfig(root);
    const storefrontId = storefront?.id;
    return {
      storefrontId,
      customerAccountPush,
      fetchRemote: !!shop && !!storefrontId,
      localVariables,
      storefrontTitle: storefront?.title
    };
  });
}
const TUNNEL_DOMAIN = Object.freeze({
  ORIGINAL: ".trycloudflare.com",
  REBRANDED: ".tryhydrogen.dev"
});
async function startTunnelAndPushConfig(root, cliConfig, port, storefrontId) {
  outputInfo("\nStarting tunnel...\n");
  const tunnel = await startTunnelPlugin(cliConfig, port, "cloudflare");
  const host = await pollTunnelURL(tunnel).then(
    (host2) => (
      // Replace branded tunnel domain:
      host2.replace(TUNNEL_DOMAIN.ORIGINAL, TUNNEL_DOMAIN.REBRANDED)
    )
  );
  const cleanup = await runCustomerAccountPush({
    path: root,
    devOrigin: host,
    storefrontId
  }).catch((error) => {
    if (error instanceof AbortError) {
      renderInfo({
        headline: "Customer Account Application setup update fail.",
        body: error.tryMessage || void 0,
        nextSteps: error.nextSteps
      });
    }
  });
  return { host, cleanup };
}
function getDebugBannerLine(publicInspectorPort) {
  const isVSCode = process.env.TERM_PROGRAM === "vscode";
  const debuggingDocsLink = "https://h2o.fyi/debugging/server-code" + (isVSCode ? "#visual-studio-code" : "#step-2-attach-a-debugger");
  return outputContent`Debugging enabled on port ${String(
    publicInspectorPort
  )}.\nAttach a ${outputToken.link(
    colors.yellow(isVSCode ? "VSCode debugger" : "debugger"),
    debuggingDocsLink
  )} or open DevTools in http://localhost:${String(publicInspectorPort)}.`.value;
}
function getUtilityBannerlines(host) {
  host = host.endsWith("/") ? host.slice(0, -1) : host;
  return [
    `View GraphiQL API browser: 
${getGraphiQLUrl({
      host
    })}`,
    `View server network requests: 
${host}/subrequest-profiler`
  ].map((value, index) => ({
    subdued: `${index === 0 ? "" : "\n\n"}${value}`
  }));
}

export { TUNNEL_DOMAIN, getDebugBannerLine, getDevConfigInBackground, getUtilityBannerlines, isMockShop, notifyIssueWithTunnelAndMockShop, startTunnelAndPushConfig };
