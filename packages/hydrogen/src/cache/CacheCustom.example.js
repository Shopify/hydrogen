import {CacheCustom} from '@shopify/hydrogen';

export async function loader({context}) {
  const data = await context.storefront.query(
    `#grahpql
      {
        shop {
          name
          description
        }
      }
    `,
    {
      cache: CacheCustom({
        maxAge: 1000 * 60 * 60 * 24 * 365,
        staleWhileRevalidate: 1000 * 60 * 60 * 24 * 7,
      }),
    },
  );

  return data;
}
