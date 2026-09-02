import { hashCacheKey, type CacheKey } from "./key";
import {
  type CacheEnvelope,
  type KeyValueCacheLike,
  type SerializableCacheValue,
  type WebCacheLike,
  createNormalizedCacheStore,
} from "./store";
import { NO_STORE, type CachingStrategy, getCacheRetentionTtl } from "./strategies";

type MaybePromise<T> = T | Promise<T>;

export type WaitUntil = (promise: Promise<unknown>) => void;

export type CacheInstance = WebCacheLike | KeyValueCacheLike;

export type CreateRunWithCacheOptions = {
  cache: CacheInstance;
  waitUntil?: WaitUntil;
};

export type RunWithCacheOptions = {
  key: CacheKey;
  strategy: CachingStrategy;
};

export type CacheDecision<T extends SerializableCacheValue> = {
  /**
   * Must be a JSON-serializable object. The cache store may persist this value
   * through `JSON.stringify`; nested serializability is the caller's contract.
   */
  data: T;
  shouldCache: boolean;
};

export type RunWithCacheResult<T extends SerializableCacheValue> = {
  data: T;
  cacheStatus: "hit" | "miss" | "bypass";
};

export type RunWithCache = <T extends SerializableCacheValue>(
  options: RunWithCacheOptions,
  run: () => MaybePromise<CacheDecision<T>>,
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
};

/**
 * Internal control-flow error for adapters that need to escape the cache
 * pipeline without being interpreted as an origin failure. `staleIfError`
 * catches refresh failures, but it should not hide intentional bypasses.
 */
export class StaleFallbackDisabledError extends Error {}

export function createRunWithCache({ cache, waitUntil }: CreateRunWithCacheOptions): RunWithCache {
  const store = createNormalizedCacheStore(cache);

  return async function runWithCache<T extends SerializableCacheValue>(
    options: RunWithCacheOptions,
    run: () => MaybePromise<CacheDecision<T>>,
  ): Promise<RunWithCacheResult<T>> {
    if (options.strategy.mode === NO_STORE) {
      return { data: (await runAndValidate(run)).data, cacheStatus: "bypass" };
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
    run: () => MaybePromise<CacheDecision<T>>,
  ) {
    const entry = runAndMaybeStore(cacheKey, options, run, { scheduleCacheWrite: false });
    schedule(entry.complete);
  }

  async function refreshWithStaleFallback<T extends SerializableCacheValue>(
    cacheKey: string,
    staleValue: T,
    options: RunWithCacheOptions,
    run: () => MaybePromise<CacheDecision<T>>,
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
    run: () => MaybePromise<CacheDecision<T>>,
    { scheduleCacheWrite = true }: RunAndMaybeStoreOptions = {},
  ): CacheOperation<T> {
    // Assigned inside `result` once the callback has produced cacheable data.
    // `complete` reads the same variable later, so it follows the actual write
    // without making the foreground result wait when waitUntil is available.
    let storePromise: Promise<void> = Promise.resolve();

    const result = Promise.resolve().then(async (): Promise<RunWithCacheResult<T>> => {
      const decision = await runAndValidate(run);
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
  run: () => MaybePromise<CacheDecision<T>>,
): Promise<CacheDecision<T>> {
  const decision = await run();

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
