import {type CacheKey, runWithCache} from './cache/fetch';
import type {CachingStrategy} from './cache/strategies';

/**
 * Creates a utility function that executes an asynchronous operation
 * like `fetch` and caches the result according to the strategy provided.
 * Use this to call any third-party APIs from loaders or actions.
 * By default, it uses the `CacheShort` strategy.
 *
 * Example:
 *
 * ```js
 * // In your app's `server.ts` file:
 * createRequestHandler({
 *   /* ... *\/,
 *   getLoadContext: () => ({ withCache: createWithCache_unstable({cache, waitUntil}) })
 * });
 *
 * // In your route loaders:
 * import {CacheShort} from '@shopify/hydrogen';
 * export async function loader ({context: {withCache}}) {
 *   const data = await withCache('my-unique-key', CacheShort(), () => {
 *     return fetch('https://example.com/api').then(res => res.json());
 *   });
 * ```
 */
export function createWithCache_unstable({
  cache,
  waitUntil,
}: {
  cache: Cache;
  waitUntil: ExecutionContext['waitUntil'];
}) {
  return <T = unknown>(
    cacheKey: CacheKey,
    strategy: CachingStrategy,
    actionFn: () => T | Promise<T>,
  ) =>
    runWithCache<T>(cacheKey, actionFn, {
      strategy,
      cacheInstance: cache,
      waitUntil,
    });
}

export type WithCache = ReturnType<typeof createWithCache_unstable>;
