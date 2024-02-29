import {type LoaderFunctionArgs, json} from '@remix-run/server-runtime';
import {CacheLong} from '@shopify/hydrogen';

import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';

export async function loader({context}: LoaderFunctionArgs) {
  const time = new Date();

  const data = await context.storefront.query(ALL_PRODUCTS_QUERY, {
    variables: {
      first: 200,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
    cache: CacheLong(),
  });

  const storefrontQueryTime = new Date().getTime() - time.getTime();

  console.log('Storefront query sub-request time: ', storefrontQueryTime);

  const time2 = new Date();

  await context.withCache('my-key', CacheLong(), async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('hello');
      }, 500);
    });
  });

  const withCacheTime = new Date().getTime() - time2.getTime();

  console.log('withCache sub-request time: ', withCacheTime);

  return json({storefrontQueryTime, withCacheTime});
}

const ALL_PRODUCTS_QUERY = `#graphql
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
