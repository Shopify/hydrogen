import {CachingStrategy} from './strategies';

export async function fetchWithServerCache(
  url: string,
  options: Request | RequestInit,
  {cache, cacheOptions}: {cache?: Cache; cacheOptions?: CachingStrategy} = {},
) {
  if (!cache) return fetch(url, options);

  // TODO implement caching
  return fetch(url, options);
}
