import type {LoaderArgs, MetaFunction} from '@hydrogen/remix';
import {useLoaderData} from '@remix-run/react';
import type {
  Collection,
  ProductConnection,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {PageHeader, Section, ProductGrid} from '~/components';
import {PRODUCT_CARD_FRAGMENT} from '~/data';
import {getLocalizationFromLang} from '~/lib/utils';

export async function loader({
  request,
  params,
  context: {storefront},
}: LoaderArgs) {
  const cursor = new URL(request.url).searchParams.get('cursor') ?? undefined;

  const {language, country} = getLocalizationFromLang(params.lang);
  const data = await storefront.query<{
    products: ProductConnection;
  }>({
    query: ALL_PRODUCTS_QUERY,
    variables: {
      pageBy: 48,
      cursor,
      language,
      country,
    },
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
        <ProductGrid
          key="products"
          url="/products"
          collection={{products} as Collection}
        />
      </Section>
    </>
  );
}

const ALL_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $pageBy, after: $cursor) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;
