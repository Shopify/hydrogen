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
  const {mode} = oxygenHandlerParams;

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
        const response = await proxyLiquidRoute(
          request,
          storefront.storeDomain,
          onlineStoreProxy,
        );

        logResponse(request, response, mode);

        return response;
      }

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

      logResponse(request, response, mode);

      return response;
    } catch (e) {
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}

export function logResponse(
  request: Request,
  response: Response,
  mode?: string,
) {
  if (mode === 'development') {
    const url = new URL(request.url);
    const isProxy = !!response.url && response.url !== request.url;
    const isDataRequest = !isProxy && url.searchParams.has('_data');
    let type = 'render';
    let info = request.url.replace(url.origin, '');

    if (isProxy) {
      type = 'proxy';
      info += `  [${response.url}]`;
    }

    if (isDataRequest) {
      type = request.method === 'GET' ? 'loader' : 'action';
      const dataParam = url.searchParams.get('_data')?.replace('routes/', '');
      info =
        url.pathname +
        `  [${
          dataParam?.includes('/.hydrogen/')
            ? dataParam.replace(/^.*(\.hydrogen\/)/, '$1')
            : dataParam
        }]`;
    }

    console.log(
      request.method.padStart(6) + ' ',
      response.status,
      ' ' + type.padEnd(7, ' '),
      info + ' ',
      request.headers.get('purpose') === 'prefetch' ? `(prefetch)` : '',
    );
  }
}
