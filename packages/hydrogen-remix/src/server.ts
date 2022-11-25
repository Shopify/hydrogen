import {
  createRequestHandler as createOxygenRequestHandler,
  getBuyerIp,
} from '@remix-run/oxygen';
import {
  createStorefrontClient,
  type HydrogenContext,
  type StorefrontClientProps,
} from '@shopify/hydrogen';

type HydrogenHandlerParams = {
  storefront: StorefrontClientProps;
  cache?: Cache;
};

export type RequestHandlerOptions = Omit<
  Parameters<ReturnType<typeof createOxygenRequestHandler>>[1],
  'loadContext'
> &
  HydrogenHandlerParams;

export function createRequestHandler(
  oxygenHandlerParams: Parameters<typeof createOxygenRequestHandler>[0],
) {
  const handleRequest = createOxygenRequestHandler(oxygenHandlerParams);

  return async (
    request: Request,
    options: RequestHandlerOptions,
    customContext?: Record<string, any>,
  ) => {
    let {storefront, context, cache, ...rest} = options;

    try {
      if (!cache && !!globalThis.caches) {
        cache = await caches.open('hydrogen');
      }

      const response = await handleRequest(request, {
        ...rest,
        context: createHydrogenContext(request, options, customContext),
      });

      logResponse(oxygenHandlerParams.mode!, request, response.status);

      return response;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}

export function logResponse(mode: string, request: Request, status: number) {
  if (mode !== 'production') {
    // eslint-disable-next-line no-console
    console.log(
      request.method,
      request.url.replace(new URL(request.url).origin, ''),
      status,
      request.headers.get('purpose') === 'prefetch' ? `(prefetch)` : '',
    );
  }
}

export function createHydrogenContext(
  request: Request,
  {storefront, context: executionContext, cache}: RequestHandlerOptions,
  customContext?: Record<string, any>,
) {
  const waitUntil = (p: Promise<any>) => executionContext.waitUntil?.(p);

  return {
    ...createStorefrontClient(storefront, {
      cache,
      buyerIp: getBuyerIp(request),
      waitUntil,
    }),
    ...executionContext,
    waitUntil,
    cache,
    ...customContext,
  } as HydrogenContext & Omit<ExecutionContext, 'passThroughOnException'>;
}
