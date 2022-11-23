import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LoaderArgs,
} from '@shopify/hydrogen-remix';
import {useLoaderData} from '@remix-run/react';
import type {
  Collection as CollectionType,
  Filter,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {
  PageHeader,
  Section,
  Text,
  SortFilter,
  Button,
  IconFilters,
} from '~/components';
import {ProductGrid} from '~/components/ProductGrid';

import {PRODUCT_CARD_FRAGMENT} from '~/data';
import {useState} from 'react';
import SortMenu from '~/components/SortFilter';

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
  | 'newest';

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

  return json({collection, appliedFilters});
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
  const [isOpen, setIsOpen] = useState(false);

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
      </PageHeader>
      <Section>
        <div>
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={
                'relative flex items-center justify-center w-8 h-8 focus:ring-primary/5'
              }
            >
              <IconFilters stroke="white" />
            </button>
            <SortMenu />
          </div>
        </div>
        <div className="flex">
          <div
            className={`transition-all duration-200 ${
              isOpen
                ? 'opacity-100 min-w-[240px] w-[240px] pr-4 md:pr-8'
                : 'opacity-0 min-w-[0px] w-[0px] pr-0'
            }`}
          >
            <SortFilter
              open={isOpen}
              filters={collection.products.filters as Filter[]}
              appliedFilters={appliedFilters}
              onClose={() => setIsOpen(false)}
            />
          </div>
          <div>
            <ProductGrid
              key={collection.id}
              collection={collection as CollectionType}
              url={`/collections/${collection.handle}`}
            />
          </div>
        </div>
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
    default:
      return {
        sortKey: 'RELEVANCE',
        reverse: false,
      };
  }
}
