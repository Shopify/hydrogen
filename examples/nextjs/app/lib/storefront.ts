import "server-only";
import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import { createStorefrontClient, createStorefrontRequestContext } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

// Accesses the `headers()` request-time API, so it cannot be used inside a
// `use cache` boundary (https://nextjs.org/docs/app/api-reference/directives/use-cache).
// To cache data that depends on request-time APIs, use `use cache: private`
// (https://nextjs.org/docs/app/api-reference/directives/use-cache-private).
// Example: fetching the buyer's cart or logged-in customer data.
export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createStorefrontRequestContext({ headers: requestHeaders });

  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      privateStorefrontToken: getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(requestHeaders),
      requestContext,
    },
  });
});

// Accesses no request-time APIs, so it can be marked cacheable with `use cache`
// (https://nextjs.org/docs/app/api-reference/directives/use-cache).
// Example: rendering non-personalized product, collection, or blog pages.
export const sharedRateLimitStorefrontClient = createStorefrontClient({
  type: "private_shared_rate_limit",
  config: {
    storeDomain: storefrontConfig.storeDomain,
    i18n: storefrontConfig.i18n,
    privateStorefrontToken: getPrivateStorefrontToken(),
  },
});
