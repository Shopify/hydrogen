export const NO_STORE = "no-store";

const PUBLIC = "public";
const PRIVATE = "private";

/** The cache mode of a strategy, `public`, `private`, or `no-store`. A `no-store` strategy skips the cache. */
export type CacheMode = typeof PUBLIC | typeof PRIVATE | typeof NO_STORE;
/** The modes that a custom strategy accepts, `public` or `private`. `Cache` throws an error for any other mode. */
export type ExpirableCacheMode = typeof PUBLIC | typeof PRIVATE;

/**
 * A number of seconds, or an object such as `{ minutes: 10 }`. `Cache` throws an error for a duration that isn't a finite, non-negative number, and rounds fractional totals up to whole seconds.
 */
export type CacheDuration =
  | number
  | {
      seconds?: number;
      minutes?: number;
      hours?: number;
      days?: number;
    };

/** A caching strategy, with every duration in whole seconds. Create a strategy with `Cache`. */
export interface CachingStrategy {
  /** The cache mode. A `no-store` strategy skips the cache. */
  mode?: CacheMode;
  /** How many seconds an entry stays fresh. */
  maxAge?: number;
  /** How many seconds after the fresh window the cache serves a stale entry while it refreshes the entry in the background. */
  staleWhileRevalidate?: number;
  /** How many seconds after the stale window the cache serves a stale entry when the refresh fails. */
  staleIfError?: number;
}

/**
 * Options for a custom caching strategy. A duration that you leave out counts as zero seconds.
 *
 * @publicDocs
 */
export type CacheOptions = {
  /** The cache mode, `public` or `private`. Defaults to `public`. Web Cache stores receive the mode in the `cache-control` header. The Storefront API client throws an error for `private`. */
  mode?: ExpirableCacheMode;
  /** How long an entry stays fresh. */
  maxAge?: CacheDuration;
  /** How long after the fresh window the cache serves a stale entry while it refreshes the entry in the background. */
  staleWhileRevalidate?: CacheDuration;
  /**
   * How long after the stale-while-revalidate window the cache serves a stale entry when a refresh fails.
   */
  staleIfError?: CacheDuration;
};

/** A strategy that skips the cache. */
type NoStoreStrategy = CachingStrategy & {
  mode: typeof NO_STORE;
};

/**
 * Creates caching strategies for Storefront API queries, cached fetches, and cached runs. Call
 * `Cache` with options for a custom strategy, or use the `none`, `short`, and `long` presets.
 *
 * @publicDocs
 */
export const Cache = Object.assign(createCache, {
  none: cacheNone,
  short: cacheShort,
  long: cacheLong,
});

/**
 * Creates caching strategies for Storefront API queries, cached fetches, and cached runs. Call `Cache` with options for a custom strategy, or use the `short`, `long`, and `none` presets.
 *
 * @publicDocs
 */
export type CacheForDocs = {
  (options: CacheOptions): CachingStrategy;
  /**
   * Returns a strategy that skips the cache. The preset takes no options.
   */
  none: typeof cacheNone;
  /**
   * Keeps public entries fresh for 1 second, then serves stale entries for 9 more seconds while the cache refreshes them. Pass options to override the mode or either duration, or to add `staleIfError`.
   */
  short: typeof cacheShort;
  /**
   * Keeps public entries fresh for 1 hour, then serves stale entries for 23 more hours while the cache refreshes them. Pass options to override the mode or either duration, or to add `staleIfError`.
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
