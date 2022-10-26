import {createRequestHandler as createOxygenRequestHandler} from '@remix-run/oxygen';
import {createStorefrontClient, type StorefrontClientProps} from './storefront';

type HydrogenHandlerParams = {
  storefront: StorefrontClientProps;
  cache?: Cache;
};

export function createRequestHandler(
  oxygenHandlerParams: Parameters<typeof createOxygenRequestHandler>[0],
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
  ) => {
    try {
      if (!cache && !!globalThis.caches) {
        cache = await caches.open('hydrogen');
      }

      return await handleRequest(request, {
        ...options,
        context: {
          ...context,
          cache,
          storefront: createStorefrontClient(storefront, {cache}),
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}
