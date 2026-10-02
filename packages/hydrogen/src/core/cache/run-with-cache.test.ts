import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Cache as CacheStrategy, createRunWithCache } from "./index";
import type { KeyValueCacheLike } from "./store";

class MemoryKeyValueCache implements KeyValueCacheLike {
  readonly store = new Map<string, unknown>();
  readonly setOptions = new Map<string, unknown>();

  get(key: string) {
    return this.store.get(key);
  }

  set(key: string, value: unknown, options?: Parameters<KeyValueCacheLike["set"]>[2]) {
    this.store.set(key, value);
    this.setOptions.set(key, options);
  }

  delete(key: string) {
    return this.store.delete(key);
  }
}

class MemoryWebCache implements Pick<Cache, "match" | "put" | "delete"> {
  readonly store = new Map<string, Response>();

  async match(request: Request) {
    const response = this.store.get(request.url);
    return response?.clone();
  }

  async put(request: Request, response: Response) {
    this.store.set(request.url, response.clone());
  }

  async delete(request: Request) {
    return this.store.delete(request.url);
  }
}

class SlowSetKeyValueCache extends MemoryKeyValueCache {
  readonly setDeferred = Promise.withResolvers<void>();

  async set(key: string, value: unknown, options?: Parameters<KeyValueCacheLike["set"]>[2]) {
    await this.setDeferred.promise;
    return super.set(key, value, options);
  }
}

const strategy = CacheStrategy.short({ maxAge: 1, staleWhileRevalidate: 9, staleIfError: 20 });

