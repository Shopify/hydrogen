import {
  type CacheInstance,
  createShopifyRequestContext,
  createStorefrontClient,
  type I18nConfig,
  type PrivateNoBuyerContextStorefrontClient,
  type PublicStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
} from "@shopify/hydrogen";

import { getBuyerIp } from "./buyer-ip";
import type { ResolvedStorefrontConfig } from "./storefront-config";

/**
 * Builds the server Storefront clients from a `ResolvedStorefrontConfig`.
 *
 * - `mode: "private"` (real store): private token, `storefrontId`, and for the
 *   per-request client a trusted buyer IP from `x-forwarded-for`.
 * - `mode: "mock"` (mock.shop): tokenless public access. mock.shop is auth-free
 *   and rejects any private token, and no buyer IP is required.
 *
 * Not `server-only`: `proxy.ts` (middleware) imports it. Never pass a public
 * token here — the browser client lives in `public-storefront.ts`.
 */

type StorefrontRequest = Pick<Request, "headers"> &
  Partial<Pick<Request, "method" | "signal" | "url">>;

type ClientInput = {
  config: ResolvedStorefrontConfig;
  request: StorefrontRequest;
  i18n: I18nConfig;
};

export type StaticStorefrontClient = PublicStorefrontClient | PrivateNoBuyerContextStorefrontClient;

/** Shared-rate-limit client: no buyer IP, so no `headers()` dependency. */
export function createStaticStorefrontClient({
  config,
  request,
  i18n,
}: ClientInput): StaticStorefrontClient {
  const requestContext = createShopifyRequestContext({ request, i18n });

  if (config.mode === "mock") {
    return createStorefrontClient({
      type: "public",
      requestContext,
      config: { storeDomain: config.storeDomain },
    });
  }

  return createStorefrontClient({
    type: "private_no_buyer_context",
    requestContext,
    config: {
      storeDomain: config.storeDomain,
      privateStorefrontToken: config.privateStorefrontToken,
      storefrontId: config.storefrontId,
    },
  });
}

type RequestClientInput = ClientInput & {
  cache?: CacheInstance;
  waitUntil?: (promise: Promise<unknown>) => void;
};

type RequestClientExtra = Record<string, unknown>;

export type RequestStorefrontClient =
  | PublicStorefrontClient<RequestClientExtra>
  | RequestScopedPrivateStorefrontClient<RequestClientExtra>;

/** Per-buyer client: forwards the buyer IP only when a real store needs it. */
export function createRequestStorefrontClient({
  config,
  request,
  i18n,
  cache,
  waitUntil,
}: RequestClientInput): RequestStorefrontClient {
  if (config.mode === "mock") {
    return createStorefrontClient({
      type: "public",
      requestContext: createShopifyRequestContext({ request, i18n }),
      config: { storeDomain: config.storeDomain, cache, waitUntil },
    });
  }

  return createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({
      request,
      i18n,
      buyerIp: getBuyerIp(request.headers),
    }),
    config: {
      storeDomain: config.storeDomain,
      privateStorefrontToken: config.privateStorefrontToken,
      storefrontId: config.storefrontId,
      cache,
      waitUntil,
    },
  });
}
