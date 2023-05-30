import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import invariant from 'tiny-invariant';
// TODO: Remove the temporary types when they are available via storefront-api-types
import type {
  Scalars,
  Article,
  Collection,
  Page,
  Product,
  PageInfo,
  Filter,
  Image,
} from '@shopify/hydrogen-react/storefront-api-types';

export type SearchQuerySuggestion = {
  __typename?: 'SearchQuerySuggestion';
  styleText: Scalars['String'];
  text: Scalars['String'];
  trackingParameters: Scalars['String'];
};

type TrackingParams = {trackingParameters: string};

type ProductResult = Product & TrackingParams;
type ArticleResult = Article & TrackingParams;
type CollectionResult = Collection & TrackingParams;
type PageResult = Page & TrackingParams;
type QueryResult = SearchQuerySuggestion & TrackingParams;

export type PredictiveSearchResult = {
  __typename?: 'PredictiveSearchResult';
  articles: Array<ArticleResult>;
  collections: Array<CollectionResult>;
  pages: Array<PageResult>;
  products: Array<ProductResult>;
  queries: Array<QueryResult>;
};

export type SearchResultItem =
  | ArticleResult
  | PageResult
  | ProductResult
  | CollectionResult
  | QueryResult;

export type SearchResultItemConnection = {
  __typename?: 'SearchResultItemConnection';
  edges: Array<SearchResultItemEdge>;
  nodes: Array<SearchResultItem>;
  pageInfo: PageInfo;
  productFilters: Array<Filter>;
};

export type SearchResultItemEdge = {
  __typename?: 'SearchResultItemEdge';
  cursor: Scalars['String'];
  node: SearchResultItem;
};

export type ParsedSearchResultItem = {
  id: string;
  image?: Image | null;
  position: number;
  title: string;
  url: string;
};

export type ParsedSearchResults = {
  results: {
    articles?: Array<ParsedSearchResultItem>;
    pages?: Array<ParsedSearchResultItem>;
    products?: Array<ParsedSearchResultItem>;
    collections?: Array<ParsedSearchResultItem>;
    queries?: Array<ParsedSearchResultItem>;
  };
  totalResults: number;
};

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;
  const searchTerm = searchParams.get('q')!;

  const data = await storefront.query<{
    predictiveSearch: PredictiveSearchResult;
  }>(PREDICTIVE_SEARCH_QUERY, {
    variables: {
      pageBy: 4,
      searchTerm,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
    storefrontApiVersion: 'unstable',
  });

  invariant(data, 'No data returned from Shopify API');
  const searchResults = parseSearchResults(data.predictiveSearch);
  return json({searchResults});
}

function parseSearchResults(
  predictiveSearch: PredictiveSearchResult,
): ParsedSearchResults {
  let totalResults = 0;
  if (!predictiveSearch) {
    return {
      results: {
        articles: [],
        collections: [],
        pages: [],
        products: [],
        queries: [],
      },
      totalResults,
    };
  }

  function applyTrackingParams(resource: SearchResultItem, params?: string) {
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

  const results: ParsedSearchResults['results'] = {};

  if (predictiveSearch.articles.length) {
    results.articles = predictiveSearch.articles.map(
      (article: ArticleResult) => {
        return {
          id: article.id,
          position: totalResults++,
          image: article.image,
          title: article.title,
          url: `/journal/${article.handle}${applyTrackingParams(article)}`,
        };
      },
    );
  }

  if (predictiveSearch.collections.length) {
    results.collections = predictiveSearch.collections.map(
      (collection: CollectionResult) => {
        return {
          id: collection.id,
          image: collection.image,
          position: totalResults++,
          title: collection.title,
          url: `/collections/${collection.handle}${applyTrackingParams(
            collection,
          )}`,
        };
      },
    );
  }

  if (predictiveSearch.pages.length) {
    results.pages = predictiveSearch.pages.map((page: PageResult) => {
      return {
        id: page.id,
        image: undefined,
        position: totalResults++,
        title: page.title,
        url: `/pages/${page.handle}${applyTrackingParams(page)}`,
      };
    });
  }

  if (predictiveSearch.products.length) {
    results.products = predictiveSearch.products.map(
      (product: ProductResult) => {
        return {
          id: product.id,
          image: product.variants?.nodes?.[0]?.image,
          position: totalResults++,
          title: product.title,
          url: `/products/${product.handle}${applyTrackingParams(product)}`,
        };
      },
    );
  }

  if (predictiveSearch.queries.length) {
    results.queries = predictiveSearch.queries.map((query: QueryResult) => {
      const queryParams = applyTrackingParams(
        query,
        `q=${encodeURIComponent(query.text)}`,
      );

      return {
        id: query.text,
        image: undefined,
        position: totalResults++,
        title: query.text,
        url: `/search${queryParams}`,
      };
    });
  }

  return {results, totalResults};
}

const PREDICTIVE_SEARCH_QUERY = `#graphql
  query predictiveSearch(
    $searchTerm: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $pageBy,
      query: $searchTerm,
    ) {
      articles {
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
        id
        title
        handle
        trackingParameters
      }
      products {
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
          }
        }
      }
      queries {
        text
        styledText
        trackingParameters
      }
    }
  }
` as const;

// no-op
export default function PredictiveSearchApiRoute() {
  return null;
}
