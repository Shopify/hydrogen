import {json} from '@shopify/remix-oxygen';
import {generateCacheControlHeader, CacheShort} from '@shopify/hydrogen';

export async function loader() {
  return json(
    {some: 'data'},
    {
      headers: {
        'cache-control': generateCacheControlHeader(CacheShort()),
      },
    },
  );
}
