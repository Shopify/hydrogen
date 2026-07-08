type CacheSetOptions = {
  ttl?: number;
};

type LruCacheLike = {
  get(key: string): unknown;
  set(key: string, value: object, options?: { ttl?: number }): unknown;
  delete(key: string): unknown;
};

export const STOREFRONT_CACHE_MAX_ENTRIES = 1000;

export function createStorefrontCacheAdapter(cache: LruCacheLike) {
  return {
    get(key: string) {
      return cache.get(key);
    },
    set(key: string, value: unknown, options?: CacheSetOptions) {
      if (typeof value !== "object" || value === null) return;

      cache.set(key, value, {
        ttl: options?.ttl ? options.ttl * 1000 : undefined,
      });
    },
    delete(key: string) {
      cache.delete(key);
    },
  };
}
