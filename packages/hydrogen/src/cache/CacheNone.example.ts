import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {CacheNone} from '@shopify/hydrogen';

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
      cache: CacheNone(),
    },
  );

  return json(data);
}