describe("createRunWithCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("caches key/value results and returns cached data while fresh", async () => {
    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });
    const run = vi.fn(async () => ({ data: { value: "fresh" }, shouldCache: true }));

    await expect(runWithCache({ key: ["product", "handle"], strategy }, run)).resolves.toEqual({
      data: { value: "fresh" },
      cacheStatus: "miss",
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(1);

    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    await expect(runWithCache({ key: ["product", "handle"], strategy }, run)).resolves.toEqual({
      data: { value: "fresh" },
      cacheStatus: "hit",
    });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("stores results before resolving when waitUntil is not provided", async () => {
    const cache = new MemoryKeyValueCache();
    const runWithCache = createRunWithCache({ cache });
    const run = vi.fn(async () => ({ data: { value: "stored" }, shouldCache: true }));

    await expect(runWithCache({ key: "no-wait-until", strategy }, run)).resolves.toEqual({
      data: { value: "stored" },
      cacheStatus: "miss",
    });
    await expect(runWithCache({ key: "no-wait-until", strategy }, run)).resolves.toEqual({
      data: { value: "stored" },
      cacheStatus: "hit",
    });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("stores key/value envelopes with retention ttl derived from the strategy", async () => {
    const cache = new MemoryKeyValueCache();
    const runWithCache = createRunWithCache({ cache });

    await expect(
      runWithCache({ key: "kv-key", strategy }, async () => ({
        data: { ok: true },
        shouldCache: true,
      })),
    ).resolves.toEqual({
      data: { ok: true },
      cacheStatus: "miss",
    });

    expect([...cache.setOptions.values()]).toEqual([{ ttl: 30 }]);
  });

  it("supports array keys without colliding with equivalent string keys", async () => {
    const cache = new MemoryKeyValueCache();
    const runWithCache = createRunWithCache({ cache });
    const run = vi.fn(async (value: string) => ({ data: { value }, shouldCache: true }));

    await expect(
      runWithCache({ key: ["product", "handle"], strategy }, () => run("array")),
    ).resolves.toEqual({
      data: { value: "array" },
      cacheStatus: "miss",
    });
    await expect(
      runWithCache({ key: JSON.stringify(["product", "handle"]), strategy }, () => run("string")),
    ).resolves.toEqual({
      data: { value: "string" },
      cacheStatus: "miss",
    });

    expect(run).toHaveBeenCalledTimes(2);
    expect(cache.store.size).toBe(2);
  });

  it("supports non-finite numbers as distinct array key values", async () => {
    const cache = new MemoryKeyValueCache();
    const runWithCache = createRunWithCache({ cache });
    const run = vi.fn(async (value: string) => ({ data: { value }, shouldCache: true }));

    await runWithCache({ key: ["number", Number.NaN], strategy }, () => run("nan"));
    await runWithCache({ key: ["number", Infinity], strategy }, () => run("infinity"));

    expect(run).toHaveBeenCalledTimes(2);
    expect(cache.store.size).toBe(2);
  });

  it("rejects sparse array keys", async () => {
    const cache = new MemoryKeyValueCache();
    const runWithCache = createRunWithCache({ cache });
    const sparseKey = ["bad", "empty-slot"];
    delete sparseKey[1];

    await expect(
      runWithCache({ key: sparseKey, strategy }, async () => ({
        data: { value: "uncalled" },
        shouldCache: true,
      })),
    ).rejects.toThrow("Cache key arrays cannot contain empty slots.");

    expect(cache.store.size).toBe(0);
  });

  it("stores Web Cache envelopes with a synthetic GET request and retention cache-control", async () => {
    const cache = new MemoryWebCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });

    await expect(
      runWithCache({ key: "web-key", strategy }, async () => ({
        data: { ok: true },
        shouldCache: true,
      })),
    ).resolves.toEqual({
      data: { ok: true },
      cacheStatus: "miss",
    });

    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    expect(cache.store.size).toBe(1);

    const [[requestUrl, storedResponse]] = [...cache.store.entries()];
    expect(requestUrl).toBe(
      "https://hydrogen.cache/h2:16b687cde821ecfae7c7e4d1ff71c3fec975f52f72dfab31348aad0392aa601a",
    );
    expect(storedResponse.headers.get("cache-control")).toBe("public, max-age=30");

    await expect(storedResponse.clone().json()).resolves.toMatchObject({
      version: 1,
      strategy,
      value: { ok: true },
    });
  });

  it("ignores malformed envelopes without a strategy", async () => {
    const cache = new MemoryKeyValueCache();
    const runWithCache = createRunWithCache({ cache });
    const run = vi.fn(async () => ({ data: { value: "fresh" }, shouldCache: true }));

    cache.store.set("h2:c033828c71e703a57f93c9dfdd695ccad0e8a8871c83b44d6631e38f5dda3075", {
      version: 1,
      value: { value: "bad" },
      storedAt: Date.now(),
    });

    await expect(runWithCache({ key: "malformed", strategy }, run)).resolves.toEqual({
      data: { value: "fresh" },
      cacheStatus: "miss",
    });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("skips storage when shouldCache is false", async () => {
    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });
    const run = vi.fn(async () => ({ data: { value: "uncached" }, shouldCache: false }));

    await expect(runWithCache({ key: "skip", strategy }, run)).resolves.toEqual({
      data: { value: "uncached" },
      cacheStatus: "miss",
    });
    await expect(runWithCache({ key: "skip", strategy }, run)).resolves.toEqual({
      data: { value: "uncached" },
      cacheStatus: "miss",
    });

    expect(run).toHaveBeenCalledTimes(2);
    expect(waitUntil).not.toHaveBeenCalled();
    expect(cache.store.size).toBe(0);
  });

  it("bypasses cache for Cache.none", async () => {
    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });
    const run = vi.fn(async () => ({ data: { value: "value" }, shouldCache: true }));

    await expect(
      runWithCache({ key: "none", strategy: CacheStrategy.none() }, run),
    ).resolves.toEqual({
      data: { value: "value" },
      cacheStatus: "bypass",
    });
    await expect(
      runWithCache({ key: "none", strategy: CacheStrategy.none() }, run),
    ).resolves.toEqual({
      data: { value: "value" },
      cacheStatus: "bypass",
    });
    await expect(
      runWithCache({ key: ["none", Number.NaN], strategy: CacheStrategy.none() }, run),
    ).resolves.toEqual({
      data: { value: "value" },
      cacheStatus: "bypass",
    });

    expect(run).toHaveBeenCalledTimes(3);
    expect(waitUntil).not.toHaveBeenCalled();
    expect(cache.store.size).toBe(0);
  });

  it("throws when the callback does not return a cache decision", async () => {
    const cache = new MemoryKeyValueCache();
    const runWithCache = createRunWithCache({ cache });

    await expect(
      runWithCache({ key: "bad", strategy }, async () => JSON.parse('"bad"')),
    ).rejects.toThrow("runWithCache callback must return {data, shouldCache}.");
  });

  it("serves stale data and schedules background revalidation for stale hits", async () => {
    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });
    const firstRevalidation = Promise.withResolvers<{
      data: { value: string };
      shouldCache: boolean;
    }>();
    const secondRevalidation = Promise.withResolvers<{
      data: { value: string };
      shouldCache: boolean;
    }>();
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: { value: "first" }, shouldCache: true })
      .mockReturnValueOnce(firstRevalidation.promise)
      .mockReturnValueOnce(secondRevalidation.promise);

    await runWithCache({ key: "stale", strategy }, run);
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    vi.advanceTimersByTime(2000);

    const firstStale = runWithCache({ key: "stale", strategy }, run);
    const secondStale = runWithCache({ key: "stale", strategy }, run);

    await expect(Promise.all([firstStale, secondStale])).resolves.toEqual([
      { data: { value: "first" }, cacheStatus: "hit" },
      { data: { value: "first" }, cacheStatus: "hit" },
    ]);

    expect(waitUntil).toHaveBeenCalledTimes(3);
    firstRevalidation.resolve({ data: { value: "second" }, shouldCache: true });
    secondRevalidation.resolve({ data: { value: "second" }, shouldCache: true });
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));
    expect(run).toHaveBeenCalledTimes(3);

    await expect(runWithCache({ key: "stale", strategy }, run)).resolves.toEqual({
      data: { value: "second" },
      cacheStatus: "hit",
    });
  });

  it("serves stale-if-error data when synchronous refresh fails", async () => {
    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: { value: "first" }, shouldCache: true })
      .mockRejectedValueOnce(new Error("origin failed"));

    await runWithCache({ key: "stale-if-error", strategy }, run);
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    vi.advanceTimersByTime(12000);

    await expect(runWithCache({ key: "stale-if-error", strategy }, run)).resolves.toEqual({
      data: { value: "first" },
      cacheStatus: "hit",
    });

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("keeps stale-if-error fallback independent from pending stale revalidation", async () => {
    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });
    const revalidation = Promise.withResolvers<{
      data: { value: string };
      shouldCache: boolean;
    }>();
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: { value: "first" }, shouldCache: true })
      .mockReturnValueOnce(revalidation.promise)
      .mockRejectedValueOnce(new Error("origin failed"));

    await runWithCache({ key: "shared-refresh", strategy }, run);
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    vi.advanceTimersByTime(2000);

    await expect(runWithCache({ key: "shared-refresh", strategy }, run)).resolves.toEqual({
      data: { value: "first" },
      cacheStatus: "hit",
    });

    vi.advanceTimersByTime(10_000);

    const staleIfErrorRefresh = runWithCache({ key: "shared-refresh", strategy }, run);

    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(3));

    revalidation.resolve({ data: { value: "second" }, shouldCache: true });
    await expect(staleIfErrorRefresh).resolves.toEqual({
      data: { value: "first" },
      cacheStatus: "hit",
    });
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    expect(run).toHaveBeenCalledTimes(3);
  });

  it("runs concurrent cold misses independently", async () => {
    const cache = new MemoryKeyValueCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });
    const firstRun = Promise.withResolvers<{
      data: { value: string };
      shouldCache: boolean;
    }>();
    const secondRun = Promise.withResolvers<{
      data: { value: string };
      shouldCache: boolean;
    }>();
    const firstCallback = vi.fn(() => firstRun.promise);
    const secondCallback = vi.fn(() => secondRun.promise);

    const first = runWithCache({ key: "concurrent-miss", strategy }, firstCallback);
    const second = runWithCache({ key: "concurrent-miss", strategy }, secondCallback);

    await vi.waitFor(() => {
      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });

    firstRun.resolve({ data: { value: "first" }, shouldCache: true });
    secondRun.resolve({ data: { value: "second" }, shouldCache: true });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: { value: "first" }, cacheStatus: "miss" },
      { data: { value: "second" }, cacheStatus: "miss" },
    ]);
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    expect(firstCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it("does not reuse pending cache writes as in-memory data", async () => {
    const cache = new SlowSetKeyValueCache();
    const waitUntil = vi.fn();
    const runWithCache = createRunWithCache({ cache, waitUntil });
    const run = vi.fn(async () => ({ data: { value: "first" }, shouldCache: true }));

    await expect(runWithCache({ key: "slow-set", strategy }, run)).resolves.toEqual({
      data: { value: "first" },
      cacheStatus: "miss",
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(cache.store.size).toBe(0);

    await expect(runWithCache({ key: "slow-set", strategy }, run)).resolves.toEqual({
      data: { value: "first" },
      cacheStatus: "miss",
    });

    expect(run).toHaveBeenCalledTimes(2);

    cache.setDeferred.resolve();
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    expect(cache.store.size).toBe(1);
  });
});
