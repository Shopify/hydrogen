import {getPaginationVariables} from '../pagination/Pagination';
import {SearchType, SearchHandlerArgs, PredictiveSearchHandlerArgs} from './createSearchHandler';
import {
  PredictiveSearchLimitScope,
  PredictiveSearchType,
} from '@shopify/hydrogen-react/storefront-api-types';

type ParseSearchOptionsArgs = {
  request: Request;
  pageBy: number;
};

type CommonSearchOptions = {
  term: string;
  type: SearchType;
};

type SearchOptions = Omit<
  CommonSearchOptions &
    SearchHandlerArgs & {
      predictive: null;
    },
  'query' | 'storefront'
>;

type PredictiveSearchOptions = Omit<
  CommonSearchOptions &
    PredictiveSearchHandlerArgs & {
      search: null;
    },
  'query' | 'storefront' | 'localePathPrefix'
>;

const DEFAULT_SEARCH_TYPES: PredictiveSearchType[] = [
  'ARTICLE',
  'COLLECTION',
  'PAGE',
  'PRODUCT',
  'QUERY',
];

/**
 * A helper function to parse search and predictive search options from the request object
 */
export function parseSearchOptions({
  request,
  pageBy = 8,
}: ParseSearchOptionsArgs): SearchOptions | PredictiveSearchOptions {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  // Common search options
  const term = String(searchParams.get('q') || '');
  const type = String(searchParams.get('type') || 'default') as SearchType;

  // Default search specific
  if (type === 'default') {
    const variables = getPaginationVariables(request, {pageBy});
    const search = {variables};
    return {type, term, search, predictive: null, pageBy};
  }

  // Predictive search specific
  const limit = Number(searchParams.get('limit') || 10);
  const limitScope = String(
    searchParams.get('limit-scope') || 'EACH',
  ) as PredictiveSearchLimitScope;
  const rawTypes = String(searchParams.get('type') || 'ANY');

  const types =
    rawTypes === 'ANY'
      ? DEFAULT_SEARCH_TYPES
      : rawTypes
          .split(',')
          .map((t) => t.toUpperCase() as PredictiveSearchType)
          .filter((t) => DEFAULT_SEARCH_TYPES.includes(t));

  const predictive = {limit, limitScope, types};
  return {type, term, predictive, search: null};
}
