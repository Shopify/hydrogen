import { gql } from "@shopify/hydrogen";
import {
  Cache,
  getFilterRemovalUrl,
  getSortByValue,
  parseCollectionParams,
  serializeCollectionParams,
  type ProductFilter,
  type StorefrontApi,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Link, isRouteErrorResponse, useFetcher, useNavigate, useSearchParams } from "react-router";

import { Breadcrumbs } from "~/components/Breadcrumbs";
import { NotFound } from "~/components/NotFound";
import { ProductCard } from "~/components/ProductCard";
import { AnalyticsEvent, getAnalytics } from "~/lib/analytics";
import { defaultI18n } from "~/lib/config";
import { mergeProductWindow, type ProductWindow } from "~/lib/collection-pagination";
import { content } from "~/lib/content";
import { FilterGroup } from "~/lib/filters";
import { PRODUCT_CARD_FRAGMENT } from "~/lib/fragments";
import { shopNameFromMatches, shopTitle, siteOriginFromMatches } from "~/lib/meta";
import { formatPrice } from "~/lib/money";
import { canonicalUrl } from "~/lib/site";
import { storefrontClientContext } from "~/lib/storefront-context";

import type { Route } from "./+types/collection";

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
  query Collection($handle: String!, $first: Int, $last: Int, $before: String, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $filters: [ProductFilter!], $country: CountryCode, $language: LanguageCode)
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
      products(first: $first, last: $last, before: $before, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        filters {
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
          hasPreviousPage
          hasNextPage
          startCursor
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

type CollectionQuery = StorefrontApi.ResultOf<typeof COLLECTION_QUERY>;
type CollectionProducts = NonNullable<CollectionQuery["collection"]>["products"];
type CollectionAvailableFilter = CollectionProducts["filters"][number];
type CollectionProduct = CollectionProducts["nodes"][number];
type CollectionPageInfo = CollectionProducts["pageInfo"];

export const meta: Route.MetaFunction = ({ data, params, matches }: Route.MetaArgs) => {
  const pageTitle = data?.collection?.title ?? "Collection";
  const description = data?.collection?.description ?? "";
  const title = shopTitle(pageTitle, shopNameFromMatches(matches));
  const siteOrigin = siteOriginFromMatches(matches);
  return [
    { title },
    { name: "description", content: description },
    {
      tagName: "link",
      rel: "canonical",
      href: canonicalUrl(`/collections/${params.handle ?? ""}`, siteOrigin),
    },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
  ];
};

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const url = new URL(request.url);
  const browse = parseCollectionParams(url.searchParams);
  const browseSearch = serializeCollectionParams(browse).toString();
  const dataSearch = url.searchParams.toString();
  const isPaginationRequest = url.searchParams.get("_pagination") === "1";
  const before = url.searchParams.get("before") || undefined;
  const after = before ? undefined : url.searchParams.get("after") || undefined;

  const queryResult = await storefrontClient
    .graphql(COLLECTION_QUERY, {
      variables: {
        handle: params.handle,
        first: before ? undefined : 24,
        last: before ? 24 : undefined,
        before,
        after,
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
    })
    .catch((error: unknown) => {
      console.error("[hydrogen] Collection query failed", error);
      if (isPaginationRequest) return null;
      throw error;
    });

  if (!queryResult) return paginationErrorLoaderData(browseSearch, dataSearch);

  const { data, errors } = queryResult;

  if (errors) {
    console.error("[hydrogen] Collection query failed", errors);
    if (isPaginationRequest) return paginationErrorLoaderData(browseSearch, dataSearch);
    throw new Response("Collection query failed", { status: 500 });
  }

  if (!data?.collection) {
    if (isPaginationRequest) return paginationErrorLoaderData(browseSearch, dataSearch);
    throw new Response("Collection not found", { status: 404 });
  }

  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    pageInfo: data.collection.products.pageInfo,
    availableFilters: data.collection.products.filters,
    browseSearch,
    dataSearch,
    paginationError: false as const,
  };
}

function paginationErrorLoaderData(browseSearch: string, dataSearch: string) {
  return {
    collection: null,
    products: [],
    pageInfo: null,
    availableFilters: [],
    browseSearch,
    dataSearch,
    paginationError: true as const,
  };
}

export default function CollectionRoute({ loaderData }: Route.ComponentProps) {
  if (loaderData.paginationError || !loaderData.collection || !loaderData.pageInfo) {
    throw new Response("Collection query failed", { status: 500 });
  }

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const collectionPath = `/collections/${loaderData.collection.handle}`;

  return (
    <CollectionProvider
      data={{
        handle: loaderData.collection.handle,
        dataSearch: loaderData.dataSearch,
      }}
      urlSearch={searchParams.toString()}
      onChange={(search) =>
        navigate(
          { search },
          {
            replace: searchParams.size > 0,
            preventScrollReset: true,
          },
        )
      }
    >
      <CollectionViewedTracker collection={loaderData.collection} />
      <CollectionPage
        key={`${loaderData.collection.handle}:${loaderData.browseSearch}`}
        collection={loaderData.collection}
        products={loaderData.products}
        availableFilters={loaderData.availableFilters}
        pageInfo={loaderData.pageInfo}
        browseSearch={loaderData.browseSearch}
        collectionPath={collectionPath}
      />
    </CollectionProvider>
  );
}

type CollectionPageProps = {
  collection: NonNullable<Route.ComponentProps["loaderData"]["collection"]>;
  products: Route.ComponentProps["loaderData"]["products"];
  availableFilters: CollectionAvailableFilter[];
  pageInfo: CollectionPageInfo;
  browseSearch: string;
  collectionPath: string;
};

function CollectionPage({
  collection,
  products,
  availableFilters,
  pageInfo,
  browseSearch,
  collectionPath,
}: CollectionPageProps) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const pagination = useFetcher<typeof loader>();
  const paginationNavigate = useNavigate();
  const [productWindow, setProductWindow] = useState<ProductWindow<CollectionProduct>>(() => ({
    products,
    pageInfo,
  }));
  const [paginationErrorDirection, setPaginationErrorDirection] = useState<
    "next" | "previous" | null
  >(null);
  const [pendingDirection, setPendingDirection] = useState<"next" | "previous" | null>(null);
  const [focusProductId, setFocusProductId] = useState<string | null>(null);
  const productWindowRef = useRef(productWindow);
  const addedProductRef = useRef<HTMLAnchorElement>(null);
  productWindowRef.current = productWindow;
  const isLoading = state.status === "loading";
  const isLoadingMore = pagination.state !== "idle";
  const currentBrowseSearch = serializeCollectionParams(state).toString();
  const isBrowsePending = isLoading || currentBrowseSearch !== browseSearch;
  const currencyCode =
    productWindow.products[0]?.priceRange.minVariantPrice.currencyCode ?? defaultI18n.currency;

  useEffect(() => {
    setProductWindow({ products, pageInfo });
    setFocusProductId(null);
    setPaginationErrorDirection(null);
  }, [pageInfo, products]);

  useEffect(() => {
    if (pagination.state === "idle") setPendingDirection(null);
  }, [pagination.state]);

  useEffect(() => {
    const page = pagination.data;
    if (!page || page.browseSearch !== currentBrowseSearch || page.browseSearch !== browseSearch)
      return;
    const isPreviousPage = new URLSearchParams(page.dataSearch).has("before");
    const direction = isPreviousPage ? "previous" : "next";

    if (page.paginationError) {
      setPaginationErrorDirection(direction);
      return;
    }

    const nextPageInfo = page.pageInfo;
    const merged = mergeProductWindow(
      productWindowRef.current,
      { products: page.products, pageInfo: nextPageInfo },
      isPreviousPage ? "previous" : "next",
    );
    setFocusProductId(merged.firstAddedProductId);
    setPaginationErrorDirection(null);
    setProductWindow(merged.window);

    const shareableParams = new URLSearchParams(page.dataSearch);
    shareableParams.delete("_pagination");
    void paginationNavigate(
      { search: `?${shareableParams.toString()}` },
      { defaultShouldRevalidate: false, preventScrollReset: true },
    );
  }, [browseSearch, currentBrowseSearch, pagination.data, paginationNavigate]);

  useEffect(() => {
    if (focusProductId) addedProductRef.current?.focus();
  }, [focusProductId, productWindow.products]);

  const showingCount = content.collection.showingCountPartial.replace(
    "{{ shown }}",
    String(productWindow.products.length),
  );

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <div className="mb-6">
        <Breadcrumbs
          items={[{ label: "Collections", href: "/collections" }, { label: collection.title }]}
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
        <FilterSidebar
          availableFilters={availableFilters}
          activeFilters={state.filters}
          countPending={isLoading}
          currencyCode={currencyCode}
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p role="status" className="sr-only">
              {isLoading ? content.collection.updatingCounts : ""}
            </p>
            <p
              className={`type-body-sm text-on-surface-secondary motion-safe:transition-opacity ${isLoading ? "opacity-40" : ""}`}
              aria-live="polite"
            >
              {showingCount}
            </p>
            <div className="flex items-center gap-2">
              <SortSelect />
            </div>
          </div>

          <ActiveFilterChips
            activeFilters={state.filters}
            collectionPath={collectionPath}
            currencyCode={currencyCode}
          />

          <PaginationStatus
            hasError={paginationErrorDirection !== null}
            pendingDirection={pendingDirection}
          />

          <PaginationControls
            direction="previous"
            pageInfo={productWindow.pageInfo}
            collectionPath={collectionPath}
            hasError={paginationErrorDirection === "previous"}
            isBrowsePending={isBrowsePending}
            isLoading={isLoadingMore}
            pendingDirection={pendingDirection}
            loadPage={(href, direction) => {
              setPaginationErrorDirection(null);
              setPendingDirection(direction);
              pagination.load(`${href}&_pagination=1`);
            }}
          />

          {productWindow.products.length === 0 ? (
            <p className="text-on-surface-secondary py-12 text-center">
              {content.collection.noProducts}
            </p>
          ) : (
            <ul
              role="list"
              className="grid grid-cols-2 gap-x-1 gap-y-10 contain-paint lg:grid-cols-3"
            >
              {productWindow.products.map((product, index) => (
                <li key={product.id} className={isLoading ? "opacity-60" : ""}>
                  <ProductCard
                    product={product}
                    loading={index < 3 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    linkRef={product.id === focusProductId ? addedProductRef : undefined}
                  />
                </li>
              ))}
            </ul>
          )}

          <PaginationControls
            direction="next"
            pageInfo={productWindow.pageInfo}
            collectionPath={collectionPath}
            hasError={paginationErrorDirection === "next"}
            isBrowsePending={isBrowsePending}
            isLoading={isLoadingMore}
            pendingDirection={pendingDirection}
            loadPage={(href, direction) => {
              setPaginationErrorDirection(null);
              setPendingDirection(direction);
              pagination.load(`${href}&_pagination=1`);
            }}
          />
        </div>
      </form>
    </div>
  );
}

