import type {
  ProductCollectionSortKeys,
  SearchSortKeys,
} from '@shopify/hydrogen/storefront-api-types';

const SORT_PARAM = 'sort_by';

export interface CollectionSortOption {
  label: string;
  sortKey: ProductCollectionSortKeys;
  reverse: boolean;
}

export interface SearchSortOption {
  label: string;
  sortKey: SearchSortKeys;
  reverse: boolean;
}

export type SortOption = CollectionSortOption | SearchSortOption;

/**
 * Standard sort options for collection pages. Maps URL parameter values to
 * Storefront API `ProductCollectionSortKeys`.
 */
export const COLLECTION_SORT_OPTIONS: Record<string, CollectionSortOption> = {
  FEATURED: {
    label: 'Featured',
    sortKey: 'COLLECTION_DEFAULT',
    reverse: false,
  },
  PRICE_LOW_TO_HIGH: {
    label: 'Price: Low to High',
    sortKey: 'PRICE',
    reverse: false,
  },
  PRICE_HIGH_TO_LOW: {
    label: 'Price: High to Low',
    sortKey: 'PRICE',
    reverse: true,
  },
  BEST_SELLING: {
    label: 'Best Selling',
    sortKey: 'BEST_SELLING',
    reverse: false,
  },
  TITLE_A_TO_Z: {
    label: 'Alphabetically: A-Z',
    sortKey: 'TITLE',
    reverse: false,
  },
  TITLE_Z_TO_A: {
    label: 'Alphabetically: Z-A',
    sortKey: 'TITLE',
    reverse: true,
  },
  NEWEST: {
    label: 'Date: New to Old',
    sortKey: 'CREATED',
    reverse: true,
  },
  OLDEST: {
    label: 'Date: Old to New',
    sortKey: 'CREATED',
    reverse: false,
  },
};

/**
 * Standard sort options for search results. Maps URL parameter values to
 * Storefront API `SearchSortKeys`.
 */
export const SEARCH_SORT_OPTIONS: Record<string, SearchSortOption> = {
  RELEVANCE: {
    label: 'Relevance',
    sortKey: 'RELEVANCE',
    reverse: false,
  },
  PRICE_LOW_TO_HIGH: {
    label: 'Price: Low to High',
    sortKey: 'PRICE',
    reverse: false,
  },
  PRICE_HIGH_TO_LOW: {
    label: 'Price: High to Low',
    sortKey: 'PRICE',
    reverse: true,
  },
};

/**
 * Parse the `sort_by` URL search param into the corresponding sort option.
 * Returns `undefined` when no param is present or the value is unrecognised,
 * which signals the caller to use the default sort.
 */
export function parseSortParam(
  searchParams: URLSearchParams,
  isSearch?: false,
): CollectionSortOption | undefined;
export function parseSortParam(
  searchParams: URLSearchParams,
  isSearch: true,
): SearchSortOption | undefined;
export function parseSortParam(
  searchParams: URLSearchParams,
  isSearch = false,
): SortOption | undefined {
  const sortParam = searchParams.get(SORT_PARAM);
  if (!sortParam) return undefined;

  const options = isSearch ? SEARCH_SORT_OPTIONS : COLLECTION_SORT_OPTIONS;
  return options[sortParam] || undefined;
}

/**
 * Apply a sort key to URL search params. Default sort values (`FEATURED` for
 * collections, `RELEVANCE` for search) are represented by the absence of the
 * parameter rather than an explicit value.
 *
 * Clears pagination cursors so stale cursors from a previous sort order don't
 * cause API errors.
 */
export function applySortParam(
  sortKey: string,
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);

  if (sortKey === 'FEATURED' || sortKey === 'RELEVANCE') {
    params.delete(SORT_PARAM);
  } else {
    params.set(SORT_PARAM, sortKey);
  }

  params.delete('cursor');
  params.delete('direction');

  return params;
}
