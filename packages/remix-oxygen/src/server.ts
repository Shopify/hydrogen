import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';
import {
  cacheResponse,
  getItemFromCache,
  isPublicCacheControlHeader,
  isStale,
  shouldCacheRequest,
} from './cache';

type CreateOxygenRequestHandler = {
  build: ServerBuild;
  mode?: string;
  getLoadContext?: (
    request: Request,
  ) => Promise<AppLoadContext> | AppLoadContext;
  waitUntil?: ExecutionContext['waitUntil'];
};

export function createRequestHandler({
  build,
  mode,
  getLoadContext,
  waitUntil,
}: CreateOxygenRequestHandler) {
  const handleRequest = createRemixRequestHandler(build, mode);
  const handleRequestWithContext = async (request: Request) =>
    handleRequest(request, await getLoadContext?.(request));

  return async (request: Request) => {
    const cache =
      !!waitUntil &&
      shouldCacheRequest(request) &&
      (await caches.open('oxygen'));

    if (cache) {
      const cachedResponse = await getItemFromCache(cache, request);

      if (cachedResponse) {
        if (isStale(request, cachedResponse.headers)) {
          cacheResponse(
            request,
            () => handleRequestWithContext(request),
            cache,
            waitUntil,
          );
        }

        return cachedResponse;
      }
    }

    const response = await handleRequestWithContext(request);

    if (cache && isPublicCacheControlHeader(response)) {
      cacheResponse(request, () => response.clone(), cache, waitUntil);
    }

    return response;
  };
}

export function getBuyerIp(request: Request) {
  return request.headers.get('oxygen-buyer-ip') ?? undefined;
}