function CollectionViewedTracker({
  collection,
}: {
  collection: NonNullable<Route.ComponentProps["loaderData"]["collection"]>;
}) {
  const publishCollectionViewed = useEffectEvent(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection,
      url: window.location.href,
    });
  });

  useEffect(() => {
    publishCollectionViewed();
  }, [collection.id]);
  return null;
}

function SortSelect() {
  const state = useCollection();
  const currentSort = state.sortKey
    ? getSortByValue(state.sortKey, state.reverse)
    : COLLECTION_SORT_OPTIONS[0].value;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-on-surface-secondary">{content.collection.sortBy}</span>
      <select
        name="sort_by"
        defaultValue={currentSort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
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

type FilterSidebarProps = {
  availableFilters: CollectionAvailableFilter[];
  activeFilters: ProductFilter[];
  countPending: boolean;
  currencyCode: string;
};

function FilterSidebar({
  availableFilters,
  activeFilters,
  countPending,
  currencyCode,
}: FilterSidebarProps) {
  const filterGroups = availableFilters.map((filter) => (
    <FilterGroup
      key={filter.id}
      filter={filter}
      activeFilters={activeFilters}
      countPending={countPending}
      currencyCode={currencyCode}
    />
  ));

  return (
    /* A SINGLE filter subtree rendered once inside the `method="get"` form so
       each filter input exists exactly once (no duplicate query params).
       Desktop (lg+): `<summary>` hidden, `<details open>` shows the groups as a
       static sidebar. Mobile: `<summary>` visible, collapsible disclosure —
       reachable WITHOUT JS (F4). */
    <details
      open
      className="lg:flex lg:flex-col lg:gap-6"
      aria-labelledby="collection-filters-heading"
    >
      <summary className="marker-hidden rounded-button button-outline focus-visible:outline-accent min-h-touch-target mb-4 inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden">
        {content.collection.filters}
      </summary>
      <div className="flex flex-col gap-6 lg:mb-0">
        <h2 id="collection-filters-heading" className="type-heading-sm text-on-surface font-medium">
          {content.collection.filters}
        </h2>
        <noscript>
          <button type="submit" className="rounded-button button-primary h-11 px-4">
            {content.collection.applyFilters}
          </button>
        </noscript>
        {filterGroups}
      </div>
    </details>
  );
}

function ActiveFilterChips({
  activeFilters,
  collectionPath,
  currencyCode,
}: {
  activeFilters: ProductFilter[];
  collectionPath: string;
  currencyCode: string;
}) {
  const state = useCollection();
  if (activeFilters.length === 0) return null;

  return (
    <ul role="list" className="flex flex-wrap gap-2">
      {activeFilters
        .filter((filter) => describeFilter(filter, currencyCode) !== "")
        .map((filter, index) => {
          const currentParams = serializeCollectionParams({
            filters: activeFilters,
            sortKey: state.sortKey,
            reverse: state.reverse,
          });
          const removalParams = new URLSearchParams(getFilterRemovalUrl(currentParams, filter));
          removalParams.delete("after");
          const removal = removalParams.toString();
          const href = removal ? `${collectionPath}?${removal}` : collectionPath;
          return (
            <li key={`${filter.toString()}-${index}`}>
              <Link
                to={href}
                preventScrollReset
                className="chip-filled inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm no-underline"
              >
                {describeFilter(filter, currencyCode)}
                <span aria-hidden="true">×</span>
              </Link>
            </li>
          );
        })}
      <li>
        <Link
          to={collectionPath}
          preventScrollReset
          className="text-link inline-flex items-center rounded-full px-3 py-1 text-sm no-underline underline"
        >
          {content.collection.clearAll}
        </Link>
      </li>
    </ul>
  );
}

function describeFilter(filter: ProductFilter, currencyCode: string): string {
  if (filter.available !== undefined) return filter.available ? "In stock" : "Out of stock";
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.tag) return filter.tag;
  if (filter.variantOption) {
    const option = filter.variantOption;
    const value = option.value ?? option.name ?? "";
    return option.name && option.value ? `${option.name}: ${option.value}` : value;
  }
  if (filter.price) {
    const price = filter.price;
    const min = price.min;
    const max = price.max;
    const hasMin = min != null && Number(min) > 0;
    const hasMax = max != null;
    const format = (value: string | number) => formatPrice({ amount: String(value), currencyCode });
    if (hasMin && hasMax && min != null && max != null)
      return `${format(min)} ${content.collection.priceTo} ${format(max)}`;
    if (hasMax && max != null) return `Up to ${format(max)}`;
    if (hasMin && min != null) return `From ${format(min)}`;
    return "Price";
  }
  return "";
}

function PaginationControls({
  direction,
  pageInfo,
  collectionPath,
  hasError,
  isBrowsePending,
  isLoading,
  pendingDirection,
  loadPage,
}: {
  direction: "next" | "previous";
  pageInfo: CollectionPageInfo;
  collectionPath: string;
  hasError: boolean;
  isBrowsePending: boolean;
  isLoading: boolean;
  pendingDirection: "next" | "previous" | null;
  loadPage: (href: string, direction: "next" | "previous") => void;
}) {
  const [searchParams] = useSearchParams();
  if (isBrowsePending) return null;

  const previousParams = new URLSearchParams(searchParams);
  const nextParams = new URLSearchParams(searchParams);
  previousParams.delete("before");
  previousParams.delete("after");
  nextParams.delete("before");
  nextParams.delete("after");

  if (pageInfo.startCursor) previousParams.set("before", pageInfo.startCursor);
  if (pageInfo.endCursor) nextParams.set("after", pageInfo.endCursor);

  const previousHref = `${collectionPath}?${previousParams.toString()}`;
  const nextHref = `${collectionPath}?${nextParams.toString()}`;

  if (direction === "previous") {
    if ((!pageInfo.hasPreviousPage || !pageInfo.startCursor) && !hasError) return null;

    return (
      <div className="mb-4 flex flex-col items-center gap-3 text-center" aria-busy={isLoading}>
        {hasError ? (
          <p className="text-on-surface-secondary text-sm">{content.collection.paginationError}</p>
        ) : null}
        {pageInfo.hasPreviousPage && pageInfo.startCursor ? (
          <a
            href={previousHref}
            aria-disabled={isLoading || undefined}
            onClick={(event) => {
              if (!isPlainLeftClick(event)) return;
              event.preventDefault();
              if (!isLoading) loadPage(previousHref, "previous");
            }}
            className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {pendingDirection === "previous"
              ? content.collection.loadingPrevious
              : content.collection.loadPrevious}
          </a>
        ) : null}
      </div>
    );
  }

  const hasNextPage = pageInfo.hasNextPage && Boolean(pageInfo.endCursor);
  if (!hasNextPage && !hasError) return null;

  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3">
      {hasError ? (
        <p className="text-on-surface-secondary text-sm">{content.collection.paginationError}</p>
      ) : null}
      <div className="flex items-center justify-center gap-3" aria-busy={isLoading}>
        {hasNextPage ? (
          <a
            href={nextHref}
            aria-disabled={isLoading || undefined}
            onClick={(event) => {
              if (!isPlainLeftClick(event)) return;
              event.preventDefault();
              if (!isLoading) loadPage(nextHref, "next");
            }}
            className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {pendingDirection === "next"
              ? content.collection.loadingMore
              : content.collection.loadMore}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function PaginationStatus({
  hasError,
  pendingDirection,
}: {
  hasError: boolean;
  pendingDirection: "next" | "previous" | null;
}) {
  return (
    <>
      <p role="alert" className="sr-only">
        {hasError ? content.collection.paginationError : ""}
      </p>
      <p aria-live="polite" className="sr-only">
        {pendingDirection === "previous"
          ? content.collection.loadingPrevious
          : pendingDirection === "next"
            ? content.collection.loadingMore
            : ""}
      </p>
    </>
  );
}

function isPlainLeftClick(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.currentTarget.target !== "_blank"
  );
}

/** Per-route error boundary (R1). A 404 from the loader renders the shared
 *  themed catch-all UI; other statuses render status + data; non-route errors
 *  fall back to a safe message. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <NotFound />;
    return (
      <div className="max-w-page px-margin mx-auto py-16">
        <h1 className="type-heading-xl mb-4">{error.status} — Something went wrong</h1>
        <p className="type-body text-on-surface-secondary">
          {typeof error.data === "string" && error.data
            ? error.data
            : "Something went wrong. Please try again."}
        </p>
      </div>
    );
  }
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Something went wrong. Please try again.";
  return (
    <div className="max-w-page px-margin mx-auto py-16">
      <h1 className="type-heading-xl mb-4">Something went wrong</h1>
      <p className="type-body text-on-surface-secondary">{message}</p>
    </div>
  );
}
