import {Storefront} from '../storefront';
import {DEFAULT_SEARCH_QUERY, DEFAULT_PREDICTIVE_SEARCH_QUERY} from './queries';
import {getPaginationVariables} from '../pagination/Pagination';
import {
  PredictiveSearchLimitScope,
  PredictiveSearchType,
} from '@shopify/hydrogen-react/storefront-api-types';

import type {
  PredictiveArticleFragment,
  PredictiveCollectionFragment,
  PredictivePageFragment,
  PredictiveProductFragment,
  PredictiveQueryFragment,
  PredictiveSearchQuery,
  SearchQueryFragment,
  SearchProductFragment,
} from './types';

type CreateSearchHandlerArgs = {
  /* The request object */
  request: Request;
  /* A Storefront client instance */
  storefront: Storefront;
};

enum SearchType {
  DEFAULT = 'default',
  PREDICTIVE = 'predictive',
}

type CommnonSearchHandlerArgs = {
  /* The type of search to perform */
  type: SearchType;
  /* A custom search query (optional) */
  query: string;
  /* The request object */
  storefront: CreateSearchHandlerArgs['storefront'];
  /* The search term */
  term: string;
};

type SearchHandlerArgs = CommnonSearchHandlerArgs & {
  /* The type of search to perform */
  type: SearchType.DEFAULT;
  /* Standard search options */
  search: {
    /* The pagination variables */
    variables: ReturnType<typeof getPaginationVariables>;
  };
  /* The number of search result items to fetch per page */
  pageBy: number;
};

type LocalePathPrefix = string;

type PredictiveSearchHandlerArgs = CommnonSearchHandlerArgs & {
  /* The type of search to perform */
  type: SearchType.PREDICTIVE;
  /** The predictive search options */
  predictive: {
    /* The limit of search results to return */
    limit: number;
    /* The limit scope */
    limitScope: PredictiveSearchLimitScope;
    /* The resources types to search */
    types: PredictiveSearchType[];
  };
  /** An optional locale path prefix to prepend to each search result url e.g fr-CA */
  localePathPrefix?: LocalePathPrefix;
};

type SearchClientArgs = {
  /* The type of search to perform */
  type?: SearchType;
  /* A custom search query (optional) */
  query?: string;
  /* The number of search result items to fetch per page */
  pageBy?: number;
  /** An optional locale path prefix to prepend to each search result url */
  localePathPrefix?: LocalePathPrefix;
};

type SearchClient = (
  args: SearchClientArgs,
) => Promise<SearchHandlerReturn | PredictiveSearchHandlerReturn>;

export function createSearchHandler({
  request,
  storefront,
}: CreateSearchHandlerArgs): SearchClient {
  return async function handler({
    type: customType,
    query: customerQuery,
    pageBy = 8,
    localePathPrefix = '',
  }) {
    let query = customerQuery;

    // Parse the request params
    let options = parseSearchOptions({request, pageBy});

    // Use the custom type if provided
    if (customType) {
      options.type = customType;
    }

    // Fetch the correct search API based on the type
    if (options.type === 'default') {
      if (!query) {
        query = DEFAULT_SEARCH_QUERY;
      }

      return await searchHandler({query, storefront, ...options});
    }

    if (options.type === 'predictive') {
      if (!query) {
        query = DEFAULT_PREDICTIVE_SEARCH_QUERY;
      }
      return await predictiveSearchHandler({
        query,
        storefront,
        localePathPrefix,
        ...options,
      });
    }

    throw new Error('Invalid search type');
  };
}

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

/**
 * A helper function to parse search and predictive search options from the request object
 */
