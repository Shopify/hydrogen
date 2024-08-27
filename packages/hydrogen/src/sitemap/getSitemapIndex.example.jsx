import {unstable__getSitemapIndex as getSitemapIndex} from '@shopify/hydrogen';

export async function loader({request, context: {storefront}}) {
  const response = await getSitemapIndex({
    storefront,
    request,
    types: [
      'products',
      'pages',
      'collections',
      'metaObjects',
      'articles',
      'blogs',
    ],
  });

  // Set any custom headers on the sitemap response
  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
