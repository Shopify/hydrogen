"use client";

import {
  getFilterRemovalUrl,
  getSortByValue,
  serializeCollectionParams,
  type ProductFilter,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { AnalyticsEvent, getAnalytics } from "@/lib/analytics";
import { content } from "@/lib/content";
import { FilterGroup } from "@/lib/filters";
import { formatPrice } from "@/lib/money";
import type { CollectionAvailableFilter, SearchAvailableFilter } from "@/lib/queries";

/**
 * Shared collection/search browser (`hydrogen-collection-browser` /
 * `references/nextjs.md`). The server page fetches the product + filter
 * snapshot via `staticStorefrontClient` inside a `use cache` cache-point and
 * passes it here. This client component owns the `CollectionProvider`,
 * `useCollection`/`useCollectionForm`, URL sync via `useRouter`/`useSearchParams`,
 * and the filter/sort/grid UI.
 *
 * `onChange` → `router.replace(href, { scroll: false })` + `router.refresh()` so
 * the RSC payload catches up when the client URL is ahead.
 * Browse forms carry `method="get"` + explicit `action` (feedback Round 4 #4)
 * so they submit without JS (F4).
 */
export const COLLECTION_SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A-Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z-A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

export const SEARCH_SORT_OPTIONS = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];

type PageInfo = { hasNextPage: boolean; endCursor?: string | null };
type BrowserAvailableFilter = CollectionAvailableFilter | SearchAvailableFilter;

export type CollectionBrowserProps =
  | {
      mode: "collection";
      handle: string;
      collection: {
        id: string;
        handle: string;
        title: string;
        description?: string | null;
        descriptionHtml?: string | null;
      };
      products: ProductCardData[];
      availableFilters: CollectionAvailableFilter[];
      pageInfo: PageInfo;
      dataSearch: string;
    }
  | {
      mode: "search";
      term: string;
      products: ProductCardData[];
      availableFilters: SearchAvailableFilter[];
      pageInfo: PageInfo;
      totalCount: number;
      dataSearch: string;
    };

export function CollectionBrowser(props: CollectionBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.toString();

  const providerHandle = props.mode === "collection" ? props.handle : `search:${props.term}`;

  return (
    <CollectionProvider
      data={{ handle: providerHandle, dataSearch: props.dataSearch }}
      urlSearch={urlSearch}
      onChange={(search) => {
        const href = `${pathname}${search}`;
        if (urlSearch) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
        router.refresh();
      }}
    >
      {props.mode === "collection" ? (
        <CollectionViewedTracker id={props.collection.id} handle={props.collection.handle} />
      ) : (
        <SearchViewedTracker term={props.term} totalCount={props.totalCount} />
      )}
      {props.mode === "collection" ? <CollectionPage {...props} /> : <SearchPage {...props} />}
    </CollectionProvider>
  );
}

function CollectionViewedTracker({ id, handle }: { id: string; handle: string }) {
  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: { id, handle },
    });
  }, [id, handle]);
  return null;
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
  }, [term, totalCount]);
  return null;
}

type CollectionPageProps = Extract<CollectionBrowserProps, { mode: "collection" }>;