function parseSearchOptions({
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

type SearchHandlerReturn = {
  term: string;
  result: {
    resources: null | SearchQueryFragment
    total: number;
  };
  type: SearchType.DEFAULT;
};

type PredictiveSearchHandlerReturn = {
  term: string;
  result: {
    resources: NormalizedPredictiveSearchResults;
    total: number;
  };
  type: SearchType.PREDICTIVE;
};

type SearchHandler = (args: SearchHandlerArgs) => Promise<SearchHandlerReturn>;
const searchHandler: SearchHandler = async ({
  type,
  term,
  storefront,
  search,
  query: QUERY,
}) => {
  if (!term) {
    return {
      term,
      result: {resources: null, total: 0},
      type
    };
  }

  const {errors, ...resources} = await storefront.query<SearchQueryFragment>(QUERY, {
    variables: {
      query: term,
      ...search.variables,
    },
  });

  if (errors) {
    throw new Error(errors.map((e) => e.message).join(', '));
  }

  if (!resources) {
    throw new Error('No search data returned from Shopify API');
  }

  const total = Object.values(resources).reduce((total, value: any) => {
    // TODO: check if I should applyTrackingParams to each result here
    return total + value.nodes.length;
  }, 0) as number;


  const result = { resources, total, };

  return {term, result, type};
};

const DEFAULT_SEARCH_TYPES: PredictiveSearchType[] = [
  'ARTICLE',
  'COLLECTION',
  'PAGE',
  'PRODUCT',
  'QUERY',
];

type PredictiveSearchHandler = (
  args: PredictiveSearchHandlerArgs,
) => Promise<PredictiveSearchHandlerReturn>;
const predictiveSearchHandler: PredictiveSearchHandler = async ({
  term,
  type,
  storefront,
  query: QUERY,
  predictive,
  localePathPrefix = '',
}) => {
  if (!term) {
    return {
      result: {
        resources: NO_PREDICTIVE_SEARCH_RESULTS,
        total: 0,
      },
      term,
      type
    };
  }

  const data = await storefront.query(QUERY, {
    variables: {...predictive, term},
  });

  if (!data?.predictiveSearch) {
    throw new Error('No data returned from predictive search Shopify API');
  }

  // Normalize the predictive search results by adding tracking parameters and locale path prefix
  const result = normalizePredictiveSearchResults(
    data.predictiveSearch,
    localePathPrefix,
  );

  return {result, term, types: predictive.types, type}
};

type PredicticeSearchResultItemImage =
  | PredictiveCollectionFragment['image']
  | PredictiveArticleFragment['image']
  | PredictiveProductFragment['variants']['nodes'][0]['image'];

type PredictiveSearchResultItemPrice =
  | PredictiveProductFragment['variants']['nodes'][0]['price'];

export type NormalizedPredictiveSearchResultItem = {
  __typename: string | undefined;
  handle: string;
  id: string;
  image?: PredicticeSearchResultItemImage;
  price?: PredictiveSearchResultItemPrice;
  styledTitle?: string;
  title: string;
  url: string;
};

export type NormalizedPredictiveSearchResults = Array<
  | {type: 'queries'; items: Array<NormalizedPredictiveSearchResultItem>}
  | {type: 'products'; items: Array<NormalizedPredictiveSearchResultItem>}
  | {type: 'collections'; items: Array<NormalizedPredictiveSearchResultItem>}
  | {type: 'pages'; items: Array<NormalizedPredictiveSearchResultItem>}
  | {type: 'articles'; items: Array<NormalizedPredictiveSearchResultItem>}
>;

const NO_PREDICTIVE_SEARCH_RESULTS: NormalizedPredictiveSearchResults = [
  {type: 'queries', items: []},
  {type: 'products', items: []},
  {type: 'collections', items: []},
  {type: 'pages', items: []},
  {type: 'articles', items: []},
];

export type NormalizedPredictiveSearch = {
  resources: NormalizedPredictiveSearchResults;
  total: number;
};

/**
 * Normalize predictive search results and apply tracking qurery parameters to each result url
 */
function normalizePredictiveSearchResults(
  predictiveSearch: PredictiveSearchQuery['predictiveSearch'],
  locale: string,
): NormalizedPredictiveSearch {
  let total = 0;
  if (!predictiveSearch) {
    return {
      resources: NO_PREDICTIVE_SEARCH_RESULTS,
      total,
    };
  }

  const localePrefix = locale ? `/${locale}` : '';
  const resources: NormalizedPredictiveSearchResults = [];

  if (predictiveSearch.queries.length) {
    resources.push({
      type: 'queries',
      items: predictiveSearch.queries.map((query: PredictiveQueryFragment) => {
        const trackingParams = applyTrackingParams(
          query,
          `q=${encodeURIComponent(query.text)}`,
        );

        total++;
        return {
          __typename: query.__typename,
          handle: '',
          id: query.text,
          image: undefined,
          title: query.text,
          styledTitle: query.styledText,
          url: `${localePrefix}/search${trackingParams}`,
        };
      }),
    });
  }

  if (predictiveSearch.products.length) {
    resources.push({
      type: 'products',
      items: predictiveSearch.products.map(
        (product: PredictiveProductFragment) => {
          total++;
          const trackingParams = applyTrackingParams(product);
          return {
            __typename: product.__typename,
            handle: product.handle,
            id: product.id,
            image: product.variants?.nodes?.[0]?.image,
            title: product.title,
            url: `${localePrefix}/products/${product.handle}${trackingParams}`,
            price: product.variants.nodes[0].price,
          };
        },
      ),
    });
  }

  if (predictiveSearch.collections.length) {
    resources.push({
      type: 'collections',
      items: predictiveSearch.collections.map(
        (collection: PredictiveCollectionFragment) => {
          total++;
          const trackingParams = applyTrackingParams(collection);
          return {
            __typename: collection.__typename,
            handle: collection.handle,
            id: collection.id,
            image: collection.image,
            title: collection.title,
            url: `${localePrefix}/collections/${collection.handle}${trackingParams}`,
          };
        },
      ),
    });
  }

  if (predictiveSearch.pages.length) {
    resources.push({
      type: 'pages',
      items: predictiveSearch.pages.map((page: PredictivePageFragment) => {
        total++;
        const trackingParams = applyTrackingParams(page);
        return {
          __typename: page.__typename,
          handle: page.handle,
          id: page.id,
          image: undefined,
          title: page.title,
          url: `${localePrefix}/pages/${page.handle}${trackingParams}`,
        };
      }),
    });
  }

  if (predictiveSearch.articles.length) {
    resources.push({
      type: 'articles',
      items: predictiveSearch.articles.map(
        (article: PredictiveArticleFragment) => {
          total++;
          const trackingParams = applyTrackingParams(article);
          return {
            __typename: article.__typename,
            handle: article.handle,
            id: article.id,
            image: article.image,
            title: article.title,
            url: `${localePrefix}/blogs/${article.blog.handle}/${article.handle}/${trackingParams}`,
          };
        },
      ),
    });
  }

  return {resources, total};
}

/**
 * Utility that applies shopify tracking params to a given url
 */
function applyTrackingParams(
  resource:
    | PredictiveQueryFragment
    | SearchProductFragment
    | PredictiveProductFragment
    | PredictiveCollectionFragment
    | PredictiveArticleFragment
    | PredictivePageFragment,
  params?: string,
) {
  if (!params) {
    return resource?.trackingParameters
      ? `?${resource.trackingParameters}`
      : '';
  }

  resource?.trackingParameters
    ? `?${params}&${resource.trackingParameters}`
    : `?${params}`;
}
