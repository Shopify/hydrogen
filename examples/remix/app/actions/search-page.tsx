import { getSearchResultUrl, gql, type StorefrontApi } from "@shopify/hydrogen";
import { css, type Handle } from "remix/component";

import { SearchView } from "../assets/public/analytics-events.tsx";
import { localizePath } from "../lib/public/i18n.ts";
import { formatMoney } from "../lib/public/money.ts";
import { routes } from "../routes.ts";
import { Document } from "../ui/document.tsx";
import { PaginatedResourceSection } from "../ui/pagination.tsx";
import { Image } from "../ui/public/image.tsx";

const resultStyle = css({ marginBottom: "1.5rem" });

const resultItemStyle = css({
  marginBottom: "0.5rem",
  "& a": { alignItems: "center", display: "flex", gap: "1rem" },
});

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
    blog {
      handle
    }
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
    articles: search(query: $term, types: [ARTICLE], first: $first) {
      nodes {
        ... on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(query: $term, types: [PAGE], first: $first) {
      nodes {
        ... on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor
      before: $startCursor
      first: $first
      last: $last
      query: $term
      sortKey: RELEVANCE
      types: [PRODUCT]
      unavailableProducts: HIDE
    ) {
      nodes {
        ... on Product {
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

type SearchResult = StorefrontApi.ResultOf<typeof SEARCH_QUERY>;
type SearchNode<Key extends keyof SearchResult, Type extends string> = Extract<
  SearchResult[Key]["nodes"][number],
  { __typename: Type }
>;

export type SearchItems = {
  articles: SearchNode<"articles", "Article">[];
  pages: SearchNode<"pages", "Page">[];
  products: SearchNode<"products", "Product">[];
  pageInfo: SearchResult["products"]["pageInfo"];
};

/** Narrows the union search connections to the node types each one asked for. */
export function toSearchItems(result: SearchResult): SearchItems {
  return {
    articles: result.articles.nodes.filter(
      (node): node is SearchNode<"articles", "Article"> => node.__typename === "Article",
    ),
    pages: result.pages.nodes.filter(
      (node): node is SearchNode<"pages", "Page"> => node.__typename === "Page",
    ),
    products: result.products.nodes.filter(
      (node): node is SearchNode<"products", "Product"> => node.__typename === "Product",
    ),
    pageInfo: result.products.pageInfo,
  };
}

export function SearchPage(
  handle: Handle<{
    term: string;
    items: SearchItems | null;
    error?: string;
    pathPrefix: string;
    url: URL;
  }>,
) {
  return () => {
    const { error, items, pathPrefix, term, url } = handle.props;
    const total = items ? items.articles.length + items.pages.length + items.products.length : 0;
    const searchPath = localizePath(routes.search.href(), pathPrefix);

    return (
      <Document title="Hydrogen | Search">
        <div class="search">
          <h1>Search</h1>
          <form method="get" action={searchPath} role="search">
            <input
              defaultValue={term}
              name="q"
              placeholder="Search…"
              aria-label="Search"
              type="search"
            />
            &nbsp;
            <button type="submit">Search</button>
          </form>
          {error ? <p style={{ color: "red" }}>{error}</p> : null}
          {!term || !items || !total ? (
            <p>No results, try a different search.</p>
          ) : (
            <div>
              {items.products.length ? (
                <div mix={resultStyle}>
                  <h2>Products</h2>
                  <PaginatedResourceSection pageInfo={items.pageInfo} url={url}>
                    {items.products.map((product) => {
                      const variant = product.selectedOrFirstAvailableVariant;
                      const href = getSearchResultUrl({
                        baseUrl: localizePath(
                          routes.products.show.href({ handle: product.handle }),
                          pathPrefix,
                        ),
                        term,
                        trackingParameters: product.trackingParameters,
                      });
                      return (
                        <div mix={resultItemStyle} key={product.id}>
                          <a href={href} data-rmx-prefetch="intent">
                            {variant?.image ? (
                              <Image
                                data={variant.image}
                                alt={product.title}
                                width={50}
                                height={50}
                              />
                            ) : null}
                            <div>
                              <p>{product.title}</p>
                              {variant ? <small>{formatMoney(variant.price)}</small> : null}
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </PaginatedResourceSection>
                  <br />
                </div>
              ) : null}
              {items.pages.length ? (
                <div mix={resultStyle}>
                  <h2>Pages</h2>
                  <div>
                    {items.pages.map((page) => (
                      <div mix={resultItemStyle} key={page.id}>
                        <a
                          data-rmx-prefetch="intent"
                          href={getSearchResultUrl({
                            baseUrl: localizePath(
                              routes.pages.show.href({ handle: page.handle }),
                              pathPrefix,
                            ),
                            term,
                            trackingParameters: page.trackingParameters,
                          })}
                        >
                          {page.title}
                        </a>
                      </div>
                    ))}
                  </div>
                  <br />
                </div>
              ) : null}
              {items.articles.length ? (
                <div mix={resultStyle}>
                  <h2>Articles</h2>
                  <div>
                    {items.articles.map((article) => (
                      <div mix={resultItemStyle} key={article.id}>
                        <a
                          data-rmx-prefetch="intent"
                          href={getSearchResultUrl({
                            baseUrl: localizePath(
                              routes.blogs.article.href({
                                blogHandle: article.blog.handle,
                                articleHandle: article.handle,
                              }),
                              pathPrefix,
                            ),
                            term,
                            trackingParameters: article.trackingParameters,
                          })}
                        >
                          {article.title}
                        </a>
                      </div>
                    ))}
                  </div>
                  <br />
                </div>
              ) : null}
            </div>
          )}
          <SearchView searchTerm={term} searchResults={total ? { total } : undefined} />
        </div>
      </Document>
    );
  };
}
