import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LoaderArgs,
} from '@shopify/hydrogen-remix';
import {useLoaderData, useMatches, Link} from '@remix-run/react';
import type {
  Collection as CollectionType,
  CollectionConnection,
  MetafieldReferenceEdge,
  MetafieldReference,
  Filter,
} from '@shopify/hydrogen-react/storefront-api-types';
import {flattenConnection} from '@shopify/hydrogen-react';
import invariant from 'tiny-invariant';
import {PageHeader, Section, Text, SortFilter, Breadcrumbs} from '~/components';
import {ProductGrid} from '~/components/ProductGrid';

import {PRODUCT_CARD_FRAGMENT} from '~/data';

const PAGINATION_SIZE = 48;

type VariantFilterParam = Record<string, string>;
type PriceFiltersQueryParam = Record<'price', {max?: number; min?: number}>;
type VariantOptionFiltersQueryParam = Record<
  'variantOption',
  {name: string; value: string}
>;

export type AppliedFilter = {
  label: string;
  urlParam: string;
};

type FiltersQueryParams = Array<
  VariantFilterParam | PriceFiltersQueryParam | VariantOptionFiltersQueryParam
>;

export type SortParam =
  | 'price-low-high'
  | 'price-high-low'
  | 'best-selling'
  | 'newest'
  | 'featured';

export async function loader({
  params,
  request,
  context: {storefront},
}: LoaderArgs) {
  const {collectionHandle} = params;

  invariant(collectionHandle, 'Missing collectionHandle param');

  const searchParams = new URL(request.url).searchParams;
  const knownFilters = ['cursor', 'productVendor', 'productType', 'available'];
  const priceFilters = ['minPrice', 'maxPrice'];
  const {sortKey, reverse} = getSortValuesFromParam(
    searchParams.get('sort') as SortParam,
  );
  const filters: FiltersQueryParams = [];
  const appliedFilters: AppliedFilter[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (knownFilters.includes(key)) {
      filters.push({[key]: value});
    } else if (!priceFilters.includes(key)) {
      filters.push({variantOption: {name: key, value}});
    }
    appliedFilters.push({label: value, urlParam: key});
  }

  // Builds min and max price filter since we can't stack them separately into
  // the filters array. See price filters limitations:
  // https://shopify.dev/custom-storefronts/products-collections/filter-products#limitations
  if (searchParams.has('minPrice') || searchParams.has('maxPrice')) {
    const price: {min?: number; max?: number} = {};
    if (searchParams.has('minPrice')) {
      price.min = Number(searchParams.get('minPrice')) || 0;
    }
    if (searchParams.has('maxPrice')) {
      price.max = Number(searchParams.get('maxPrice')) || 0;
    }
    filters.push({
      price,
    });
  }

  const {collection} = await storefront.query<{
    collection: CollectionType;
  }>(COLLECTION_QUERY, {
    variables: {
      handle: collectionHandle,
      pageBy: PAGINATION_SIZE,
      filters,
      sortKey,
      reverse,
    },
  });

  if (!collection) {
    throw new Response('Not found', {status: 404});
  }

  return json({
    collection,
    appliedFilters,
    analytics: {
      pageType: 'collection',
      handle: collectionHandle,
    },
  });
}

export const meta: MetaFunction = ({
  data,
}: {
  data: SerializeFrom<typeof loader> | undefined;
}) => {
  return {
    title: data?.collection.seo?.title ?? 'Collection',
    description: data?.collection.seo?.description,
  };
};

export default function Collection() {
  const {collection, appliedFilters} = useLoaderData<typeof loader>();
  const breadcrumbs =
    collection.metafield?.references &&
    flattenConnection<MetafieldReference>(collection.metafield.references)
      .reverse()
      .reduce<any[]>((acc, collection) => [collection, ...acc], [collection]);

  return (
    <>
      <PageHeader heading={collection.title}>
        {collection?.description && (
          <div className="flex items-baseline justify-between w-full">
            <div>
              <Text format width="narrow" as="p" className="inline-block">
                {collection.description}
              </Text>
            </div>
          </div>
        )}

        <Breadcrumbs breadcrumbs={breadcrumbs} />
      </PageHeader>
      <Section>
        <SortFilter
          filters={collection.products.filters as Filter[]}
          appliedFilters={appliedFilters}
        >
          <ProductGrid
            key={collection.id}
            collection={collection as CollectionType}
            url={`/collections/${collection.handle}`}
            data-test="product-grid"
          />
        </SortFilter>
      </Section>
    </>
  );
}

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      metafield(namespace: "breadcrumbs", key: "parents") {
        id
        value
        references(first: 10) {
          edges {
            node {
              ... on Collection {
                id
                handle
                title
              }
            }
          }
        }
        namespace
        key
      }
      products(
        first: $pageBy,
        after: $cursor,
        filters: $filters,
        sortKey: $sortKey,
        reverse: $reverse
      ) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        nodes {
          ...ProductCard
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

function getSortValuesFromParam(sortParam: SortParam | null) {
  switch (sortParam) {
    case 'price-high-low':
      return {
        sortKey: 'PRICE',
        reverse: true,
      };
    case 'price-low-high':
      return {
        sortKey: 'PRICE',
        reverse: false,
      };
    case 'best-selling':
      return {
        sortKey: 'BEST_SELLING',
        reverse: false,
      };
    case 'newest':
      return {
        sortKey: 'CREATED',
        reverse: true,
      };
    case 'featured':
      return {
        sortKey: 'MANUAL',
        reverse: false,
      };
    default:
      return {
        sortKey: 'RELEVANCE',
        reverse: false,
      };
  }
}
