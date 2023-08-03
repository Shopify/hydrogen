import {json} from '@shopify/remix-oxygen';
import {CacheLong, generateCacheControlHeader} from '@shopify/hydrogen';
import {localizations} from '~/locales.server';

export async function loader() {
  return json(
    {localizations},
    {
      headers: {
        'cache-control': generateCacheControlHeader(CacheLong()),
      },
    },
  );
}

// no-op
export default function CountriesApiRoute() {
  return null;
}
