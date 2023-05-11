/**
 * Override options for a cache strategy.
 */
export interface AllCacheOptions {
  /**
   * The caching mode, generally `public`, `private`, or `no-store`.
   */
  mode?: string;
  /**
   * The maximum amount of time in seconds that a resource will be considered fresh. See `max-age` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=Response%20Directives-,max%2Dage,-The%20max%2Dage).
   */
  maxAge?: number;
  /**
   * Indicate that the cache should serve the stale response in the background while revalidating the cache. See `stale-while-revalidate` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate).
   */
  staleWhileRevalidate?: number;
  /**
   * Similar to `maxAge` but specific to shared caches. See `s-maxage` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#s-maxage).
   */
  sMaxAge?: number;
  /**
   * Indicate that the cache should serve the stale response if an error occurs while revalidating the cache. See `stale-if-error` in the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-if-error).
   */
  staleIfError?: number;
}

/**
 * Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the pre-defined caching strategies: CacheNone, CacheShort, CacheLong.
 */
export type CachingStrategy = AllCacheOptions;

export type NoStoreStrategy = {
  mode: string;
};

const PUBLIC = 'public';
const PRIVATE = 'private';
export const NO_STORE = 'no-store';

const optionMapping: {
  [key: string]: string;
} = {
  maxAge: 'max-age',
  staleWhileRevalidate: 'stale-while-revalidate',
  sMaxAge: 's-maxage',
  staleIfError: 'stale-if-error',
};

export function generateCacheControlHeader(
  cacheOptions: CachingStrategy,
): string {
  const cacheControl: string[] = [];
  Object.keys(cacheOptions).forEach((key: string) => {
    if (key === 'mode') {
      cacheControl.push(cacheOptions[key] as string);
    } else if (optionMapping[key]) {
      cacheControl.push(
        `${optionMapping[key]}=${cacheOptions[key as keyof CachingStrategy]}`,
      );
    }
  });
  return cacheControl.join(', ');
}

/**
 *
 * @public
 */
export function CacheNone(): NoStoreStrategy {
  return {
    mode: NO_STORE,
  };
}

function guardExpirableModeType(overrideOptions?: CachingStrategy) {
  if (
    overrideOptions?.mode &&
    overrideOptions?.mode !== PUBLIC &&
    overrideOptions?.mode !== PRIVATE
  ) {
    throw Error("'mode' must be either 'public' or 'private'");
  }
}

/**
 *
 * @public
 */
export function CacheShort(overrideOptions?: CachingStrategy): AllCacheOptions {
  guardExpirableModeType(overrideOptions);
  return {
    mode: PUBLIC,
    maxAge: 1,
    staleWhileRevalidate: 9,
    ...overrideOptions,
  };
}

/**
 *
 * @public
 */
export function CacheLong(overrideOptions?: CachingStrategy): AllCacheOptions {
  guardExpirableModeType(overrideOptions);
  return {
    mode: PUBLIC,
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 82800, // 23 Hours
    ...overrideOptions,
  };
}

/**
 *
 * @public
 */
export function CacheCustom(overrideOptions: CachingStrategy): AllCacheOptions {
  return overrideOptions as AllCacheOptions;
}
