import type {
  ProductConnection,
  ArticleConnection,
  PageConnection,
} from '@shopify/hydrogen-react/storefront-api-types';
import type {V2_MetaFunction} from '@shopify/remix-oxygen';
import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {getPaginationVariables__unstable as getPaginationVariables} from '@shopify/hydrogen';

import {SearchForm, SearchResults, NoSearchResults} from '~/components/Search';

export const meta: V2_MetaFunction = () => {
  return [{title: `Hydrogen | Search`}];
};

export type FetchSearchResultsReturn = {
  searchResults: {
    results: {
      articles: ArticleConnection;
      pages: PageConnection;
      products: ProductConnection;
    } | null;
    totalResults: number;
  };
  searchTerm: string;
};

export async function loader({request, context}: LoaderArgs) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const variables = getPaginationVariables(request, {pageBy: 8});
  const searchTerm = String(searchParams.get('q') || '');

  if (!searchTerm) {
    return {
      searchResults: {results: null, totalResults: 0},
      searchTerm,
    };
  }

  const data = await context.storefront.query<{
    products: ProductConnection;
    pages: PageConnection;
    articles: ArticleConnection;
  }>(SEARCH_QUERY, {
    // TODO: remove unstable when switching to 2023-07
    storefrontApiVersion: 'unstable',
    variables: {
      query: searchTerm,
      ...variables,
    },
  });

  if (!data) {
    throw new Error('No search data returned from Shopify API');
  }

  const totalResults = Object.values(data).reduce((total, value) => {
    return total + value.nodes.length;
  }, 0);

  const searchResults = {
    results: data,
    totalResults,
  };

  return defer({searchTerm, searchResults});
}

export default function SearchPage() {
  const {searchTerm, searchResults} = useLoaderData<typeof loader>();
  return (
    <div className="search">
      <h1>Search</h1>
      <SearchForm searchTerm={searchTerm} />
      {!searchTerm || !searchResults.totalResults ? (
        <NoSearchResults />
      ) : (
        <SearchResults results={searchResults.results} />
      )}
    </div>
  );
}

// TODO: add trackingParameters when migrated to 2023-07
const PRODUCT_SEARCH_ITEM_FRAGMENT = `#graphql
  fragment ProductSearchItem on Product {
    id
    title
    publishedAt
    handle
    vendor
    variants(first: 1) {
      nodes {
        id
        image {
          url: transformedSrc(maxWidth: 400, crop: CENTER)
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
      }
    }
  }
` as const;

// FIX: add #graphql tag when 2023-07 API is released
const SEARCH_QUERY = `
  query search(
    $query: String!,
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products: search(
      query: $query,
      unavailableProducts: HIDE,
      types: [PRODUCT],
      first: $first,
      sortKey: RELEVANCE,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...on Product {
          ...ProductSearchItem
        }
      }
      pageInfo {
        hasNextPage
        startCursor
        endCursor
        hasPreviousPage
      }
    }
    pages: search(
      query: $query,
      types: [PAGE],
      first: 10
    ) {
      nodes {
        ...on Page {
          handle
          id
          title
          trackingParameters
        }
      }
    }
    articles: search(
      query: $query,
      types: [ARTICLE],
      first: 10
    ) {
      nodes {
        ...on Article {
          handle
          id
          title
          trackingParameters
        }
      }
    }
  }
  ${PRODUCT_SEARCH_ITEM_FRAGMENT}
` as const;
