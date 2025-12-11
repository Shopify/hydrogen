import {type LoaderFunctionArgs} from 'react-router';
import {CacheShort} from '@shopify/hydrogen';

export async function loader({context}: LoaderFunctionArgs) {
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
      cache: CacheShort(),
    },
  );

  return data;
}
