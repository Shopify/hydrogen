import {createRequestHandler as createOxygenRequestHandler} from '@remix-run/oxygen';
import {createStorefrontClient, type StorefrontClientProps} from './storefront';

type HydrogenHandlerParams = {
  storefront: StorefrontClientProps;
};

export function createRequestHandler(
  oxygenHandlerParams: Parameters<typeof createOxygenRequestHandler>[0],
) {
  const handleRequest = createOxygenRequestHandler(oxygenHandlerParams);

  return (
    request: Request,
    {
      storefront,
      context,
      ...options
    }: Omit<Parameters<typeof handleRequest>[1], 'loadContext'> &
      HydrogenHandlerParams,
  ) => {
    try {
      return handleRequest(request, {
        ...options,
        context: {...context, storefront: createStorefrontClient(storefront)},
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}
