import { gql } from "@shopify/hydrogen";
import {
  Cache,
  getSortByValue,
  parseCollectionParams,
  type AvailableFilter,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import { Link, createFileRoute, notFound, useLocation, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useMemo } from "react";

import { Breadcrumbs } from "~/components/Breadcrumbs";
import { ProductCard } from "~/components/ProductCard";
import { AnalyticsEvent, getAnalytics } from "~/lib/analytics";
import { content } from "~/lib/content";
import { ActiveFilterChips, FilterPanel, clearFilterParams } from "~/lib/filters";
import { PRODUCT_CARD_FRAGMENT } from "~/lib/fragments";
import { searchParamsToRecord } from "~/lib/search-params";
import { canonicalUrl } from "~/lib/site";

const COLLECTION_SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A-Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z-A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

const COLLECTION_QUERY = gql(
  `
  query Collection($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $filters: [ProductFilter!], $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      image {
        url
        altText
        width
        height
      }
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...ProductCard
        }
      }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

type CollectionInput = { handle: string; search: string };

const getCollectionData = createServerFn({ method: "GET" })
  .validator((data: CollectionInput) => data)
  .handler(async ({ data: input, context }) => {
    const searchParams = new URLSearchParams(input.search);
    const browse = parseCollectionParams(searchParams);

    const { data, errors } = await context.storefrontClient.graphql(COLLECTION_QUERY, {
      variables: {
        handle: input.handle,
        first: 24,
        after: searchParams.get("after") ?? undefined,
        filters:
          browse.filters.length > 0
            ? // F13: skill-sanctioned generated-type cast at the query variable boundary
              // (hydrogen-collection-browser/references/react.md). Kept verbatim.
              (browse.filters as StorefrontApiProductFilter[])
            : undefined,
        sortKey: browse.sortKey,
        reverse: browse.reverse || undefined,
      },
      cache: Cache.short(),
    });

    if (errors) {
      console.error("[hydrogen] Collection query failed", errors);
      throw new Error("Collection query failed");
    }

    if (!data?.collection) return null;

    return {
      collection: data.collection,
      products: data.collection.products.nodes,
      availableFilters: data.collection.products.filters,
      dataSearch: searchParams.toString(),
    };
  });

export const Route = createFileRoute("/collections/$handle")({
  validateSearch: (search) => search as Record<string, unknown>,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, location }) => {
    const data = await getCollectionData({
      data: { handle: params.handle, search: location.searchStr },
    });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Collection not found — CORE" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = loaderData?.collection.title ?? "Collection";
    const description = loaderData?.collection.description ?? "";
    const url = canonicalUrl(`/collections/${params.handle}`);
    return {
      meta: [
        { title: `${title} — CORE` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} — CORE` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CollectionRoute,
  notFoundComponent: CollectionNotFound,
});

type CollectionData = NonNullable<Awaited<ReturnType<typeof getCollectionData>>>;

function CollectionRoute() {
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.searchStr);
  const collectionPath = `/collections/${loaderData.collection.handle}`;

  return (
    <CollectionProvider
      data={{
        handle: loaderData.collection.handle,
        dataSearch: loaderData.dataSearch,
      }}
      urlSearch={searchParams.toString()}
      onChange={(search) => {
        const nextParams = new URLSearchParams(search);
        nextParams.delete("after");
        const nextSearch = nextParams.toString();
        void navigate({
          href: `${collectionPath}${nextSearch ? `?${nextSearch}` : ""}`,
          replace: searchParams.size > 0,
          resetScroll: false,
        });
      }}
    >
      <CollectionViewedTracker collection={loaderData.collection} />
      <CollectionPage
        collection={loaderData.collection}
        products={loaderData.products}
        availableFilters={loaderData.availableFilters}
        pageInfo={loaderData.collection.products.pageInfo}
        collectionPath={collectionPath}
        searchParams={searchParams}
      />
    </CollectionProvider>
  );
}

