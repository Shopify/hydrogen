import {
  LoaderArgs,
  MetaFunction,
  RESOURCE_TYPES,
} from '@shopify/hydrogen-remix';
import {useLoaderData} from '@remix-run/react';
import type {ProductConnection} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {PageHeader, Section, ProductCard, Grid, Pagination} from '~/components';
import {PRODUCT_CARD_FRAGMENT} from '~/data';
import {getImageLoadingPriority} from '~/lib/const';
const PAGE_BY = 4;

function getPaginationVariables(
  searchParams = new URLSearchParams(),
  pageBy: number,
) {
  const cursor = searchParams.get('cursor') ?? undefined;
  const direction =
    searchParams.get('direction') === 'previous' ? 'previous' : 'next';
  const isNext = direction === 'next';
  const sortKey = searchParams.get('sortKey') ?? 'BEST_SELLING';
  const query = searchParams.get('query') ?? '';

  let reverse = false;
  try {
    const _reverse = searchParams.get('reverse');
    if (_reverse === 'true') {
      reverse = true;
    }
  } catch (_) {
    // noop
  }

  let count = pageBy;
  try {
    const _count = searchParams.get('count');
    if (typeof _count === 'string') {
      count = parseInt(_count);
    }
  } catch (_) {
    // noop
  }

  return {
    [isNext ? 'first' : 'last']: count,
    [isNext ? 'endCursor' : 'startCursor']: cursor ?? null,
    sortKey,
    query,
    reverse,
  };
}

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const searchParams = new URLSearchParams(new URL(request.url).search);
  const variables = getPaginationVariables(searchParams, PAGE_BY);

  const data = await storefront.query<{
    products: ProductConnection;
  }>(ALL_PRODUCTS_QUERY, {
    variables,
  });

  invariant(data, 'No data returned from Shopify API');

  return data.products;
}

export const meta: MetaFunction = () => {
  return {
    title: 'All Products',
    description: 'All Products',
  };
};

export const handle = {
  hydrogen: {
    resourceType: RESOURCE_TYPES.CATALOG,
  },
};

export default function AllProducts() {
  const products = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading="All Products" variant="allCollections" />
      <Section>
        <Pagination connection={products}>
          {({nodes}) => {
            const itemsMarkup = nodes.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                loading={getImageLoadingPriority(i)}
              />
            ));

            return <Grid data-test="product-grid">{itemsMarkup}</Grid>;
          }}
        </Pagination>
      </Section>
    </>
  );
}

const ALL_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $sortKey: ProductSortKeys
    $query: String
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor, sortKey: $sortKey, query: $query, reverse: $reverse) {
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
`;
