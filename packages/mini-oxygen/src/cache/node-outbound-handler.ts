// This code runs on Node environment
import {Request, Response, type Miniflare} from 'miniflare';
import {
  OXYGEN_CACHE_URL,
  type OxygenCachePayload,
  type OxygenCacheMatchResponse,
} from './common.js';
import {addSwrHeaders, isStale} from './swr.js';

export function isCacheRequest(request: Request) {
  return request.url === OXYGEN_CACHE_URL;
}

type GlobalCaches = {open: (cacheName: string) => Promise<Cache>};
type FetchResponse = InstanceType<typeof globalThis.Response>;

// When Miniflare reloads, we need to reset these in-memory resources.
const activeCacheInstances = new Map<string, Cache>();
const cacheTagIndex = new Map<string, Set<string>>();
export function releaseNodeCacheResources() {
  activeCacheInstances.clear();
  cacheTagIndex.clear();
}

export async function handleOutboundCacheRequest(
  request: Request,
  mf: Miniflare,
) {
  const body = (await request.json()) as OxygenCachePayload;
  let cacheInstance = activeCacheInstances.get(body.name);

  if (!cacheInstance) {
    const caches = (await mf.getCaches()) as unknown as GlobalCaches;
    cacheInstance = await caches.open(body.name);
    activeCacheInstances.set(body.name, cacheInstance);
  }

  const cacheKeyUrl = `https://shopify.dev/?cache_name=${encodeURIComponent(
    body.name,
  )}&cache_key=${encodeURIComponent(body.key)}`;

  const cacheKey = new Request(cacheKeyUrl) as unknown as RequestInfo;

  try {
    if (body.method === 'match') {
      const cacheResponse = (await cacheInstance.match(
        cacheKey,
      )) as unknown as Response;

      return Response.json(
        (cacheResponse
          ? {
              status: isStale(cacheResponse) ? 'STALE' : 'HIT',
              value: Object.values(
                new Uint8Array(await cacheResponse?.arrayBuffer()),
              ),
            }
          : {status: 'MISS'}) satisfies OxygenCacheMatchResponse,
        cacheResponse,
      );
    } else if (body.method === 'put') {
      const headers = addSwrHeaders(body.headers);

      const cacheValue = new Response(new Uint8Array(body.value), {
        headers: [...headers],
      }) as unknown as FetchResponse;

      await cacheInstance.put(cacheKey, cacheValue);

      const cacheTags = headers.get('cache-tags')?.split(',');
      if (cacheTags) {
        indexKeyByTags(cacheKeyUrl, cacheTags);
      }

      return new Response();
    } else if (body.method === 'delete') {
      const headers = new Headers(body.headers);
      const cacheTags = headers.get('cache-tags')?.split(',');

      const isRemoved = cacheTags
        ? await deleteTaggedKeys(cacheInstance, cacheTags)
        : await cacheInstance.delete(cacheKey);

      return Response.json(isRemoved);
    } else {
      throw new Error(`cache.${(body as any).method} is not implemented`);
    }
  } catch (error) {
    console.error(error);
    return new Response((error as Error).message, {status: 500});
  }
}

function indexKeyByTags(keyUrl: string, tags: string[]) {
  for (const tag of tags) {
    const indexedKeys = cacheTagIndex.get(tag) ?? new Set();
    indexedKeys.add(keyUrl);
    cacheTagIndex.set(tag, indexedKeys);
  }
}

async function deleteTaggedKeys(cacheInstance: Cache, tags: string[]) {
  let hasRemovedSomethingAtAll = false;

  for (const tag of tags) {
    const indexedKeys = cacheTagIndex.get(tag);
    if (indexedKeys) {
      hasRemovedSomethingAtAll = indexedKeys.size > 0;

      for (const keyUrl of indexedKeys) {
        await cacheInstance.delete(
          new Request(keyUrl) as unknown as RequestInfo,
        );
      }

      indexedKeys.clear();
    }
  }

  return hasRemovedSomethingAtAll;
}
