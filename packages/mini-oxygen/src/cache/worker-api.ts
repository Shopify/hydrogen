// This code runs on worker environment
import {
  OXYGEN_CACHE_URL,
  CACHE_CONTROL,
  REAL_CACHE_CONTROL,
  CACHE_PUT_DATE,
  type OxygenCacheMatchResponse,
  type OxygenCachePayload,
} from './common.js';

export async function createOxygenCache(cacheName: string) {
  // TODO ensure methods meet these conditions:
  // https://developers.cloudflare.com/workers/runtime-apis/cache/#methods

  return new OxygenCache(cacheName);
}

function notImplementedMessage(methodName: string) {
  // Same message as native CF cache:
  return `Failed to execute '${methodName}' on 'Cache': the method is not implemented.`;
}

async function cacheFetch(body: OxygenCachePayload) {
  try {
    const response = await fetch(OXYGEN_CACHE_URL, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(response.statusText);

    return response;
  } catch (unknownError) {
    const error = unknownError as Error;
    error.message = `[o2:error:cache.${body.method}] ` + error.message;
    console.error(error);
  }
}

export class OxygenCache implements Cache {
  #cacheName: string;

  constructor(cacheName: string) {
    this.#cacheName = cacheName;
  }

  keys(request?: Request): Promise<readonly Request[]> {
    throw new Error(notImplementedMessage('keys'));
  }

  add(request: RequestInfo): Promise<void> {
    throw new Error(notImplementedMessage('add'));
  }

  addAll(requests: RequestInfo[]): Promise<void> {
    throw new Error(notImplementedMessage('addAll'));
  }

  matchAll(
    request?: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<readonly Response[]> {
    throw new Error(notImplementedMessage('matchAll'));
  }

  async put(request: Request, response: Response) {
    if (request.method !== 'GET') {
      throw new TypeError('Cannot cache response to non-GET request.');
    }

    if (response.status === 206) {
      throw new TypeError(
        'Cannot cache response to a range request (206 Partial Content).',
      );
    }

    if (response.headers.get('vary')?.includes('*')) {
      throw new TypeError("Cannot cache response with 'Vary: *' header.");
    }

    const headers = new Headers(response.headers);

    // Hydrogen might send this header
    const realCacheControl = headers.get(REAL_CACHE_CONTROL);
    if (realCacheControl) {
      headers.set(CACHE_CONTROL, realCacheControl);
    }

    if (headers.get(CACHE_CONTROL)?.includes('public') === false) {
      // cache.put returns a 413 error if Cache-Control instructs not to cache or if the response is too large.
      new Response('Content Too Large', {status: 413});
    }

    // Hydrogen might send these headers, clean it up
    headers.delete(REAL_CACHE_CONTROL);
    headers.delete(CACHE_PUT_DATE);

    // TODO support tags
    await cacheFetch({
      name: this.#cacheName,
      method: 'put',
      key: request.url,
      // tags,
      // options: getCacheOption(userCacheOptions),
      value: Object.values(new Uint8Array(await response.arrayBuffer())),
      headers: [...headers],
    });
  }

  async match(request: Request) {
    if (request.method !== 'GET') return;

    const cacheResponse = await cacheFetch({
      name: this.#cacheName,
      method: 'match',
      key: request.url,
    });

    if (!cacheResponse) {
      return;
    }

    try {
      const {value, status} =
        await cacheResponse.json<OxygenCacheMatchResponse>();

      if (!value || status === 'MISS') return;

      return new Response(new Uint8Array(value), {
        status: cacheResponse.status ?? 200,
        headers: [...cacheResponse.headers, ['oxygen-cache-status', status]],
      });
    } catch (unknownError) {
      const error = unknownError as Error;
      error.message = `[o2:error:cache.match] ` + error.message;
      console.error(error);
      return;
    }
  }

  async delete(request: Request) {
    const cacheResponse = await cacheFetch({
      name: this.#cacheName,
      method: 'delete',
      key: request.url,
      // tags,
    });

    return cacheResponse ? await cacheResponse.json<boolean>() : false;
  }
}