function CollectionNotFound() {
  return (
    <div className="max-w-page px-margin mx-auto w-full py-16 text-center">
      <h1 className="type-display mb-4">Collection not found</h1>
      <p className="type-body text-on-surface-secondary mb-6">
        This collection does not exist or is no longer available.
      </p>
      <Link
        to="/collections"
        className="rounded-button button-primary inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline"
      >
        View all collections
      </Link>
    </div>
  );
}

type CollectionPageProps = {
  collection: CollectionData["collection"];
  products: CollectionData["products"];
  availableFilters: AvailableFilter[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  collectionPath: string;
  searchParams: URLSearchParams;
};

function CollectionPage({
  collection,
  products,
  availableFilters,
  pageInfo,
  collectionPath,
  searchParams,
}: CollectionPageProps) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const isLoading = state.status === "loading";

  const showingCount = `Showing ${products.length} ${products.length === 1 ? "product" : "products"}`;

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <div className="mb-6">
        <Breadcrumbs
          items={[{ label: "Collections", to: "/collections" }, { label: collection.title }]}
        />
      </div>

      <h1 className="type-display mb-4">{collection.title}</h1>
      {collection.descriptionHtml ? (
        <div
          className="richtext type-body text-on-surface-secondary mb-6 max-w-prose"
          dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
        />
      ) : collection.description ? (
        <p className="type-body text-on-surface-secondary mb-6 max-w-prose">
          {collection.description}
        </p>
      ) : null}

      <form
        {...formProps()}
        method="get"
        action={collectionPath}
        className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8"
      >
        <FilterPanel availableFilters={availableFilters} activeFilters={state.filters} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="type-body-sm text-on-surface-secondary" aria-live="polite">
              {showingCount}
            </p>
            <SortSelect isLoading={isLoading} />
          </div>

          <ActiveFilterChips
            activeFilters={state.filters}
            pathname={collectionPath}
            searchParams={searchParams}
            clearSearchParams={clearFilterParams(searchParams)}
          />

          {products.length === 0 ? (
            <p className="text-on-surface-secondary py-12 text-center">
              {content.collection.noProducts}
            </p>
          ) : (
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
          )}

          <LoadMore
            pageInfo={pageInfo}
            collectionHandle={collection.handle}
            searchParams={searchParams}
          />

          {/* No-JS submit so the GET filter/sort form is submittable without JS (F4). */}
          <noscript>
            <button type="submit" className="rounded-button button-primary h-11 px-4">
              {content.collection.showResults}
            </button>
          </noscript>
        </div>
      </form>
    </div>
  );
}

function CollectionViewedTracker({ collection }: { collection: CollectionData["collection"] }) {
  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: { id: collection.id, handle: collection.handle },
    });
  }, [collection.handle, collection.id]);
  return null;
}

function SortSelect({ isLoading }: { isLoading: boolean }) {
  const state = useCollection();
  const currentSort = useMemo(
    () =>
      state.sortKey
        ? getSortByValue(state.sortKey, state.reverse)
        : getSortByValue("COLLECTION_DEFAULT", false),
    [state.reverse, state.sortKey],
  );

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-on-surface-secondary">{content.collection.sortBy}</span>
      <select
        name="sort_by"
        value={currentSort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-busy={isLoading}
        className="w-auto"
      >
        {COLLECTION_SORT_OPTIONS.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadMore({
  pageInfo,
  collectionHandle,
  searchParams,
}: {
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  collectionHandle: string;
  searchParams: URLSearchParams;
}) {
  if (!pageInfo.hasNextPage || !pageInfo.endCursor) return null;
  const cursor = pageInfo.endCursor;
  const nextParams = new URLSearchParams(searchParams);
  nextParams.set("after", cursor);

  return (
    <div className="mt-8 text-center">
      <Link
        to="/collections/$handle"
        params={{ handle: collectionHandle }}
        search={searchParamsToRecord(nextParams)}
        className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {content.collection.loadMore}
      </Link>
    </div>
  );
}
