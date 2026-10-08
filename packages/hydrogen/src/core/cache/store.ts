import {
  type CachingStrategy,
  getPlatformCacheControlHeader,
  getCacheRetentionTtl,
} from "./strategies";

/**
 * The plain object that you cache. Web Cache stores save the object as JSON. Return data that
 * survives a round trip through `JSON.stringify`.
 */
export type SerializableCacheValue = Record<string, unknown>;

export type CacheEnvelope<T extends SerializableCacheValue = SerializableCacheValue> = {
  version: 1;
  value: T;
  storedAt: number;
  strategy: CachingStrategy;
};

/** A cache with the `match()`, `put()`, and `delete()` methods of the Web Cache API, such as a cache from `caches.open()`. */
export type WebCacheLike = Pick<Cache, "match" | "put" | "delete">;

/** Options that Hydrogen passes when it writes an entry to a key-value store. */
export type KeyValueCacheSetOptions = {
  /** How many seconds to keep the entry. Hydrogen passes the sum of the strategy's `maxAge`, `staleWhileRevalidate`, and `staleIfError`, rounded up. */
  ttl?: number;
};

/** A key-value store with `get()`, `set()`, and an optional `delete()` method. Hydrogen passes each entry to `set()` as an object. Serialize the object in your store when the store saves only strings. */
export type KeyValueCacheLike = {
  /** Returns the value under the key. Hydrogen treats a value that it didn't write as a cache miss. */
  get(key: string): unknown | Promise<unknown>;
  /** Saves the value under the key. Expire the entry after the `ttl` option, in seconds. */
  set(key: string, value: unknown, options?: KeyValueCacheSetOptions): unknown | Promise<unknown>;
  /** Removes the value under the key. */
  delete?(key: string): unknown | Promise<unknown>;
};

type NormalizedCacheStore = {
  get<T extends SerializableCacheValue>(key: string): Promise<CacheEnvelope<T> | undefined>;
  set<T extends SerializableCacheValue>(
    key: string,
    envelope: CacheEnvelope<T>,
    options: NormalizedCacheSetOptions,
  ): Promise<void>;
  delete?(key: string): Promise<void>;
};

type NormalizedCacheSetOptions = {
  strategy: CachingStrategy;
};

export function createNormalizedCacheStore(
  cache: WebCacheLike | KeyValueCacheLike,
): NormalizedCacheStore {
  if (isWebCacheLike(cache)) return createWebCacheStore(cache);
  if (isKeyValueCacheLike(cache)) return createKeyValueCacheStore(cache);

  throw new TypeError("Expected a Web Cache API compatible store or a key/value cache store.");
}

function createWebCacheStore(cache: WebCacheLike): NormalizedCacheStore {
  return {
    async get<T extends SerializableCacheValue>(key: string) {
      const response = await cache.match(createCacheRequest(key));
      if (!response) return undefined;

      const envelope: unknown = JSON.parse(await response.text());
      return isCacheEnvelope<T>(envelope) ? envelope : undefined;
    },

    async set<T extends SerializableCacheValue>(
      key: string,
      envelope: CacheEnvelope<T>,
      { strategy }: NormalizedCacheSetOptions,
    ) {
      const response = new Response(JSON.stringify(envelope), {
        headers: {
          "cache-control": getPlatformCacheControlHeader(strategy),
          "content-type": "application/json",
        },
      });

      await cache.put(createCacheRequest(key), response);
    },

    async delete(key) {
      await cache.delete(createCacheRequest(key));
    },
  };
}

function createKeyValueCacheStore(cache: KeyValueCacheLike): NormalizedCacheStore {
  return {
    async get<T extends SerializableCacheValue>(key: string) {
      const envelope = await cache.get(key);
      return isCacheEnvelope<T>(envelope) ? envelope : undefined;
    },

    async set<T extends SerializableCacheValue>(
      key: string,
      envelope: CacheEnvelope<T>,
      { strategy }: NormalizedCacheSetOptions,
    ) {
      const ttl = Math.ceil(getCacheRetentionTtl(strategy));

      await cache.set(key, envelope, { ttl });
    },

    async delete(key) {
      await cache.delete?.(key);
    },
  };
}

function createCacheRequest(key: string) {
  return new Request(`https://hydrogen.cache/${key}`);
}

function isWebCacheLike(cache: unknown): cache is WebCacheLike {
  return (
    typeof cache === "object" &&
    cache != null &&
    "match" in cache &&
    "put" in cache &&
    typeof cache.match === "function" &&
    typeof cache.put === "function"
  );
}

function isKeyValueCacheLike(cache: unknown): cache is KeyValueCacheLike {
  return (
    typeof cache === "object" &&
    cache != null &&
    "get" in cache &&
    "set" in cache &&
    typeof cache.get === "function" &&
    typeof cache.set === "function"
  );
}

function isCacheEnvelope<T extends SerializableCacheValue>(
  value: unknown,
): value is CacheEnvelope<T> {
  return (
    typeof value === "object" &&
    value != null &&
    "version" in value &&
    value.version === 1 &&
    "storedAt" in value &&
    typeof value.storedAt === "number" &&
    // Freshness uses the call-site strategy, but stored envelopes should still
    // look like the current shape so older or malformed entries do not become hits.
    "strategy" in value &&
    Boolean(value.strategy) &&
    "value" in value &&
    isSerializableCacheValue(value.value)
  );
}

function isSerializableCacheValue(value: unknown): value is SerializableCacheValue {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
