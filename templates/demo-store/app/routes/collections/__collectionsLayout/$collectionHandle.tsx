import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LoaderArgs,
} from '@shopify/hydrogen-remix';
import {
  useLoaderData,
  useMatches,
  Link,
  useOutletContext,
} from '@remix-run/react';
import type {
  Collection as CollectionType,
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

// export const meta: MetaFunction = ({
//   data,
// }: {
//   data: SerializeFrom<typeof loader> | undefined;
// }) => {
//   return {
//     title: data?.collection.seo?.title ?? 'Collection',
//     description: data?.collection.seo?.description,
//   };
// };

type OutletContext = {
  collection: CollectionType;
  appliedFilters: AppliedFilter[];
  breadcrumbs: any | null | undefined;
};

export default function Collection() {
  const {collection, appliedFilters, breadcrumbs} =
    useOutletContext<OutletContext>();
  return (
    <>
      <Breadcrumbs breadcrumbs={breadcrumbs} />
      <SortFilter
        filters={collection.products.filters as Filter[]}
        appliedFilters={appliedFilters}
      >
        <ProductGrid
          key={collection.id}
          collection={collection as CollectionType}
          url={`/collections/${collection.handle}`}
        />
      </SortFilter>
    </>
  );
}
