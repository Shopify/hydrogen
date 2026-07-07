import type { CachingStrategy, RequestScopedPrivateStorefrontClient } from "@shopify/hydrogen";
import { createContext } from "react-router";

/**
 * React Router request context (NOT React component context) used to pass the
 * request-scoped private Storefront client from root middleware into loaders.
 * See `hydrogen-storefront-client` / `references/react-router.md`.
 *
 * The `Extra` generic carries `{ cache?: CachingStrategy }` so loaders can opt
 * catalog reads into the sub-request cache per query (`Cache.short()` /
 * `Cache.long()`) — the client was created with a `cache` option so per-query
 * cache strategies are honored.
 */
export const storefrontClientContext =
  createContext<RequestScopedPrivateStorefrontClient<{ cache?: CachingStrategy }>>();
