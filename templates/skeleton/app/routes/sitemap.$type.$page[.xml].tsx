import type {Route} from './+types/sitemap.$type.$page[.xml]';
import {getSitemap, hydrogenContext} from '@shopify/hydrogen';

export async function loader({request, params, context}: Route.LoaderArgs) {
  const storefront = context.get(hydrogenContext.storefront);

  const response = await getSitemap({
    storefront,
    request,
    params,
    locales: ['EN-US', 'EN-CA', 'FR-CA'],
    getLink: ({type, baseUrl, handle, locale}) => {
      if (!locale) return `${baseUrl}/${type}/${handle}`;
      return `${baseUrl}/${locale}/${type}/${handle}`;
    },
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
