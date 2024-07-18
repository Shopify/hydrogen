// This code runs on Node environment
import {Request, Response, type Miniflare} from 'miniflare';
import {OXYGEN_CACHE_URL} from './common.js';

export function isCacheRequest(request: Request) {
  return request.url === OXYGEN_CACHE_URL;
}

type GlobalCaches = {open: (cacheName: string) => Promise<Cache>};
type FetchResponse = InstanceType<typeof globalThis.Response>;

// When Miniflare reloads, we need to recreate the stubs.
const openedCachesMap = new Map<string, Cache>();
export function resetBindingStubs() {
  openedCachesMap.clear();
}

type OxygenCachePayload = {
  name: string;
  key: string;
  method: 'put' | 'match' | 'delete';
  headers: Array<[string, string]>;
  value: number[];
};

export async function handleOutboundCacheRequest(
  request: Request,
  mf: Miniflare,
) {
  let tBody = Date.now();
  const body = (await request.json()) as OxygenCachePayload;
  tBody = Date.now() - tBody;
  let tGetCaches = Date.now();
  let cacheInstance = openedCachesMap.get(body.name);

  if (!cacheInstance) {
    const caches = (await mf.getCaches()) as unknown as GlobalCaches;

    tGetCaches = Date.now() - tGetCaches;
    var tCachesOpen = Date.now();
    cacheInstance = await caches.open(body.name);
    tCachesOpen = Date.now() - tCachesOpen;
    openedCachesMap.set(body.name, cacheInstance);
  } else {
    tGetCaches = Date.now() - tGetCaches;
  }

  const cacheKey = new Request(getKeyUrl(body.key)) as unknown as RequestInfo;

  try {
    if (body.method === 'match') {
      const cacheResponse = (await cacheInstance.match(
        cacheKey,
      )) as unknown as Response;

      return new Response(
        JSON.stringify({
          value: cacheResponse
            ? Object.values(new Uint8Array(await cacheResponse?.arrayBuffer()))
            : undefined,
          status: cacheResponse ? 'HIT' : 'MISS',
        }),
        cacheResponse,
      );
    } else if (body.method === 'put') {
      const cacheValue = new Response(new Uint8Array(body.value), {
        headers: body.headers,
      }) as unknown as FetchResponse;

      await cacheInstance.put(cacheKey, cacheValue);
      return new Response();
    } else if (body.method === 'delete') {
      await cacheInstance.delete(cacheKey);
      return new Response();
    } else {
      throw new Error(`cache.${body.method} is not implemented`);
    }
  } catch (error) {
    console.error(error);
    return new Response((error as Error).message, {status: 500});
  }
}

function getKeyUrl(key: string) {
  return `https://shopify.dev/?${encodeURIComponent(key)}`;
}
