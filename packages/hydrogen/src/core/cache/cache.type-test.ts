import { describe, expectTypeOf, it } from "vitest";

import {
  Cache,
  createFetchWithCache,
  createRunWithCache,
} from "../index";
import type { CacheOptions, CachingStrategy } from "../index";
import type { CacheKey } from "./key";

// @ts-expect-error — cache option helper types are intentionally not exported from the public core barrel.
import type { FetchCacheOptions } from "../index";

const keyValueCache = {
  get(_key: string) {
    return undefined;
  },
  set(_key: string, _value: unknown, _options?: { ttl?: number }) {},
};

const customFetch: typeof fetch = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};

describe("cache type tests", () => {
  describe("strategies", () => {
    it("exposes public cache strategies as CachingStrategy values", () => {
      expectTypeOf(Cache.none()).toMatchTypeOf<CachingStrategy>();
      expectTypeOf(Cache.short()).toMatchTypeOf<CachingStrategy>();
      expectTypeOf(Cache.long()).toMatchTypeOf<CachingStrategy>();
      expectTypeOf(Cache({ mode: "private", maxAge: 60 })).toMatchTypeOf<CachingStrategy>();
      expectTypeOf(
        Cache({
          maxAge: { minutes: 10 },
          staleWhileRevalidate: { hours: 1 },
          staleIfError: { days: 1 },
        }),
      ).toMatchTypeOf<CachingStrategy>();

      const productCacheOptions: CacheOptions = {
        maxAge: { minutes: 5 },
      };
      expectTypeOf(productCacheOptions).toMatchTypeOf<CacheOptions>();
    });

    it("rejects unsupported cache strategy modes", () => {
      () =>
        Cache({
          // @ts-expect-error — mode must be public or private.
          mode: "unsupported",
        });
      () =>
        Cache({
          // @ts-expect-error — use Cache.none() for no-store.
          mode: "no-store",
        });

      () =>
        // @ts-expect-error — strategy objects do not expose arbitrary options in v1.
        Cache.long({ ttl: 60 });
      () =>
        Cache({
          maxAge: {
            // @ts-expect-error — duration objects accept seconds, minutes, hours, and days.
            weeks: 1,
          },
        });
    });
  });

  describe("createRunWithCache", () => {
    const runWithCache = createRunWithCache({
      cache: keyValueCache,
      waitUntil(promise) {
        void promise;
      },
    });

    it("returns data with cache metadata", () => {
      const result = runWithCache({ key: "shop", strategy: Cache.long() }, () => ({
        data: { shop: "Hydrogen" },
        shouldCache: true,
      }));

      type Result = Awaited<typeof result>;

      expectTypeOf<Result["data"]>().toEqualTypeOf<{ shop: string }>();
      expectTypeOf<Result["cacheStatus"]>().toEqualTypeOf<"hit" | "miss" | "bypass">();
    });

    it("accepts async callbacks and array cache keys", () => {
      const result = runWithCache(
        {
          key: ["storefront", "query Shop { shop { name } }", "country", "US"],
          strategy: Cache.short(),
        },
        async () => ({
          data: { ok: true },
          shouldCache: false,
        }),
      );

      expectTypeOf<Awaited<typeof result>["data"]>().toEqualTypeOf<{ ok: boolean }>();
    });

    it("accepts only stable array cache keys", () => {
      const validKey: CacheKey = ["storefront", "US", 1, false, null, Number.NaN, Infinity];
      expectTypeOf(validKey).toMatchTypeOf<CacheKey>();

      // @ts-expect-error — array cache keys cannot contain undefined.
      const invalidUndefined: CacheKey = ["storefront", undefined];
      // @ts-expect-error — array cache keys cannot contain bigint values.
      const invalidBigInt: CacheKey = ["storefront", 1n];
      // @ts-expect-error — array cache keys cannot contain functions.
      const invalidFunction: CacheKey = ["storefront", () => "nope"];
      // @ts-expect-error — structured values must be serialized before being passed.
      const invalidObject: CacheKey = ["storefront", { country: "US" }];

      void invalidUndefined;
      void invalidBigInt;
      void invalidFunction;
      void invalidObject;
    });

    it("requires callbacks to return an object data value and explicit cache decision", () => {
      () =>
        runWithCache({ key: "string-data", strategy: Cache.long() }, () => ({
          // @ts-expect-error — cached data must be a serializable object.
          data: "not-cacheable",
          shouldCache: true,
        }));

      () =>
        // @ts-expect-error — callbacks must consciously decide whether to cache.
        runWithCache({ key: "missing-decision", strategy: Cache.long() }, () => ({
          data: { ok: true },
        }));
    });
  });

  describe("createFetchWithCache", () => {
    const fetchWithCache = createFetchWithCache({
      cache: keyValueCache,
      fetch: customFetch,
    });

    it("keeps normal fetch call signatures", () => {
      fetchWithCache("https://shop.example.com/api");
      fetchWithCache(new Request("https://shop.example.com/api"), { method: "POST" });
    });

    it("accepts cache options only as the third argument", () => {
      fetchWithCache("https://shop.example.com/api", undefined, {
        key: "storefront:shop",
        strategy: Cache.long(),
        annotateCacheStatus: false,
      });

      fetchWithCache("https://shop.example.com/api", undefined, {
        key: ["storefront", "query Shop { shop { name } }"],
        strategy: Cache({ maxAge: 10, staleWhileRevalidate: 50 }),
        shouldCacheResponse(context) {
          expectTypeOf(context.ok).toEqualTypeOf<boolean>();
          expectTypeOf(context.status).toEqualTypeOf<number>();
          expectTypeOf(context.statusText).toEqualTypeOf<string>();
          expectTypeOf(context.headers).toEqualTypeOf<Headers>();
          expectTypeOf(context.url).toEqualTypeOf<string>();
          expectTypeOf(context.text).toEqualTypeOf<() => Promise<string>>();
          expectTypeOf(context.json).toEqualTypeOf<(() => Promise<unknown>) | undefined>();

          return context.text().then((body) => body.length > 0);
        },
      });
    });

    it("requires a key and strategy when cache options are provided", () => {
      () =>
        // @ts-expect-error — cache options require a key.
        fetchWithCache("https://shop.example.com/api", undefined, {
          strategy: Cache.long(),
        });

      () =>
        // @ts-expect-error — cache options require a strategy.
        fetchWithCache("https://shop.example.com/api", undefined, {
          key: "storefront:shop",
        });

      () =>
        fetchWithCache("https://shop.example.com/api", undefined, {
          key: "storefront:shop",
          // @ts-expect-error — fetchWithCache uses strategy directly, not GraphQL's future cache option.
          cache: Cache.long(),
        });
    });

    it("accepts an existing runWithCache instance", () => {
      const runWithCache = createRunWithCache({ cache: keyValueCache });
      const fetchWithExistingRunCache = createFetchWithCache({
        runWithCache,
        fetch: customFetch,
      });

      fetchWithExistingRunCache("https://shop.example.com/api", undefined, {
        key: "storefront:shop",
        strategy: Cache.none(),
      });
    });
  });
});

void (undefined as unknown as FetchCacheOptions);
