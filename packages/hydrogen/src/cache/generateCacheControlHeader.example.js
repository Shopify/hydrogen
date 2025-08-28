import {data} from 'react-router';
import {generateCacheControlHeader, CacheShort} from '@shopify/hydrogen';

export async function loader() {
  return data(
    {some: 'data'},
    {
      headers: {
        'cache-control': generateCacheControlHeader(CacheShort()),
      },
    },
  );
}
