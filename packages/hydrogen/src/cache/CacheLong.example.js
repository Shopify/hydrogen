import {CacheLong} from '@shopify/hydrogen';

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
      cache: CacheLong(),
    },
  );

  return data;
}
