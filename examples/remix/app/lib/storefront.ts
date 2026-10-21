import {
  Cache,
  createStorefrontClient,
  type CachingStrategy,
  type GraphQLFormattedError,
  type ShopifyRequestContextWithBuyerIp,
  type StorefrontClient,
} from "@shopify/hydrogen";

import type { Runtime } from "../env.ts";

/**
 * One Storefront client per request. With a private token, the client forwards the
 * trusted buyer IP for buyer-aware SSR; without one, it falls back to the public token
 * so the example runs from `.env.example` alone.
 */
export function createAppStorefrontClient(
  runtime: Runtime,
  requestContext: ShopifyRequestContextWithBuyerIp,
): AppStorefrontClient {
  const { env, cache, waitUntil } = runtime;
  const privateToken = env.PRIVATE_STOREFRONT_API_TOKEN;

  if (privateToken) {
    return createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain: env.PUBLIC_STORE_DOMAIN,
        storefrontId: env.PUBLIC_STOREFRONT_ID,
        privateStorefrontToken: privateToken,
        cache,
        waitUntil,
      },
    });
  }

  return createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      storefrontId: env.PUBLIC_STOREFRONT_ID,
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN || undefined,
      cache,
      waitUntil,
    },
  });
}

/** A request-scoped client, private or public, with Storefront API caching enabled. */
export type AppStorefrontClient = StorefrontClient<{ cache?: CachingStrategy }>;

/** Catalog reads: serve from cache for a second, revalidate in the background for a day. */
export function catalogCache(): CachingStrategy {
  return Cache({ maxAge: 1, staleWhileRevalidate: 86_399 });
}

/** Shop-wide content that rarely changes, such as menus and policies. */
export function contentCache(): CachingStrategy {
  return Cache.long();
}

/**
 * Transport failures throw from `graphql()`. GraphQL errors are returned, so pages that
 * can't render without the data call this to fail loudly instead of rendering a blank page.
 */
export function requireData<Data>(result: {
  data: Data | null;
  errors?: GraphQLFormattedError[];
}): Data {
  if (result.errors?.length || result.data === null) {
    throw new Error(
      `Storefront API query failed: ${result.errors?.map((error) => error.message).join("; ") ?? "no data"}`,
      { cause: result.errors },
    );
  }
  return result.data;
}