function CollectionPage(props: CollectionPageProps) {
  const { collection, products, availableFilters, pageInfo } = props;
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const router = useRouter();
  // Reset key for the uncontrolled filter subtree (checkboxes + price inputs).
  // Keyed by the serialized filter state (NOT the URL) so the subtree remounts
  // *after* the reconciler settles `state.filters` — clearing `defaultChecked` /
  // `defaultValue` when an external navigation (chip removal, clear-all) empties
  // the filters. Keying by the live URL is racy: the URL clears before
  // `state.filters` settles, so the remount would bake in the stale checked
  // state (hydrogen-collection-browser/references/nextjs.md reset-key guidance).
  const filterSubtreeKey = serializeCollectionParams({
    filters: state.filters,
    sortKey: undefined,
    reverse: false,
  }).toString();
  const isLoading = state.status === "loading";
  const collectionPath = `/collections/${collection.handle}`;
  // `<Link>` navigations (active-filter chips, clear-all, load-more) update the
  // URL but, under Cache Components / PPR, the RSC payload doesn't re-fetch on a
  // same-segment `searchParams` change unless we explicitly refresh. `onChange`
  // (form-driven) already calls `router.refresh()`; this wires the same refresh
  // to the `<Link>` clicks so the server products/filters catch up to the URL
  // (hydrogen-collection-browser/references/nextjs.md).
  const onNavigate = () => router.refresh();

  const showingCount = content.collection.showingCountPartial.replace(
    "{{ shown }}",
    String(products.length),
  );
  const currencyCode = products[0]?.priceRange.minVariantPrice.currencyCode ?? "USD";

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
          key={filterSubtreeKey}
          availableFilters={availableFilters}
          activeFilters={state.filters}
          disabled={isLoading}
          currencyCode={currencyCode}
        />

        <div key="results" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="type-body-sm text-on-surface-secondary" aria-live="polite">
              {showingCount}
            </p>
            <SortSelect isLoading={isLoading} options={COLLECTION_SORT_OPTIONS} />
          </div>

          <ActiveFilterChips
            activeFilters={state.filters}
            collectionPath={collectionPath}
            onNavigate={onNavigate}
            currencyCode={currencyCode}
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

          <LoadMore pageInfo={pageInfo} collectionPath={collectionPath} onNavigate={onNavigate} />

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

type SearchPageProps = Extract<CollectionBrowserProps, { mode: "search" }>;

function SearchPage(props: SearchPageProps) {
  const { term, products, availableFilters, pageInfo, totalCount } = props;
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const router = useRouter();
  const onNavigate = () => router.refresh();
  // Reset key for the uncontrolled filter subtree — see CollectionPage for rationale.
  const filterSubtreeKey = serializeCollectionParams({
    filters: state.filters,
    sortKey: undefined,
    reverse: false,
  }).toString();
  const isLoading = state.status === "loading";
  const currencyCode = products[0]?.priceRange.minVariantPrice.currencyCode ?? "USD";

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: content.search.title }]} />
      </div>

      <h1 className="type-display mb-6">{content.search.title}</h1>

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
            href="/search"
            className="text-on-surface-secondary hover:text-on-surface text-sm no-underline"
          >
            {content.search.clear}
          </Link>
        ) : null}
      </form>

      {!term ? null : products.length === 0 ? (
        <div className="py-12 text-center">
          <p className="type-body text-on-surface">
            {content.search.noResults.replace("{{ terms }}", `\u201c${term}\u201d`)}
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
          <input key="q" type="hidden" name="q" value={term} />

          {/* A SINGLE filter subtree (one set of inputs) so filter params are
              never duplicated. Desktop: `<summary>` hidden, `<details open>`
              shows groups as a static sidebar. Mobile: collapsible disclosure,
              reachable without JS (F4). */}
          <details
            key={filterSubtreeKey}
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
              {availableFilters.map((filter) => (
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

          <div key="results" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="type-body-sm text-on-surface-secondary" aria-live="polite">
                {content.search.resultsFor
                  .replace("{{ count }}", String(totalCount))
                  .replace("{{ terms }}", `\u201c${term}\u201d`)}
              </p>
              <SortSelect isLoading={isLoading} options={SEARCH_SORT_OPTIONS} />
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

            {pageInfo.hasNextPage ? (
              <div className="mt-8 text-center">
                <Link
                  href={`/search?q=${encodeURIComponent(term)}&after=${encodeURIComponent(pageInfo.endCursor ?? "")}`}
                  onClick={onNavigate}
                  className="rounded-button button-outline inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline"
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

type SortOption = { label: string; value: string };

function SortSelect({ isLoading, options }: { isLoading: boolean; options: SortOption[] }) {
  const state = useCollection();
  const currentSort = useMemo(() => {
    return serializeCollectionParams(state).toString();
  }, [state]);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-on-surface-secondary">{content.collection.sortBy}</span>
      <select
        name="sort_by"
        defaultValue={currentSort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-busy={isLoading}
        className="w-auto"
      >
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterSidebar({
  availableFilters,
  activeFilters,
  disabled,
  currencyCode,
}: {
  availableFilters: BrowserAvailableFilter[];
  activeFilters: ProductFilter[];
  disabled: boolean;
  currencyCode: string;
}) {
  if (availableFilters.length === 0) return null;

  const filterGroups = availableFilters.map((filter) => (
    <FilterGroup
      key={filter.id}
      filter={filter}
      activeFilters={activeFilters}
      disabled={disabled}
      currencyCode={currencyCode}
    />
  ));

  return (
    /* A SINGLE filter subtree rendered once inside the `method="get"` form so
       each filter input exists exactly once (no duplicate query params). On
       desktop (lg+) the `<summary>` is hidden and `<details open>` shows the
       groups as a static sidebar; on mobile the `<summary>` is visible and the
       disclosure is collapsible — reachable WITHOUT JS (F4). */
    <details
      open
      className="lg:flex lg:flex-col lg:gap-6"
      aria-labelledby="collection-filters-heading"
    >
      <summary className="marker-hidden rounded-button button-outline focus-visible:outline-accent min-h-touch-target mb-4 inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden">
        <span aria-hidden="true"> {/* filter icon placeholder */} </span>
        {content.collection.filters}
      </summary>
      <div className="flex flex-col gap-6 lg:mb-0">
        <h2 id="collection-filters-heading" className="type-heading-sm text-on-surface font-medium">
          {content.collection.filters}
        </h2>
        {filterGroups}
      </div>
    </details>
  );
}

function ActiveFilterChips({
  activeFilters,
  collectionPath,
  onNavigate,
  currencyCode,
}: {
  activeFilters: ProductFilter[];
  collectionPath: string;
  onNavigate: () => void;
  currencyCode: string;
}) {
  if (activeFilters.length === 0) return null;

  return (
    <ul role="list" className="flex flex-wrap gap-2">
      {activeFilters
        .filter((filter) => describeFilter(filter, currencyCode) !== "")
        .map((filter, index) => {
          const currentParams = serializeCollectionParams({
            filters: activeFilters,
            sortKey: undefined,
            reverse: false,
          });
          const removal = getFilterRemovalUrl(currentParams, filter);
          const href = removal === "?" ? collectionPath : `${collectionPath}${removal}`;
          const filterLabel = describeFilter(filter, currencyCode);
          return (
            <li key={`${filter.toString()}-${index}`}>
              <Link
                href={href}
                scroll={false}
                onClick={onNavigate}
                aria-label={`Remove filter: ${filterLabel}`}
                className="chip-filled inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm no-underline"
              >
                <span aria-hidden="true">{filterLabel}</span>
                <span aria-hidden="true">×</span>
              </Link>
            </li>
          );
        })}
      <li>
        <Link
          href={collectionPath}
          scroll={false}
          onClick={onNavigate}
          className="text-link inline-flex items-center rounded-full px-3 py-1 text-sm no-underline underline"
        >
          {content.collection.clearAll}
        </Link>
      </li>
    </ul>
  );
}

function describeFilter(filter: ProductFilter, currencyCode = "USD"): string {
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

function LoadMore({
  pageInfo,
  collectionPath,
  onNavigate,
}: {
  pageInfo: PageInfo;
  collectionPath: string;
  onNavigate: () => void;
}) {
  if (!pageInfo.hasNextPage) return null;
  const cursor = pageInfo.endCursor ?? "";
  const href = `${collectionPath}?after=${encodeURIComponent(cursor)}`;

  return (
    <div className="mt-8 text-center">
      <Link
        href={href}
        onClick={onNavigate}
        className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {content.collection.loadMore}
      </Link>
    </div>
  );
}
