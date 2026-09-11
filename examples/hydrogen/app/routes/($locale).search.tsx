import { gql } from "@shopify/hydrogen";
import { useLoaderData } from "react-router";

import { SearchForm } from "~/components/SearchForm";
import { SearchResults } from "~/components/SearchResults";
import { SearchView } from "~/lib/analytics";
import { getPaginationVariables } from "~/lib/pagination";
import { type RegularSearchReturn, type RegularSearchItems } from "~/lib/search";

import type { Route } from "./+types/($locale).search";

type SearchNode = { __typename?: string };

export const meta: Route.MetaFunction = () => {
  return [{ title: `Hydrogen | Search` }];
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const searchPromise = regularSearch({ request, context });

  searchPromise.catch((error: Error) => {
    console.error(error);
    return { term: "", result: null, error: error.message };
  });

  return await searchPromise;
}

/**
 * Renders the /search route
 */
export default function SearchPage() {
  const { term, result, error } = useLoaderData<typeof loader>();

  return (
    <div className="search">
      <h1>Search</h1>
      <SearchForm>
        {({ inputRef }) => (
          <>
            <input
              defaultValue={term}
              name="q"
              placeholder="Search…"
              ref={inputRef}
              type="search"
            />
            &nbsp;
            <button type="submit">Search</button>
          </>
        )}
      </SearchForm>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!term || !result?.total ? (
        <SearchResults.Empty />
      ) : (
        <SearchResults result={result} term={term}>
          {({ articles, pages, products, term: searchTerm }) => (
            <div>
              <SearchResults.Products products={products} term={searchTerm} />
              <SearchResults.Pages pages={pages} term={searchTerm} />
              <SearchResults.Articles articles={articles} term={searchTerm} />
            </div>
          )}
        </SearchResults>
      )}
      <SearchView searchTerm={term} searchResults={result} />
    </div>
  );
}

/**
 * Regular search query and fragments
 * (adjust as needed)
 */
const SEARCH_PRODUCT_FRAGMENT = gql(`
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
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
`);

const SEARCH_PAGE_FRAGMENT = gql(`
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
`);

const SEARCH_ARTICLE_FRAGMENT = gql(`
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
`);

const PAGE_INFO_FRAGMENT = gql(`
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`);

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = gql(
  `
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: $first,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: $first,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: HIDE,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
`,
  [SEARCH_PRODUCT_FRAGMENT, SEARCH_PAGE_FRAGMENT, SEARCH_ARTICLE_FRAGMENT, PAGE_INFO_FRAGMENT],
);

/**
 * Regular search fetcher
 */
async function regularSearch({
  request,
  context,
}: Pick<Route.LoaderArgs, "request" | "context">): Promise<RegularSearchReturn> {
  const { storefront } = context;
  const url = new URL(request.url);
  const variables = getPaginationVariables(request, { pageBy: 8 });
  const term = String(url.searchParams.get("q") || "");

  // Search articles, pages, and products for the `q` term
  const { errors, ...items } = await storefront.query(SEARCH_QUERY, {
    variables: { ...variables, term },
  });

  if (!items) {
    throw new Error("No search data returned from Shopify API");
  }

  type ArticleSearchNode = Extract<
    (typeof items.articles.nodes)[number],
    { __typename: "Article" }
  >;
  type PageSearchNode = Extract<(typeof items.pages.nodes)[number], { __typename: "Page" }>;
  type ProductSearchNode = Extract<
    (typeof items.products.nodes)[number],
    { __typename: "Product" }
  >;

  const regularItems: RegularSearchItems = {
    articles: {
      nodes: items.articles.nodes.filter(
        (node: SearchNode): node is ArticleSearchNode => node.__typename === "Article",
      ),
    },
    pages: {
      nodes: items.pages.nodes.filter(
        (node: SearchNode): node is PageSearchNode => node.__typename === "Page",
      ),
    },
    products: {
      nodes: items.products.nodes.filter(
        (node: SearchNode): node is ProductSearchNode => node.__typename === "Product",
      ),
      pageInfo: items.products.pageInfo,
    },
  };

  const total =
    regularItems.articles.nodes.length +
    regularItems.pages.nodes.length +
    regularItems.products.nodes.length;

  const error = errors
    ? errors.map(({ message }: { message: string }) => message).join(", ")
    : undefined;

  return { type: "regular", term, error, result: { total, items: regularItems } };
}
