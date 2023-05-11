import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {CacheShort} from '@shopify/hydrogen';

export async function loader({context}: LoaderArgs) {
  const data = await context.storefront.query(
    `#grahpql
  {
    shop {
      name
      description
    }
  }`,
    {
      cache: CacheShort(),
    },
  );

  return json(data);
}
