import type {LoaderArgs, MetaFunction} from '@shopify/hydrogen-remix';
import {useLoaderData} from '@remix-run/react';
import type {
  ProductConnection,
  Collection,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {PageHeader, Section, ProductCard, Grid} from '~/components';
import {PRODUCT_CARD_FRAGMENT} from '~/data';
import {getImageLoadingPriority} from '~/lib/const';
const PAGE_BY = 2;

export async function loader({
  request,
  params,
  context: {storefront},
}: LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;
  // console.log(params, searchParams);

  const cursor = searchParams.get('cursor') ?? undefined;
  const direction =
    searchParams.get('direction') === 'previous' ? 'previous' : 'next';
  const isNext = direction === 'next';

  const prevPage = {
    last: PAGE_BY,
    startCursor: cursor ?? null,
  };

  const nextPage = {
    first: PAGE_BY,
    endCursor: cursor ?? null,
  };

  const variables = isNext ? nextPage : prevPage;

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

export default function AllProducts() {
  const products = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading="All Products" variant="allCollections" />
      <Section>
        <Grid layout="products">
          {products.nodes.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              loading={getImageLoadingPriority(i)}
            />
          ))}
        </Grid>
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
`;
