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
      ...options
    }: Omit<Parameters<typeof handleRequest>[1], 'loadContext'> &
      HydrogenHandlerParams,
  ) => {
    try {
      return handleRequest(request, {
        ...options,
        loadContext: {storefront: createStorefrontClient(storefront)},
      });
    } catch (e) {
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}
