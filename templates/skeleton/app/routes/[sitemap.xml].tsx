import type {Route} from './+types/[sitemap.xml]';
import {getSitemapIndex, hydrogenContext} from '@shopify/hydrogen';

export async function loader({request, context}: Route.LoaderArgs) {
  const storefront = context.get(hydrogenContext.storefront);

  const response = await getSitemapIndex({
    storefront,
    request,
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
