import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Cache, createFetchWithCache } from "./index";
import type { KeyValueCacheLike } from "./store";

class MemoryKeyValueCache implements KeyValueCacheLike {
  readonly store = new Map<string, unknown>();

  get(key: string) {
    return this.store.get(key);
  }

  set(key: string, value: unknown) {
    this.store.set(key, value);
  }
}

const strategy = Cache.long({ maxAge: 60, staleWhileRevalidate: 60 });

describe("createFetchWithCache", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches, stores, and serves cached responses", async () => {
    const cache = new MemoryKeyValueCache();
    const fetch = vi.fn(async () =>
      Response.json(
        { ok: true },
        {
          headers: {
            "server-timing": "origin;dur=10",
            "set-cookie": "private=value",
            "x-cacheable": "yes",
          },
        },
      ),
    );
    const fetchWithCache = createFetchWithCache({ cache, fetch });

    const first = await fetchWithCache("https://example.com/products", undefined, {
      key: "products",
      strategy,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first.headers.get("cache-status")).toBe("Hydrogen; fwd=uri-miss; stored");
    expect(first.headers.get("server-timing")).toBeNull();
    expect(first.headers.get("set-cookie")).toBeNull();
    await expect(first.json()).resolves.toEqual({ ok: true });

    const second = await fetchWithCache("https://example.com/products", undefined, {
      key: "products",
      strategy,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second.headers.get("cache-status")).toBe("Hydrogen; hit");
    expect(second.headers.get("server-timing")).toBeNull();
    expect(second.headers.get("set-cookie")).toBeNull();
    expect(second.headers.get("x-cacheable")).toBe("yes");
    await expect(second.json()).resolves.toEqual({ ok: true });
  });

  it("does not cache non-OK responses", async () => {
    const cache = new MemoryKeyValueCache();
    const fetch = vi.fn(async () => new Response("not found", { status: 404 }));
    const fetchWithCache = createFetchWithCache({ cache, fetch });

    const first = await fetchWithCache("https://example.com/missing", undefined, {
      key: "missing",
      strategy,
    });

    expect(first.status).toBe(404);
    expect(first.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    await expect(first.text()).resolves.toBe("not found");

    await fetchWithCache("https://example.com/missing", undefined, {
      key: "missing",
      strategy,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(cache.store.size).toBe(0);
  });

  it("preserves non-OK responses that are not serializable", async () => {
    const cache = new MemoryKeyValueCache();
    const fetch = vi.fn(async () => {
      return new Response(`failure-${fetch.mock.calls.length}`, {
        status: 500,
        headers: {
          "content-type": "application/octet-stream",
        },
      });
    });
    const fetchWithCache = createFetchWithCache({ cache, fetch });

    const first = await fetchWithCache("https://example.com/failure", undefined, {
      key: "binary-failure",
      strategy,
    });
    const second = await fetchWithCache("https://example.com/failure", undefined, {
      key: "binary-failure",
      strategy,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(first.status).toBe(500);
    expect(second.status).toBe(500);
    expect(first.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    expect(second.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    await expect(first.text()).resolves.toBe("failure-1");
    await expect(second.text()).resolves.toBe("failure-2");
    expect(cache.store.size).toBe(0);
  });

  it("serves stale cached responses when stale-if-error refresh returns a server error", async () => {
    vi.useFakeTimers();

    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ version: 1 }))
      .mockResolvedValueOnce(Response.json({ error: "unavailable" }, { status: 503 }));
    const fetchWithCache = createFetchWithCache({ cache, fetch, waitUntil });
    const staleIfErrorStrategy = Cache.long({
      maxAge: 1,
      staleIfError: 60,
      staleWhileRevalidate: 0,
    });

    await fetchWithCache("https://example.com/products", undefined, {
      key: "stale-if-error-fetch",
      strategy: staleIfErrorStrategy,
    });
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    vi.advanceTimersByTime(2000);

    const response = await fetchWithCache("https://example.com/products", undefined, {
      key: "stale-if-error-fetch",
      strategy: staleIfErrorStrategy,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-status")).toBe("Hydrogen; hit");
    await expect(response.json()).resolves.toEqual({ version: 1 });
  });

  it("does not serve stale cached responses when a fresh response intentionally bypasses cache", async () => {
    vi.useFakeTimers();

    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ version: 1 }))
      .mockResolvedValueOnce(
        new Response("fresh-binary", {
          headers: {
            "content-type": "application/octet-stream",
          },
        }),
      );
    const fetchWithCache = createFetchWithCache({ cache, fetch, waitUntil });
    const staleIfErrorStrategy = Cache.long({
      maxAge: 1,
      staleIfError: 60,
      staleWhileRevalidate: 0,
    });

    await fetchWithCache("https://example.com/products", undefined, {
      key: "stale-if-error-bypass",
      strategy: staleIfErrorStrategy,
    });
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    vi.advanceTimersByTime(2000);

    const response = await fetchWithCache("https://example.com/products", undefined, {
      key: "stale-if-error-bypass",
      strategy: staleIfErrorStrategy,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    await expect(response.text()).resolves.toBe("fresh-binary");
  });

  it("uses shouldCacheResponse with memoized text and json helpers", async () => {
    const cache = new MemoryKeyValueCache();
    const parse = vi.spyOn(JSON, "parse");
    const shouldCacheResponse = vi.fn(async ({ json, text }) => {
      expect(await text()).toBe('{"data":{"ok":true}}');
      expect(await json?.()).toEqual({ data: { ok: true } });
      expect(await json?.()).toEqual({ data: { ok: true } });
      return true;
    });
    const fetchWithCache = createFetchWithCache({
      cache,
      fetch: vi.fn(async () => Response.json({ data: { ok: true } })),
    });

    const response = await fetchWithCache("https://example.com/graphql", undefined, {
      key: "graphql",
      strategy,
      shouldCacheResponse,
    });

    expect(shouldCacheResponse).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledTimes(1);
    parse.mockRestore();
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
  });

  it("skips storage when shouldCacheResponse returns false", async () => {
    const cache = new MemoryKeyValueCache();
    const fetch = vi.fn(async () => Response.json({ errors: [{ message: "nope" }] }));
    const fetchWithCache = createFetchWithCache({ cache, fetch });

    await fetchWithCache("https://example.com/graphql", undefined, {
      key: "graphql-errors",
      strategy,
      shouldCacheResponse: async ({ json }) => {
        const body = await json?.();
        return !(typeof body === "object" && body != null && "errors" in body);
      },
    });
    await fetchWithCache("https://example.com/graphql", undefined, {
      key: "graphql-errors",
      strategy,
      shouldCacheResponse: () => true,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(cache.store.size).toBe(1);
  });

  it("serves concurrent non-cacheable misses with serialized bodies", async () => {
    const cache = new MemoryKeyValueCache();
    const fetchStarted = Promise.withResolvers<void>();
    const releaseFetch = Promise.withResolvers<void>();
    const fetch = vi.fn(async () => {
      fetchStarted.resolve();
      await releaseFetch.promise;
      return Response.json(
        { errors: [{ message: "nope" }] },
        {
          headers: {
            "x-non-cacheable": "yes",
          },
        },
      );
    });
    const fetchWithCache = createFetchWithCache({ cache, fetch });
    const options = {
      key: "concurrent-graphql-errors",
      strategy,
      shouldCacheResponse: () => false,
    };

    const firstPromise = fetchWithCache("https://example.com/graphql", undefined, options);
    await fetchStarted.promise;
    const secondPromise = fetchWithCache("https://example.com/graphql", undefined, options);

    releaseFetch.resolve();

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(first.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    expect(second.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    expect(second.headers.get("x-non-cacheable")).toBe("yes");
    await expect(first.json()).resolves.toEqual({ errors: [{ message: "nope" }] });
    await expect(second.json()).resolves.toEqual({ errors: [{ message: "nope" }] });
    expect(cache.store.size).toBe(0);
  });

  it("serves concurrent unserializable misses with separate responses", async () => {
    const cache = new MemoryKeyValueCache();
    const fetchStarted = Promise.withResolvers<void>();
    const releaseFetch = Promise.withResolvers<void>();
    const fetch = vi.fn(async () => {
      const callNumber = fetch.mock.calls.length;
      if (callNumber === 1) {
        fetchStarted.resolve();
        await releaseFetch.promise;
      }

      return new Response(`binary-${callNumber}`, {
        headers: {
          "content-type": "application/octet-stream",
          "x-binary": "yes",
        },
      });
    });
    const fetchWithCache = createFetchWithCache({ cache, fetch });
    const options = {
      key: "concurrent-binary",
      strategy,
    };

    const firstPromise = fetchWithCache("https://example.com/file", undefined, options);
    await fetchStarted.promise;
    const secondPromise = fetchWithCache("https://example.com/file", undefined, options);
    await new Promise((resolve) => setTimeout(resolve, 0));

    releaseFetch.resolve();

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(first.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    expect(second.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    expect(second.headers.get("x-binary")).toBe("yes");
    await expect(first.text()).resolves.toBe("binary-1");
    await expect(second.text()).resolves.toBe("binary-2");
    expect(cache.store.size).toBe(0);
  });

  it("bypasses cache machinery for Cache.none", async () => {
    const cache = new MemoryKeyValueCache();
    const shouldCacheResponse = vi.fn(() => true);
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    const fetchWithCache = createFetchWithCache({ cache, fetch });

    const response = await fetchWithCache("https://example.com/products", undefined, {
      key: "cache-none",
      strategy: Cache.none(),
      shouldCacheResponse,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(shouldCacheResponse).not.toHaveBeenCalled();
    expect(cache.store.size).toBe(0);
    expect(response.headers.get("cache-status")).toBe("Hydrogen; fwd=bypass");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("supports annotation opt-out", async () => {
    const fetchWithCache = createFetchWithCache({
      cache: new MemoryKeyValueCache(),
      fetch: vi.fn(async () => Response.json({ ok: true })),
    });

    const response = await fetchWithCache("https://example.com/products", undefined, {
      key: "no-annotation",
      strategy,
      annotateCacheStatus: false,
    });

    expect(response.headers.has("cache-status")).toBe(false);
  });

  it("serves stale cached responses while revalidating in the background", async () => {
    vi.useFakeTimers();

    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ version: 1 }))
      .mockResolvedValueOnce(Response.json({ version: 2 }));
    const fetchWithCache = createFetchWithCache({ cache, fetch, waitUntil });
    const shortStrategy = Cache.long({ maxAge: 1, staleWhileRevalidate: 60 });

    await fetchWithCache("https://example.com/products", undefined, {
      key: "stale-fetch",
      strategy: shortStrategy,
    });
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    vi.advanceTimersByTime(2000);

    const staleResponse = await fetchWithCache("https://example.com/products", undefined, {
      key: "stale-fetch",
      strategy: shortStrategy,
    });

    expect(staleResponse.headers.get("cache-status")).toBe("Hydrogen; hit");
    await expect(staleResponse.json()).resolves.toEqual({ version: 1 });
    expect(fetch).toHaveBeenCalledTimes(2);

    await waitUntil.mock.calls.at(-1)?.[0];

    const freshResponse = await fetchWithCache("https://example.com/products", undefined, {
      key: "stale-fetch",
      strategy: shortStrategy,
    });

    await expect(freshResponse.json()).resolves.toEqual({ version: 2 });
  });

  it("calls normal fetch when cache options are omitted", async () => {
    const response = Response.json({ ok: true });
    const fetch = vi.fn(async () => response);
    const fetchWithCache = createFetchWithCache({ cache: new MemoryKeyValueCache(), fetch });

    await expect(fetchWithCache("https://example.com/products")).resolves.toBe(response);

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
