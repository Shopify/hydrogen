import { hashCacheKey, type CacheKey } from "./key";
import {
  type CacheEnvelope,
  type KeyValueCacheLike,
  type SerializableCacheValue,
  type WebCacheLike,
  createNormalizedCacheStore,
} from "./store";
import { NO_STORE, type CachingStrategy, getCacheRetentionTtl } from "./strategies";

/** A value, or a promise that resolves to the value. */
type MaybePromise<T> = T | Promise<T>;

/**
 * Keeps the runtime alive until a background cache write or refresh finishes, such as a worker's `waitUntil` function. Hydrogen ignores errors that the function throws.
 */
export type WaitUntil =
  /**
   * @param promise - The background cache write or refresh to wait for.
   * @returns Nothing. Hydrogen ignores the return value.
   */
  (promise: Promise<unknown>) => void;

/** The cache that holds entries, either a Web Cache API cache or a key-value store. */
export type CacheInstance = WebCacheLike | KeyValueCacheLike;

/** The cache and the background-work function for createRunWithCache. */
export type CreateRunWithCacheOptions = {
  /** The cache that holds entries. createRunWithCache throws a TypeError when the cache is neither a Web Cache API cache nor a key-value store. */
  cache: CacheInstance;
  /**
   * Keeps the runtime alive for background cache writes and refreshes. Without `waitUntil`, each call waits for its cache write before it resolves.
   */
  waitUntil?: WaitUntil;
};

/** Options for one cached run. */
export type RunWithCacheOptions = {
  /**
   * Identifies the cache entry. runWithCache throws a TypeError for an array key with empty slots or with entries other than strings, numbers, booleans, and `null`.
   */
  key: CacheKey;
  /** Sets how long the result stays fresh, how long the cache serves it stale while refreshing it, and how long the cache serves it stale after an error. */
  strategy: CachingStrategy;
};

/** The callback's return value, with the data and whether to cache the data. */
export type CacheDecision<T extends SerializableCacheValue> = {
  /**
   * The data to return and cache. Web Cache stores save the data as JSON.
   */
  data: T;
  /** Set to `false` to return the data without storing it. */
  shouldCache: boolean;
};

/** The data, and whether the data came from the cache or the callback. */
export type RunWithCacheResult<T extends SerializableCacheValue> = {
  /** The cached data on a hit, or the callback's data otherwise. */
  data: T;
  /** `hit` when the data comes from the cache, `miss` when the callback runs, and `bypass` for a `no-store` strategy. */
  cacheStatus: "hit" | "miss" | "bypass";
};

/** The context that `runWithCache` passes to its callback. */
export type RunWithCacheContext = {
  /** `true` when the callback refreshes a stale entry after the cache already returned the stale value. */
  background: boolean;
};

// The context is optional so custom runners that call `run()` keep working.
/** Produces the data for a cached run and decides whether to cache the data. */
type RunCallback<T extends SerializableCacheValue> =
  /**
   * @param context - Tells the callback whether it refreshes a stale entry in the background.
   * @returns The data and whether to cache the data, or a promise that resolves to both.
   */
  (context?: RunWithCacheContext) => MaybePromise<CacheDecision<T>>;

/**
 * Returns cached data for the key, or runs the callback and caches the result. Resolves with the
 * data and the cache status.
 */
export type RunWithCache =
  /**
   * @param options - The cache key and caching strategy for this call.
   * @param run - Produces the data and decides whether to cache it. Runs whenever the cache has no fresh entry. The context's `background` field is `true` during a stale-while-revalidate refresh.
   * @returns The data and the cache status.
   */
  <T extends SerializableCacheValue>(
    options: RunWithCacheOptions,
    run: RunCallback<T>,
  ) => Promise<RunWithCacheResult<T>>;

type CacheState = "fresh" | "stale" | "stale-if-error" | "expired";

/**
 * `result` resolves as soon as user data is available; `complete` also waits for
 * any cache write so background revalidation can be scheduled as one operation.
 */
type CacheOperation<T extends SerializableCacheValue = SerializableCacheValue> = {
  result: Promise<RunWithCacheResult<T>>;
  complete: Promise<void>;
};

type RunAndMaybeStoreOptions = {
  scheduleCacheWrite?: boolean;
  background?: boolean;
};

/**
 * Internal control-flow error for adapters that need to escape the cache
 * pipeline without being interpreted as an origin failure. `staleIfError`
 * catches refresh failures, but it should not hide intentional bypasses.
 */
export class StaleFallbackDisabledError extends Error {}

/**
 * Creates a function that caches the result of any async work, such as data that several API calls
 * produce together. For a single fetch response, use createFetchWithCache.
 *
 * @param options - The cache, and the function that keeps the runtime alive for background cache writes.
 * @returns A function that returns cached data or runs your callback, and reports the cache status.
 * @publicDocs
 */
