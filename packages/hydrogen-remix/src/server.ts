import {
  createRequestHandler as createOxygenRequestHandler,
  getBuyerIp,
} from '@remix-run/oxygen';
import {
  createStorefrontClient,
  type StorefrontClientProps,
} from '@shopify/hydrogen';
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

    if (onlineStoreProxy)
      return proxyLiquidRoute(
        request,
        storefront.storeDomain,
        onlineStoreProxy,
      );

    try {
      if (!cache && !!globalThis.caches) {
        cache = await caches.open('hydrogen');
      }

      const response = await handleRequest(request, {
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

      if (oxygenHandlerParams.mode !== 'production') {
        // eslint-disable-next-line no-console
        console.log(
          request.method,
          request.url.replace(new URL(request.url).origin, ''),
          response.status,
          request.headers.get('purpose') === 'prefetch' ? `(prefetch)` : '',
        );
      }

      return response;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}
