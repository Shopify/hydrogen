import type {Response} from 'miniflare';
import {CACHE_CONTROL, REAL_CACHE_CONTROL, CACHE_PUT_DATE} from './common.js';

export function addSwrHeaders(originalHeaders: Array<[string, string]>) {
  const headers = new Headers(originalHeaders);
  const cacheControlHeader = headers.get(CACHE_CONTROL);

  if (!cacheControlHeader) return headers;

  const maxAge = Number(
    cacheControlHeader.match(/(?:^|,)\s*max-age=(\d+)/)?.[1] ?? 0,
  );
  const swr = Number(
    cacheControlHeader.match(/(?:^|,)\s*stale-while-revalidate=(\d+)/)?.[1] ??
      0,
  );

  if (!maxAge || !swr) return headers;

  const paddedCacheControlHeader = cacheControlHeader.replace(
    /((?:^|,)\s*max-age)=\d+/,
    `$1=${maxAge + swr}`,
  );

  headers.set(CACHE_CONTROL, paddedCacheControlHeader);
  headers.set(REAL_CACHE_CONTROL, cacheControlHeader);
  headers.set(CACHE_PUT_DATE, String(Date.now()));

  return [...headers];
}

export function isStale(response: Response) {
  const responseDate = response.headers.get(CACHE_PUT_DATE);
  const realCacheControl = response.headers.get(REAL_CACHE_CONTROL);

  if (!responseDate || !realCacheControl) return false;

  const age = (Date.now() - Number(responseDate)) / 1000;
  const maxAge = Number(realCacheControl.match(/max-age=(\d+)/)?.[1] ?? 0);

  return age > maxAge;
}
