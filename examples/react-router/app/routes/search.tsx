import { Cache, gql } from "@shopify/hydrogen";
import { getSortByValue, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { MetaFunction } from "react-router";

import { Breadcrumbs } from "~/components/Breadcrumbs";
import { ProductCard } from "~/components/ProductCard";
import { AnalyticsEvent, getAnalytics } from "~/lib/analytics";
import { content } from "~/lib/content";
import { FilterGroup } from "~/lib/filters";
import { PRODUCT_CARD_FRAGMENT } from "~/lib/fragments";
import { shopNameFromMatches, shopTitle } from "~/lib/meta";
import { canonicalUrl } from "~/lib/site";
import { storefrontClientContext } from "~/lib/storefront-context";

import type { Route } from "./+types/search";

const SEARCH_SORT_OPTIONS = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];

const SEARCH_QUERY = gql(
  `
  query Search($query: String!, $first: Int!, $after: String, $sortKey: SearchSortKeys, $reverse: Boolean, $productFilters: [ProductFilter!], $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    search(query: $query, first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, productFilters: $productFilters) {
      totalCount
      productFilters {
        id
        label
        type
        presentation
        values {
          id
          label
          count
          input
          swatch {
            color
            image {
              previewImage {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        __typename
        ... on Product {
          ...ProductCard
        }
      }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

type SearchQuery = StorefrontApi.ResultOf<typeof SEARCH_QUERY>;
type SearchAvailableFilter = NonNullable<SearchQuery["search"]>["productFilters"][number];

export const meta: MetaFunction = ({ matches }) => {
  const title = shopTitle("Search", shopNameFromMatches(matches));
  return [
    { title },
    { name: "description", content: "Search products" },
    { tagName: "link", rel: "canonical", href: canonicalUrl("/search") },
    { property: "og:title", content: title },
    { property: "og:type", content: "website" },
  ];
};

export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const url = new URL(request.url);
  const term = url.searchParams.get("q")?.trim() ?? "";
  const browse = parseCollectionParams(url.searchParams);

  // Empty search term: return an empty result set without querying (notes/search.md).
  if (!term) {
    return {
      term: "",
      products: [],
      availableFilters: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      dataSearch: url.searchParams.toString(),
      totalCount: 0,
    };
  }

  // parseCollectionParams returns a ProductCollectionSortKeys; search only supports
  // PRICE/RELEVANCE. Map unsupported sorts back to RELEVANCE (collection-browser skill).
  const searchSortKey = browse.sortKey === "PRICE" ? "PRICE" : "RELEVANCE";

  const { data, errors } = await storefrontClient.graphql(SEARCH_QUERY, {
    variables: {
      query: term,
      first: 24,
      after: url.searchParams.get("after") ?? undefined,
      sortKey: searchSortKey,
      reverse: browse.reverse || undefined,
      productFilters:
        browse.filters.length > 0
          ? // F13: skill-sanctioned generated-type cast at the query variable boundary
            // (hydrogen-collection-browser/references/react.md). Kept verbatim.
            (browse.filters as StorefrontApiProductFilter[])
          : undefined,
    },
    cache: Cache.short(),
  });

  if (errors) {
    console.error("[hydrogen] Search query failed", errors);
  }

  const search = data?.search;
  const products = search?.nodes ?? [];
  // Filter to Product nodes only (search is heterogeneous).
  const productNodes = products.filter(
    (node): node is (typeof products)[number] & { __typename: "Product" } =>
      node?.__typename === "Product",
  );

  return {
    term,
    products: productNodes,
    availableFilters: search?.productFilters ?? [],
    pageInfo: search?.pageInfo ?? { hasNextPage: false },
    dataSearch: url.searchParams.toString(),
    totalCount: search?.totalCount ?? productNodes.length,
  };
}

export default function SearchRoute({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const term = loaderData.term;

  return (
    <CollectionProvider
      data={{ handle: `search:${term}`, dataSearch: loaderData.dataSearch }}
      urlSearch={searchParams.toString()}
      onChange={(search) => navigate({ search }, { replace: searchParams.size > 0 })}
    >
      <SearchPage loaderData={loaderData} />
    </CollectionProvider>
  );
}

function SearchViewedTracker({ term, totalCount }: { term: string; totalCount: number }) {
  useEffect(() => {
    if (!term) return;
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.SEARCH_VIEWED, {
      searchTerm: term,
      searchResults: { totalCount },
    });
  }, [term]);
  return null;
}

type SearchPageProps = {
  loaderData: Route.ComponentProps["loaderData"];
};

function SearchPage({ loaderData }: SearchPageProps) {
  const { term, products, availableFilters, totalCount } = loaderData;
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const isLoading = state.status === "loading";
  const currencyCode = products[0]?.priceRange.minVariantPrice.currencyCode ?? "USD";
  const [searchParams] = useSearchParams();

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: content.search.title }]} />
      </div>

      <h1 className="type-display mb-6">{content.search.title}</h1>

      <SearchViewedTracker term={term} totalCount={totalCount} />

      {/* Search header form — real GET /search so it works without JS (F4). */}
      <form action="/search" method="get" role="search" className="mb-8 flex items-center gap-2">
        <label htmlFor="search-q" className="sr-only">
          {content.search.label}
        </label>
        <input
          id="search-q"
          type="search"
          name="q"
          defaultValue={term}
          key={term}
          placeholder={content.search.placeholder}
          className="number-reset rounded-button border-border h-11 max-w-md border px-3 text-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          className="rounded-button button-primary inline-flex h-11 items-center justify-center px-4 text-sm font-medium"
        >
          {content.search.submit}
        </button>
        {term ? (
          <Link
            to="/search"
            className="text-on-surface-secondary hover:text-on-surface text-sm no-underline"
          >
            {content.search.clear}
          </Link>
        ) : null}
      </form>

      {!term ? null : products.length === 0 ? (
        <div className="py-12 text-center">
          <p className="type-body text-on-surface">
            {content.search.noResults.replace("{{ terms }}", `“${term}”`)}
          </p>
          <p className="text-on-surface-secondary mt-2 text-sm">
            {content.search.noResultsSuggestion}
          </p>
        </div>
      ) : (
        <form
          {...formProps()}
          method="get"
          action="/search"
          className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8"
          key={`search-${term}`}
        >
          <input type="hidden" name="q" value={term} />

          {/* A SINGLE filter subtree (one set of inputs) so filter params are
              never duplicated. Desktop: `<summary>` hidden, `<details open>`
              shows groups as a static sidebar. Mobile: collapsible disclosure,
              reachable without JS (F4). */}
          <details
            open
            className="lg:flex lg:flex-col lg:gap-6"
            aria-labelledby="search-filters-heading"
          >
            <summary className="marker-hidden rounded-button button-outline focus-visible:outline-accent min-h-touch-target mb-4 inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden">
              {content.collection.filters}
            </summary>
            <div className="flex flex-col gap-6 lg:mb-0">
              <h2
                id="search-filters-heading"
                className="type-heading-sm text-on-surface font-medium"
              >
                {content.collection.filters}
              </h2>
              {(availableFilters as SearchAvailableFilter[]).map((filter) => (
                <FilterGroup
                  key={filter.id}
                  filter={filter}
                  activeFilters={state.filters}
                  disabled={isLoading}
                  currencyCode={currencyCode}
                />
              ))}
            </div>
          </details>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="type-body-sm text-on-surface-secondary" aria-live="polite">
                {content.search.resultsFor
                  .replace("{{ count }}", String(totalCount))
                  .replace("{{ terms }}", `“${term}”`)}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-on-surface-secondary">{content.collection.sortBy}</span>
                <select
                  name="sort_by"
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  aria-busy={isLoading}
                  disabled={isLoading}
                  className="w-auto"
                >
                  {SEARCH_SORT_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <ul
              role="list"
              className="grid grid-cols-2 gap-x-1 gap-y-10 contain-paint lg:grid-cols-3"
            >
              {products.map((product, index) => (
                <li key={product.id} className={isLoading ? "opacity-60" : ""}>
                  <ProductCard
                    product={product}
                    loading={index < 3 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                </li>
              ))}
            </ul>

            {loaderData.pageInfo.hasNextPage ? (
              <div className="mt-8 text-center">
                <Link
                  to={{
                    pathname: "/search",
                    search: (() => {
                      // Preserve all current search params (sort, filters, q)
                      // and only update the `after` cursor (R19).
                      const next = new URLSearchParams(searchParams);
                      next.set("after", loaderData.pageInfo.endCursor ?? "");
                      return next.toString();
                    })(),
                  }}
                  className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {content.search.loadMore}
                </Link>
              </div>
            ) : null}

            <noscript>
              <button type="submit" className="rounded-button button-primary h-11 px-4">
                {content.collection.showResults}
              </button>
            </noscript>
          </div>
        </form>
      )}
    </div>
  );
}
