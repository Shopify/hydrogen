import {json, type LoaderArgs} from '@remix-run/oxygen';
import {countries} from '~/data/countries';

export async function loader({context: {storefront}}: LoaderArgs) {
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
