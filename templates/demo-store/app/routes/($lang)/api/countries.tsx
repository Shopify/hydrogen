import {json, type LoaderArgsWithMiddleware} from '@shopify/remix-oxygen';
import {hydrogenContext} from '~/context';
import {countries} from '~/data/countries';

export async function loader({context}: LoaderArgsWithMiddleware) {
  const {storefront} = context.get(hydrogenContext);
  return json(
    {
      ...countries,
    },
    {
      headers: {
        'cache-control': storefront.generateCacheControlHeader(
          storefront.CacheLong(),
        ),
      },
    },
  );
}

// no-op
export default function CountriesApiRoute() {
  return null;
}
