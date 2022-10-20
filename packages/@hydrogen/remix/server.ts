import {createRequestHandler as createOxygenRequestHandler} from '@remix-run/oxygen';
import {createStorefrontClient, type StorefrontClientProps} from './storefront';

type HydrogenHandlerParams = {
  storefront: StorefrontClientProps;
};

export function createRequestHandler({
  storefront,
  getLoadContext,
  ...oxygenHandlerParams
}: Parameters<typeof createOxygenRequestHandler>[0] & HydrogenHandlerParams) {
  return createOxygenRequestHandler({
    ...oxygenHandlerParams,
    getLoadContext: async (request) => {
      const context = getLoadContext ? await getLoadContext(request) : {};
      // @ts-ignore
      context.storefront = createStorefrontClient(storefront);

      return context;
    },
  });
}
