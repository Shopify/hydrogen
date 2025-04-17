import {data} from '@remix-run/server-runtime';
import {CacheLong, generateCacheControlHeader} from '@shopify/hydrogen';
import {countries} from '~/data/countries';

export async function loader() {
  return data(
    {...countries},
    {headers: {'cache-control': generateCacheControlHeader(CacheLong())}},
  );
}
