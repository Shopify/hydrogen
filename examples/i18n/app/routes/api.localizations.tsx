import {json} from '@shopify/remix-oxygen';
import {
  CacheLong,
  CacheNone,
  generateCacheControlHeader,
} from '@shopify/hydrogen';
import {localizations} from '~/locales.server';

export async function loader() {
  return json(
    {localizations},
    {
      headers: {
        'cache-control': generateCacheControlHeader(CacheNone()),
      },
    },
  );
}

// no-op
export default function CountriesApiRoute() {
  return null;
}
