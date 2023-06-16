import invariant from 'tiny-invariant';
import type {Image as ImageType} from '@shopify/hydrogen-react/storefront-api-types';
import {json, type LoaderArgs} from '@shopify/remix-oxygen';

import type {
  PredictiveSearchResult,
  SearchResultItem,
  SearchQuerySuggestion,
  Article,
  Collection,
  Page,
  Product,
} from 'temp.search-types';

export type NormalizedPredictiveSearchResultItem = {
  __typename: string | undefined;
  handle: string;
  id: string;
  image?: ImageType | null;
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

export type NormalizedPredictiveSearch = {
  results: NormalizedPredictiveSearchResults;
  totalResults: number;
};

type PredictiveSearchTypes =
  | 'PRODUCT'
  | 'COLLECTION'
  | 'PAGE'
  | 'ARTICLE'
  | 'QUERY';

const DEFAULT_SEARCH_TYPES: PredictiveSearchTypes[] = [
  'PRODUCT',
  'COLLECTION',
  'PAGE',
  'ARTICLE',
  'QUERY',
];

/**
 * Fetches the search results from the predictive search API
 * requested by the SearchForm component
 */
export async function action({request, params, context}: LoaderArgs) {
  if (request.method !== 'POST') {
    throw new Error('Invalid request method');
  }

  const search = await fetchPredictiveSearchResults({
    params,
    request,
    context,
  });

  return json(search);
}

async function fetchPredictiveSearchResults({
  params,
  request,
  context,
}: Pick<LoaderArgs, 'params' | 'context' | 'request'>) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  let body;
  try {
    body = await request.formData();
  } catch (error) {}
  const searchTerm = String(body?.get('q') || searchParams.get('q') || '');
  const limit = Number(body?.get('limit') || searchParams.get('limit') || 10);
  const rawTypes = String(
    body?.get('type') || searchParams.get('type') || 'ANY',
  );
  const searchTypes =
    rawTypes === 'ANY'
      ? DEFAULT_SEARCH_TYPES
      : rawTypes
          .split(',')
          .map((t) => t.toUpperCase() as PredictiveSearchTypes)
          .filter((t) => DEFAULT_SEARCH_TYPES.includes(t));

  if (!searchTerm) {
    return {
      searchResults: {results: null, totalResults: 0},
      searchTerm,
      searchTypes,
    };
  }

  const data = await context.storefront.query<{
    predictiveSearch: PredictiveSearchResult;
  }>(PREDICTIVE_SEARCH_QUERY, {
    // FIX: remove unstable when switching to 2023-07
    storefrontApiVersion: 'unstable',
    variables: {
      limit,
      limitScope: 'EACH',
      searchTerm,
      types: searchTypes,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  const searchResults = normalizePredictiveSearchResults(
    data.predictiveSearch,
    params.locale,
  );

  return {searchResults, searchTerm, searchTypes};
}

export const noPredictiveSearchResults: NormalizedPredictiveSearchResults = [
  {type: 'queries', items: []},
  {type: 'products', items: []},
  {type: 'collections', items: []},
  {type: 'pages', items: []},
  {type: 'articles', items: []},
];

/**
 * Normalize results and apply tracking qurery parameters to each result url
 * @param predictiveSearch
 * @param locale
 */
function normalizePredictiveSearchResults(
  predictiveSearch: PredictiveSearchResult,
  locale: LoaderArgs['params']['locale'],
): NormalizedPredictiveSearch {
  let totalResults = 0;
  if (!predictiveSearch) {
    return {
      results: noPredictiveSearchResults,
      totalResults,
    };
  }

  function applyTrackingParams(
    resource: SearchResultItem | SearchQuerySuggestion,
    params?: string,
  ) {
    if (params) {
      return resource.trackingParameters
        ? `?${params}&${resource.trackingParameters}`
        : `?${params}`;
    } else {
      return resource.trackingParameters
        ? `?${resource.trackingParameters}`
        : '';
    }
  }

  const localePrefix = locale ? `/${locale}` : '';
  const results: NormalizedPredictiveSearchResults = [];

  if (predictiveSearch.queries.length) {
    results.push({
      type: 'queries',
      items: predictiveSearch.queries.map((query: SearchQuerySuggestion) => {
        const trackingParams = applyTrackingParams(
          query,
          `q=${encodeURIComponent(query.text)}`,
        );

        totalResults++;
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
    results.push({
      type: 'products',
      items: predictiveSearch.products.map((product: Product) => {
        totalResults++;
        const trackingParams = applyTrackingParams(product);
        return {
          __typename: product.__typename,
          handle: product.handle,
          id: product.id,
          image: product.variants?.nodes?.[0]?.image,
          title: product.title,
          url: `${localePrefix}/products/${product.handle}${trackingParams}`,
        };
      }),
    });
  }

  if (predictiveSearch.collections.length) {
    results.push({
      type: 'collections',
      items: predictiveSearch.collections.map((collection: Collection) => {
        totalResults++;
        const trackingParams = applyTrackingParams(collection);
        return {
          __typename: collection.__typename,
          handle: collection.handle,
          id: collection.id,
          image: collection.image,
          title: collection.title,
          url: `${localePrefix}/collections/${collection.handle}${trackingParams}`,
        };
      }),
    });
  }

  if (predictiveSearch.pages.length) {
    results.push({
      type: 'pages',
      items: predictiveSearch.pages.map((page: Page) => {
        totalResults++;
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
    results.push({
      type: 'articles',
      items: predictiveSearch.articles.map((article: Article) => {
        totalResults++;
        const trackingParams = applyTrackingParams(article);
        return {
          __typename: article.__typename,
          handle: article.handle,
          id: article.id,
          image: article.image,
          title: article.title,
          // FIX: should have a utility that allows to generate localized urls with different formats
          url: `${localePrefix}/journal/${article.handle}${trackingParams}`,
        };
      }),
    });
  }

  return {results, totalResults};
}

// FIX: add #graphql tag to query when we switch to the new api version
const PREDICTIVE_SEARCH_QUERY = `
  query predictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $searchTerm: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $searchTerm,
      types: $types,
    ) {
      articles {
        __typename
        id
        title
        handle
        image {
          url
          altText
          width
          height
        }
        trackingParameters
      }
      collections {
        __typename
        id
        title
        handle
        image {
          url
          altText
          width
          height
        }
        trackingParameters
      }
      pages {
        __typename
        id
        title
        handle
        trackingParameters
      }
      products {
        __typename
        id
        title
        handle
        trackingParameters
        variants(first: 1) {
          nodes {
            id
            image {
              url
              altText
              width
              height
            }
            price {
              amount
              currencyCode
            }
          }
        }
      }
      queries {
        __typename
        text
        styledText
        trackingParameters
      }
    }
  }
` as const;
