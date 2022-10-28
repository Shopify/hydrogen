import {
  createRequestHandler as createOxygenRequestHandler,
  getBuyerIp,
} from '@remix-run/oxygen';
import {createStorefrontClient, type StorefrontClientProps} from './storefront';
import {InMemoryCache} from './cache/in-memory';

type HydrogenHandlerParams = {
  storefront: StorefrontClientProps;
  cache?: Cache;
};

export function createRequestHandler(
  oxygenHandlerParams: Parameters<typeof createOxygenRequestHandler>[0],
) {
  const handleRequest = createOxygenRequestHandler(oxygenHandlerParams);

  const inMemorycache =
    oxygenHandlerParams.mode === 'development'
      ? new InMemoryCache()
      : undefined;

  return async (
    request: Request,
    {
      storefront,
      context,
      cache,
      ...options
    }: Omit<Parameters<typeof handleRequest>[1], 'loadContext'> &
      HydrogenHandlerParams,
  ) => {
    try {
      if (!cache && !!globalThis.caches) {
        cache =
          oxygenHandlerParams.mode === 'development'
            ? inMemorycache
            : await caches.open('hydrogen');
      }

      return await handleRequest(request, {
        ...options,
        context: {
          ...context,
          cache,
          storefront: createStorefrontClient(storefront, {
            cache,
            buyerIp: getBuyerIp(request),
            waitUntil: (p: Promise<any>) => context.waitUntil(p),
          }),
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}
