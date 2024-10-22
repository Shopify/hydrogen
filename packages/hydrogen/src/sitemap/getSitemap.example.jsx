import {getSitemap} from '@shopify/hydrogen';

export async function loader({request, params, context: {storefront}}) {
  const response = await getSitemap({
    storefront,
    request,
    params,
    // The locales to include in the sitemap
    locales: ['EN-US', 'EN-CA', 'FR-CA'],
    // A function to generate a link for a given resource
    getLink: ({type, baseUrl, handle, locale}) => {
      if (!locale) return `${baseUrl}/${type}/${handle}`;
      return `${baseUrl}/${locale}/${type}/${handle}`;
    },
  });

  // Set any custom headers on the sitemap response
  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
