import invariant from 'tiny-invariant';
import type {
  ProductConnection,
  ArticleConnection,
  PageConnection,
} from '@shopify/hydrogen-react/storefront-api-types';
import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {
  flattenConnection,
  getPaginationVariables__unstable as getPaginationVariables,
} from '@shopify/hydrogen';

import {
  Heading,
  PageHeader,
  Section,
  SearchForm,
  SearchResults,
  NoSearchResults,
} from '~/components';
import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {seoPayload} from '~/lib/seo.server';

import {getFeaturedItems} from './($locale).featured-items';

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
  const {searchTerm, searchResults} = await fetchSearchPageResults({
    request,
    context,
  });

  const seoDescription = searchResults.results?.products
    ? `Showing ${searchResults.results.products.edges.length} search results for "${searchTerm}"`
    : `No search results for "${searchTerm}"`;

  const productNodes = searchResults.results?.products
    ? {nodes: flattenConnection(searchResults.results.products)}
    : {nodes: []};

  const seo = searchResults.results?.products
    ? seoPayload.collection({
        url: request.url,
        collection: {
          id: 'search',
          title: 'Search',
          handle: 'search',
          descriptionHtml: 'Search results',
          description: 'Search results',
          seo: {
            title: 'Search',
            description: seoDescription,
          },
          products: productNodes,
          updatedAt: new Date().toISOString(),
        },
      })
    : null;

  const shouldGetRecommendations = !searchTerm || !searchResults.totalResults;

  return defer({
    seo,
    searchTerm,
    searchResults,
    recommendations: shouldGetRecommendations
      ? await getFeaturedItems(context.storefront, {productsCount: 12})
      : null,
  });
}

export default function SearchPage() {
  const {searchTerm, searchResults, recommendations} =
    useLoaderData<typeof loader>();
  return (
    <>
      <PageHeader>
        <Heading as="h1" size="copy">
          Search
        </Heading>
        <SearchForm searchTerm={searchTerm} />
      </PageHeader>
      {!searchTerm || !searchResults.totalResults ? (
        <NoSearchResults recommendations={recommendations} />
      ) : (
        <Section padding="x" className="mb-12">
          <SearchResults results={searchResults.results} />
        </Section>
      )}
    </>
  );
}

async function fetchSearchPageResults({
  request,
  context,
}: Pick<LoaderArgs, 'context' | 'request'>): Promise<FetchSearchResultsReturn> {
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
    // FIX: remove unstable when switching to 2023-07
    storefrontApiVersion: 'unstable',
    variables: {
      query: searchTerm,
      ...variables,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  const totalResults = Object.values(data).reduce((total, value) => {
    return total + value.edges.length;
  }, 0);

  const searchResults = {
    results: data,
    totalResults,
  };

  return {searchResults, searchTerm};
}

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
      edges {
        node {
          ...on Product {
            ...ProductCard
          }
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
      edges {
        node {
          ...on Page {
            id
            title
            handle
          }
        }
      }
    }
    articles: search(
      query: $query,
      types: [ARTICLE],
      first: 10
    ) {
      edges {
        node {
          ...on Article {
            id
            title
            handle
          }
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
