import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {CacheCustom} from '@shopify/hydrogen';

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
      cache: CacheCustom({
        maxAge: 60 * 60 * 24 * 365,
        staleWhileRevalidate: 60 * 60 * 24 * 7,
      }),
    },
  );

  return data;
}
