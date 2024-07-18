export const OXYGEN_CACHE_URL = 'https://oxygen.myshopify.dev/cache';

export const CACHE_CONTROL = 'cache-control';
export const REAL_CACHE_CONTROL = 'real-cache-control';
export const CACHE_PUT_DATE = 'cache-put-date';

export type CacheStatus = 'HIT' | 'MISS' | 'STALE';
export type OxygenCacheMatchResponse = {value?: number[]; status: CacheStatus};

export type OxygenCachePayload = {
  name: string;
  key: string;
} & (
  | {method: 'match'}
  | {method: 'delete'}
  | {method: 'put'; value: number[]; headers: Array<[string, string]>}
);
