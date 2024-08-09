import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {getSitemapIndex} from 'app/lib/sitemap';

export async function loader({
  request,
  context: {storefront},
}: LoaderFunctionArgs) {
  const response = await getSitemapIndex({
    storefront,
    request,
    types: ['products', 'collections'],
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
