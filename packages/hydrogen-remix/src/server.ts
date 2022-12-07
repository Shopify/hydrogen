import {
  createRequestHandler as createOxygenRequestHandler,
  getBuyerIp,
} from '@shopify/h2-test-remix-oxygen';
import {
  createStorefrontClient,
  type StorefrontClientProps,
} from '@shopify/h2-test-hydrogen';
import {proxyLiquidRoute} from './routing/proxy';

type HydrogenHandlerParams = {
  storefront: StorefrontClientProps;
  cache?: Cache;
};

export function createRequestHandler(
  oxygenHandlerParams: Parameters<typeof createOxygenRequestHandler>[0] & {
    shouldProxyOnlineStore?: (request: Request) => string | null | undefined;
  },
) {
  const handleRequest = createOxygenRequestHandler(oxygenHandlerParams);

  return async (
    request: Request,
    {
      storefront,
      context,
      cache,
      ...options
    }: Omit<Parameters<typeof handleRequest>[1], 'loadContext'> &
      HydrogenHandlerParams,
    customContext?: Record<string, any>,
  ) => {
    const onlineStoreProxy =
      oxygenHandlerParams?.shouldProxyOnlineStore?.(request);

    try {
      if (onlineStoreProxy) {
        return await proxyLiquidRoute(
          request,
          storefront.storeDomain,
          onlineStoreProxy,
        );
      }

      if (!cache && !!globalThis.caches) {
        cache = await caches.open('hydrogen');
      }

      return await handleRequest(request, {
        ...options,
        context: {
          ...createStorefrontClient(storefront, {
            cache,
            buyerIp: getBuyerIp(request),
            waitUntil: (p: Promise<any>) => context.waitUntil(p),
          }),
          ...context,
          cache,
          ...customContext,
        },
      });
    } catch (e) {
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}
