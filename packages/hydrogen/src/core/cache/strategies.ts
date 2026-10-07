export const NO_STORE = "no-store";

const PUBLIC = "public";
const PRIVATE = "private";

/** How a cache stores an entry: `public`, `private`, or `no-store`, which skips the cache. */
export type CacheMode = typeof PUBLIC | typeof PRIVATE | typeof NO_STORE;
/** The modes a custom strategy accepts, `public` or `private`. Any other mode throws an error. */
export type ExpirableCacheMode = typeof PUBLIC | typeof PRIVATE;

/**
 * A number of seconds, or an object such as `{ minutes: 10 }`. Durations must be finite and non-negative, or the strategy builder throws an error. Fractional totals round up to whole seconds.
 */
export type CacheDuration =
  | number
  | {
      seconds?: number;
      minutes?: number;
      hours?: number;
      days?: number;
    };

/** A built caching strategy with every duration in whole seconds. Create one with the strategy builder. */
export interface CachingStrategy {
  /** How the cache stores the entry. A `no-store` strategy skips the cache. */
  mode?: CacheMode;
  /** Seconds an entry stays fresh and returns as a cache hit. */
  maxAge?: number;
  /** Seconds after the fresh window that a stale entry returns while a background refresh runs. */
  staleWhileRevalidate?: number;
  /** Seconds after the stale window that a stale entry returns when the refresh fails. */
  staleIfError?: number;
}

/**
 * Options for a custom caching strategy. Omitted durations count as zero seconds.
 *
 * @publicDocs
 */
export type CacheOptions = {
  /** The cache-control directive that Web Cache stores receive, `public` or `private`. Defaults to `public`. The Storefront API client rejects `private`. */
  mode?: ExpirableCacheMode;
  /** How long an entry stays fresh. */
  maxAge?: CacheDuration;
  /** How long after the fresh window the cache serves a stale entry while a background refresh runs. */
  staleWhileRevalidate?: CacheDuration;
  /**
   * How long after the stale-while-revalidate window the cache serves a stale entry when a refresh fails.
   */
  staleIfError?: CacheDuration;
};

/** A strategy with mode `no-store`, which skips the cache. */
type NoStoreStrategy = CachingStrategy & {
  mode: typeof NO_STORE;
};

/**
 * Builds caching strategies. Call it with options for a custom strategy, or use the none, short,
 * and long presets.
 *
 * @publicDocs
 */
export const Cache = Object.assign(createCache, {
  none: cacheNone,
  short: cacheShort,
  long: cacheLong,
});

/**
 * Builds the caching strategies that the Storefront API client and the cached fetch and run helpers accept. Call it with options for a custom strategy, or use the short, long, and none presets.
 *
 * @publicDocs
 */
export type CacheForDocs = {
  (options: CacheOptions): CachingStrategy;
  /**
   * Returns a `no-store` strategy that skips the cache. This preset takes no options.
   */
  none: typeof cacheNone;
  /**
   * Keeps public entries fresh for 1 second, then serves them stale for 9 seconds while revalidating. Pass options to override the mode or either duration, or to add `staleIfError`.
   */
  short: typeof cacheShort;
  /**
   * Keeps public entries fresh for 1 hour, then serves them stale for 23 hours while revalidating. Pass options to override the mode or either duration, or to add `staleIfError`.
   */
  long: typeof cacheLong;
};

export function getCacheRetentionTtl(strategy: CachingStrategy): number {
  if (strategy.mode === NO_STORE) return 0;

  return Math.max(
    0,
    (strategy.maxAge ?? 0) + (strategy.staleWhileRevalidate ?? 0) + (strategy.staleIfError ?? 0),
  );
}

export function getPlatformCacheControlHeader(strategy: CachingStrategy): string {
  const ttl = getCacheRetentionTtl(strategy);
  if (ttl <= 0) return NO_STORE;

  return `${strategy.mode ?? PUBLIC}, max-age=${Math.ceil(ttl)}`;
}

function createCache(options: CacheOptions): CachingStrategy {
  return normalizeCacheOptions(options);
}

function cacheNone(): NoStoreStrategy {
  return { mode: NO_STORE };
}

function cacheShort(overrideOptions?: CacheOptions): CachingStrategy {
  return normalizeCacheOptions(
    {
      mode: PUBLIC,
      maxAge: 1,
      staleWhileRevalidate: 9,
    },
    overrideOptions,
  );
}

function cacheLong(overrideOptions?: CacheOptions): CachingStrategy {
  return normalizeCacheOptions(
    {
      mode: PUBLIC,
      maxAge: 3600,
      staleWhileRevalidate: 82800,
    },
    overrideOptions,
  );
}

function normalizeCacheOptions(
  defaults: CacheOptions,
  overrideOptions?: CacheOptions,
): CachingStrategy;
function normalizeCacheOptions(options: CacheOptions): CachingStrategy;
function normalizeCacheOptions(
  defaultsOrOptions: CacheOptions,
  overrideOptions?: CacheOptions,
): CachingStrategy {
  const options = {
    ...defaultsOrOptions,
    ...overrideOptions,
  };

  return {
    ...normalizeMode(options),
    ...normalizeDurationOption("maxAge", options.maxAge),
    ...normalizeDurationOption("staleWhileRevalidate", options.staleWhileRevalidate),
    ...normalizeDurationOption("staleIfError", options.staleIfError),
  };
}

function normalizeMode(options: CacheOptions): Pick<CachingStrategy, "mode"> {
  if (options.mode && options.mode !== PUBLIC && options.mode !== PRIVATE) {
    throw new Error("'mode' must be either 'public' or 'private'");
  }

  return { mode: options.mode ?? PUBLIC };
}

function normalizeDurationOption(
  name: "maxAge" | "staleWhileRevalidate" | "staleIfError",
  duration: CacheDuration | undefined,
): Pick<CachingStrategy, typeof name> {
  if (duration == null) return {};

  return { [name]: normalizeDuration(duration) };
}

function normalizeDuration(duration: CacheDuration): number {
  if (typeof duration === "number") return validateDuration(duration);

  return validateDuration(
    (duration.seconds ?? 0) +
      (duration.minutes ?? 0) * 60 +
      (duration.hours ?? 0) * 3600 +
      (duration.days ?? 0) * 86400,
  );
}

function validateDuration(duration: number): number {
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error("Cache durations must be finite, non-negative numbers.");
  }

  return Math.ceil(duration);
}
