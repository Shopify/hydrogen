import { parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";
import type { AvailableFilter } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { CollectionBrowser } from "@/components/CollectionBrowser";
import { SEARCH_QUERY } from "@/lib/queries";
import { canonicalUrl } from "@/lib/site";
import { staticStorefrontClient } from "@/lib/storefront-static";
import { toURLSearchParams } from "@/lib/url-params";

export const metadata: Metadata = {
  title: "Search",
  description: "Search products",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search — CORE",
    type: "website",
    url: canonicalUrl("/search"),
  },
};

type SearchResult = {
  term: string;
  products: SearchProductNode[];
  availableFilters: AvailableFilter[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  totalCount: number;
};

/** A `search.nodes` element narrowed to the `Product` branch (includes the
 *  `__typename` discriminator + the `ProductCard` fragment fields). */
type SearchNode = NonNullable<
  StorefrontApi.ResultOf<typeof SEARCH_QUERY>["search"]
>["nodes"][number];
type SearchProductNode = Extract<SearchNode, { __typename: "Product" }>;

async function fetchSearch(term: string, searchString: string): Promise<SearchResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  if (!term) {
    return {
      term: "",
      products: [],
      availableFilters: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 0,
    };
  }

  // Reconstruct URLSearchParams from the serialized search string. `use cache`
  // serializes arguments, so a URLSearchParams passed in loses `.get` — pass a
  // plain string across the cache boundary and parse inside.
  const searchParams = new URLSearchParams(searchString);
  const browse = parseCollectionParams(searchParams);
  // parseCollectionParams returns a ProductCollectionSortKeys; search only
  // supports PRICE/RELEVANCE. Map unsupported sorts back to RELEVANCE.
  const searchSortKey = browse.sortKey === "PRICE" ? "PRICE" : "RELEVANCE";

  const { data, errors } = await staticStorefrontClient.graphql(SEARCH_QUERY, {
    variables: {
      query: term,
      first: 24,
      after: searchParams.get("after") ?? undefined,
      sortKey: searchSortKey,
      reverse: browse.reverse || undefined,
      productFilters:
        browse.filters.length > 0
          ? // F13: skill-sanctioned generated-type cast at the query variable
            // boundary (hydrogen-collection-browser/references/react.md).
            (browse.filters as StorefrontApiProductFilter[])
          : undefined,
    },
  });

  if (errors) {
    console.error("[hydrogen] Search query failed", errors);
  }

  const search = data?.search;
  const products = search?.nodes ?? [];
  // Filter to Product nodes only (search is heterogeneous; `__typename` guard
  // per feedback Round 1 + Round 2 #1).
  const productNodes = products.filter(
    (node): node is SearchProductNode => node?.__typename === "Product",
  );

  return {
    term,
    products: productNodes,
    availableFilters: search?.productFilters ?? [],
    pageInfo: search?.pageInfo ?? { hasNextPage: false },
    totalCount: productNodes.length,
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const urlSearch = toURLSearchParams(await searchParams);
  const term = urlSearch.get("q")?.trim() ?? "";
  const result = await fetchSearch(term, urlSearch.toString());

  return (
    <CollectionBrowser
      mode="search"
      term={result.term}
      products={result.products}
      availableFilters={result.availableFilters}
      pageInfo={result.pageInfo}
      totalCount={result.totalCount}
      dataSearch={urlSearch.toString()}
    />
  );
}
