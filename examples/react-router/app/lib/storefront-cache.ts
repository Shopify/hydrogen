import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import { LRUCache } from "lru-cache";

/**
 * Module-level LRU cache for non-personalized catalog reads
 * (engineering.md F2). Lives for the duration of the server process and is
 * shared across requests for cacheable Storefront queries. Personalized reads
 * (cart, buyer-context state) never flow through this cache — they use the
 * request-scoped client with `Cache.none()`.
 */
const storefrontLruCache = new LRUCache<string, object>({
  max: STOREFRONT_CACHE_MAX_ENTRIES,
  // ttl is set per-entry by the adapter from the cache strategy's maxAge.
});

export const storefrontCache = createStorefrontCacheAdapter(storefrontLruCache);
