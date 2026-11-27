import {
  createShopifyRequestContext,
  createStorefrontClient,
  type CacheInstance,
  type PublicStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";

import { getBuyerIp } from "./buyer-ip.ts";
import { i18n } from "./config.ts";
import {
  resolveStorefrontMode,
  toStorefrontModeView,
  type StorefrontModeView,
} from "./storefront-mode.ts";

export type RequestStorefrontClient = PublicStorefrontClient | RequestScopedPrivateStorefrontClient;

export type RequestStorefront = {
  requestContext: ShopifyRequestContext;
  storefrontClient: RequestStorefrontClient;
  /** Safe to keep on request locals: it never carries the private token. */
  storefront: StorefrontModeView;
};

let warnedAboutMockShop = false;

/**
 * Picks mock.shop or the private store from `env` and creates the request's Storefront client.
 * The private token stays inside this function.
 */
export function createRequestStorefront({
  env,
  request,
  cache,
}: {
  env: Record<string, string | undefined>;
  request: Request;
  cache?: CacheInstance;
}): RequestStorefront {
  const storefront = resolveStorefrontMode(env);

  if (storefront.mode === "mock") {
    warnAboutMockShop(storefront.storeDomain);
    const requestContext = createShopifyRequestContext({ request, i18n });
    const storefrontClient = createStorefrontClient({
      type: "public",
      requestContext,
      config: { storeDomain: storefront.storeDomain, cache },
    });
    return { requestContext, storefrontClient, storefront: toStorefrontModeView(storefront) };
  }

  const requestContext = createShopifyRequestContext({
    request,
    i18n,
    buyerIp: getBuyerIp(request.headers),
  });
  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: storefront.storeDomain,
      privateStorefrontToken: storefront.privateStorefrontToken,
      cache,
    },
  });
  return { requestContext, storefrontClient, storefront: toStorefrontModeView(storefront) };
}

function warnAboutMockShop(storeDomain: string) {
  if (warnedAboutMockShop) return;
  warnedAboutMockShop = true;
  console.warn(
    `[hydrogen example] Using ${storeDomain} with Customer Accounts and Shopify analytics off, ` +
      `because PRIVATE_STOREFRONT_API_TOKEN is missing, MOCK_SHOP=1, or PUBLIC_STORE_DOMAIN is a mock.shop domain. ` +
      `Run "pnpm run examples:secrets:decrypt" to use the shared private store.`,
  );
}
