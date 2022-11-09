export interface AllCacheOptions {
  mode?: string;
  maxAge?: number;
  staleWhileRevalidate?: number;
  sMaxAge?: number;
  staleIfError?: number;
}

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
