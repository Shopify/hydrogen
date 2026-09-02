import {
  createShopifyRequestContext,
  createStorefrontClient,
  type StorefrontClient,
} from "@shopify/hydrogen";

export function createStorefrontApiClient(storefrontDomain: string): StorefrontClient {
  const requestContext = createShopifyRequestContext({
    request: new Request(storefrontDomain),
    i18n: { country: "US", language: "EN" },
  });

  return createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: storefrontDomain,
      publicStorefrontToken: undefined,
    },
  });
}
