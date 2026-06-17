import { storefrontConfig } from "@shared/config";
import { createStorefrontClient } from "@shopify/hydrogen";

/**
 * Browser-side SFAPI client for client navigations and useAsyncData refetches.
 * Routes GraphQL through the same-origin kit proxy instead of the remote store domain.
 */
export default defineNuxtPlugin(() => {
  const storefrontClient = createStorefrontClient({
    type: "public",
    config: {
      ...storefrontConfig,
      fetch: (input, init) => {
        const requestUrl = new URL(
          typeof input === "string" ? input : input instanceof Request ? input.url : String(input),
        );
        const proxyUrl = new URL(requestUrl.pathname + requestUrl.search, window.location.origin);
        return fetch(proxyUrl, init);
      },
    },
  });

  return {
    provide: {
      storefrontClient,
    },
  };
});
