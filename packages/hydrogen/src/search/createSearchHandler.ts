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
  SearchArticleFragment,
  SearchPageFragment,
} from './types';

import {parseSearchOptions} from './utils';

type CreateSearchHandlerArgs = {
  /* The request object */
  request: Request;
  /* A Storefront client instance */
  storefront: Storefront;
};

export enum SearchType {
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

export type SearchHandlerArgs = CommnonSearchHandlerArgs & {
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

export type PredictiveSearchHandlerArgs = CommnonSearchHandlerArgs & {
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

export type SearchClient = (
  args?: SearchClientArgs,
) => Promise<SearchReturn>;

export type SearchReturn = {
  search: SearchHandlerReturn | null;
  predictiveSearch: PredictiveSearchHandlerReturn | null;
};

/**
 * A factory function that creates a  client for handling search and predictive search requests to the Shopify Storefront API
 * @param args The factory function arguments
 * @returns A search client function

 * @example - Using the search client to fetch search results
 * ```js
 *  const search = createSearchHandler({request, storefront});
 *  const results = await search({term: 'shoes'});
 * ```
 */
export function createSearchHandler({
  request,
  storefront,
}: CreateSearchHandlerArgs): SearchClient {
  return async function handler(args) {
    const defaultArgs = {
      type: SearchType.DEFAULT,
      customQuery: DEFAULT_SEARCH_QUERY,
      pageBy: 8,
      localePathPrefix: '',
    };

    if (!args) {
      args = defaultArgs;
    }

    const {
      type: customType,
      query: customerQuery,
      pageBy = 8,
      localePathPrefix = '',
    } = args;

    let query = customerQuery;

    // Parse the request params
    let options = parseSearchOptions({request, pageBy});

    // TODO: test if type of search is overwritable when passed as an argument
    // Use the custom type if provided
    // if (!options?.type) {
    //   options.type = customType as SearchType;
    // }

    // Fetch the correct search API based on the type
    switch (options.type) {
     case 'default': {
      if (!query) {
        query = DEFAULT_SEARCH_QUERY;
      }

      console.log('standard search', {query, options})
      const response = await searchHandler({query, storefront, ...options});
      return {search: response, predictiveSearch: null};
     }

     case 'predictive': {
      if (!query) {
        query = DEFAULT_PREDICTIVE_SEARCH_QUERY;
      }

      console.log('predictive search', {query, options})
      const response = await predictiveSearchHandler({
        query,
        localePathPrefix,
        storefront,
        ...options,
      });

      return {predictiveSearch: response, search: null};
     }

      default:
      throw new Error('Invalid search type');
    }
  };
}

/** Search handler ----------------------------------------------------------------------*/
export type SearchHandlerReturn = {
  term: string;
  result: {
    // FIX: this should be normalized results not straight up query results
    resources: SearchQueryFragment
    total: number;
  };
  type: SearchType.DEFAULT;
};


type SearchHandler = (args: SearchHandlerArgs) => Promise<SearchHandlerReturn>;

const searchHandler: SearchHandler = async ({
  type,
  term,
  storefront,
  search,
  query: SEARCH_QUERY,
}) => {
  if (!term) {
    return {
      term,
      result: {resources: null, total: 0},
      type
    };
  }

  const {errors, ...resources} = await storefront.query(SEARCH_QUERY, {
    variables: {
      term,
      ...(search?.variables || {}),
    },
  });

  if (errors) {
    throw new Error(errors.map((e: Error) => e.message).join(', '));
  }

  if (!resources) {
    throw new Error('No search data returned from Shopify API');
  }


  const total = Object.entries(resources).reduce((total, [resourceType, value]: any) => {
    // Apply tracking parameters to each search result
    value.nodes = value.nodes.map((resource: SearchPageFragment | SearchArticleFragment | SearchProductFragment) => {
      const trackingParams = applyTrackingParams(resource);
      return {
        ...resource,
        // TODO: we don't know where each possible resource type is located and we should
        // take into account localization
        url: `/${resourceType}/${resource.handle}${trackingParams}`,
      }
    });
    return total + value.nodes.length;
  }, 0) as number;

  const result = { resources, total, };

  return {term, result, type};
};

/** Predictive Search handler ----------------------------------------------------------------------*/
export type PredictiveSearchHandlerReturn = {
  term: string;
  result: {
    resources: NormalizedPredictiveSearchResults;
    total: number;
  };
  type: SearchType.PREDICTIVE;
};

type PredictiveSearchHandler = (
  args: PredictiveSearchHandlerArgs,
) => Promise<PredictiveSearchHandlerReturn>;

const predictiveSearchHandler: PredictiveSearchHandler = async ({
  term,
  type,
  storefront,
  query: PREDICTIVE_QUERY,
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

  const data = await storefront.query(PREDICTIVE_QUERY, {
    variables: {...predictive, term},
  });

  if (!data?.predictiveSearch) {
    throw new Error(`No data returned from predictive search Shopify API: ${data.errors[0].message}`);
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
    | SearchArticleFragment
    | SearchPageFragment
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
