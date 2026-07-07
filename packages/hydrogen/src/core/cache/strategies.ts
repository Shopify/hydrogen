export const NO_STORE = "no-store";

const PUBLIC = "public";
const PRIVATE = "private";

export type CacheMode = typeof PUBLIC | typeof PRIVATE | typeof NO_STORE;
export type ExpirableCacheMode = typeof PUBLIC | typeof PRIVATE;

export type CacheDuration =
  | number
  | {
      seconds?: number;
      minutes?: number;
      hours?: number;
      days?: number;
    };

export interface CachingStrategy {
  mode?: CacheMode;
  maxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export type CacheOptions = {
  mode?: ExpirableCacheMode;
  maxAge?: CacheDuration;
  staleWhileRevalidate?: CacheDuration;
  staleIfError?: CacheDuration;
};

export type NoStoreStrategy = CachingStrategy & {
  mode: typeof NO_STORE;
};

export const Cache = Object.assign(createCache, {
  none: cacheNone,
  short: cacheShort,
  long: cacheLong,
});

export function getCacheRetentionTtl(strategy: CachingStrategy): number {
  if (strategy.mode === NO_STORE) return 0;

  return Math.max(
    0,
    (strategy.maxAge ?? 0) + (strategy.staleWhileRevalidate ?? 0) + (strategy.staleIfError ?? 0),
  );
}

export function getCacheControlHeader(strategy: CachingStrategy): string {
  const cacheControl: string[] = [];

  if (strategy.mode) cacheControl.push(strategy.mode);
  if (strategy.maxAge != null) cacheControl.push(`max-age=${strategy.maxAge}`);
  if (strategy.staleWhileRevalidate != null) {
    cacheControl.push(`stale-while-revalidate=${strategy.staleWhileRevalidate}`);
  }
  if (strategy.staleIfError != null) {
    cacheControl.push(`stale-if-error=${strategy.staleIfError}`);
  }

  return cacheControl.join(", ");
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
