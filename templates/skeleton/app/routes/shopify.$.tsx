import {
  createStorefrontClient,
  hydrogenServerRoutes,
} from '@shopify/hydrogen-temp';
import type {Route} from './+types/shopify.$';

async function handler({request, context}: Route.ActionArgs) {
  /** this should come from the context, but for testing we have it here for now
   *  once we move createHydrogenContext to the new package, we can then use it from the request context.
   */
  const {storefront} = createStorefrontClient({
    storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    publicStorefrontToken: context.env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken: context.env.PRIVATE_STOREFRONT_API_TOKEN,
  });

  const response = await hydrogenServerRoutes(request, {
    storefront,
  });
  if (response) return response;

  return new Response('Not Found', {status: 404});
}

export const action = handler;
export const loader = handler;