export function createRunWithCache({ cache, waitUntil }: CreateRunWithCacheOptions): RunWithCache {
  const store = createNormalizedCacheStore(cache);

  return async function runWithCache<T extends SerializableCacheValue>(
    options: RunWithCacheOptions,
    run: RunCallback<T>,
  ): Promise<RunWithCacheResult<T>> {
    if (options.strategy.mode === NO_STORE) {
      return {
        data: (await runAndValidate(run, { background: false })).data,
        cacheStatus: "bypass",
      };
    }

    const cacheKey = await hashCacheKey(options.key);

    let cached: CacheEnvelope<T> | undefined;

    try {
      cached = await store.get<T>(cacheKey);
    } catch {}

    if (cached) {
      const state = getCacheState(cached, options.strategy);

      if (state === "fresh") return { data: cached.value, cacheStatus: "hit" };

      if (state === "stale") {
        revalidateInBackground(cacheKey, options, run);
        return { data: cached.value, cacheStatus: "hit" };
      }

      if (state === "stale-if-error") {
        return refreshWithStaleFallback(cacheKey, cached.value, options, run);
      }
    }

    return runAndMaybeStore(cacheKey, options, run).result;
  };

  function revalidateInBackground<T extends SerializableCacheValue>(
    cacheKey: string,
    options: RunWithCacheOptions,
    run: RunCallback<T>,
  ) {
    const entry = runAndMaybeStore(cacheKey, options, run, {
      scheduleCacheWrite: false,
      background: true,
    });
    schedule(entry.complete);
  }

  async function refreshWithStaleFallback<T extends SerializableCacheValue>(
    cacheKey: string,
    staleValue: T,
    options: RunWithCacheOptions,
    run: RunCallback<T>,
  ): Promise<RunWithCacheResult<T>> {
    try {
      return await runAndMaybeStore(cacheKey, options, run).result;
    } catch (error) {
      if (!shouldFallbackToStale(error)) throw error;

      return { data: staleValue, cacheStatus: "hit" };
    }
  }

  function runAndMaybeStore<T extends SerializableCacheValue>(
    key: string,
    options: RunWithCacheOptions,
    run: RunCallback<T>,
    { scheduleCacheWrite = true, background = false }: RunAndMaybeStoreOptions = {},
  ): CacheOperation<T> {
    // Assigned inside `result` once the callback has produced cacheable data.
    // `complete` reads the same variable later, so it follows the actual write
    // without making the foreground result wait when waitUntil is available.
    let storePromise: Promise<void> = Promise.resolve();

    const result = Promise.resolve().then(async (): Promise<RunWithCacheResult<T>> => {
      const decision = await runAndValidate(run, { background });
      if (!shouldStore(options.strategy, decision)) {
        return { data: decision.data, cacheStatus: "miss" };
      }

      storePromise = storeDecision(key, options, decision).catch(() => {});

      if (waitUntil && scheduleCacheWrite) {
        schedule(storePromise);
      } else if (!waitUntil) {
        await storePromise;
      }

      return { data: decision.data, cacheStatus: "miss" };
    });

    return {
      result,
      complete: result
        .then(
          () => storePromise,
          () => undefined,
        )
        .then(() => undefined),
    };
  }

  async function storeDecision<T extends SerializableCacheValue>(
    key: string,
    options: RunWithCacheOptions,
    decision: CacheDecision<T>,
  ) {
    await store.set(
      key,
      {
        version: 1,
        value: decision.data,
        storedAt: Date.now(),
        strategy: options.strategy,
      },
      {
        strategy: options.strategy,
      },
    );
  }

  function schedule(promise: Promise<unknown>) {
    try {
      waitUntil?.(promise);
    } catch {}
  }
}

function shouldStore<T extends SerializableCacheValue>(
  strategy: CachingStrategy,
  decision: CacheDecision<T>,
): boolean {
  return decision.shouldCache && getCacheRetentionTtl(strategy) > 0;
}

function shouldFallbackToStale(error: unknown): boolean {
  return !(error instanceof StaleFallbackDisabledError);
}

async function runAndValidate<T extends SerializableCacheValue>(
  run: RunCallback<T>,
  context: RunWithCacheContext,
): Promise<CacheDecision<T>> {
  const decision = await run(context);

  if (
    typeof decision !== "object" ||
    decision == null ||
    !("data" in decision) ||
    !("shouldCache" in decision) ||
    typeof decision.shouldCache !== "boolean"
  ) {
    throw new TypeError("runWithCache callback must return {data, shouldCache}.");
  }

  return decision;
}

function getCacheState<T extends SerializableCacheValue>(
  envelope: CacheEnvelope<T>,
  strategy: CachingStrategy,
): CacheState {
  const age = Math.max(0, (Date.now() - envelope.storedAt) / 1000);
  const maxAge = strategy.maxAge ?? 0;
  const staleWhileRevalidate = strategy.staleWhileRevalidate ?? 0;
  const staleIfError = strategy.staleIfError ?? 0;

  if (age <= maxAge) return "fresh";
  if (age <= maxAge + staleWhileRevalidate) return "stale";
  if (age <= maxAge + staleWhileRevalidate + staleIfError) {
    return "stale-if-error";
  }

  return "expired";
}

/**
 * Returns cached data for the key, or runs the callback and caches the result.
 *
 * The callback returns an object with `data` and a boolean `shouldCache`. The function throws a TypeError for any other shape. During the `staleWhileRevalidate` window, the function returns the stale data right away and runs the callback in the background. During the `staleIfError` window, the function returns the stale data when the callback throws. A `no-store` strategy runs the callback and skips the cache.
 *
 * @publicDocs
 */
export type RunWithCacheForDocs =
  /**
   * @param options - The cache key and caching strategy for this call.
   * @param run - Produces the data and decides whether to cache it. Runs whenever the cache has no fresh entry.
   * @returns The data, and whether the data came from the cache, the callback, or a bypass.
   */
  (
    options: RunWithCacheOptions,
    run: () => MaybePromise<CacheDecision<SerializableCacheValue>>,
  ) => Promise<RunWithCacheResult<SerializableCacheValue>>;
