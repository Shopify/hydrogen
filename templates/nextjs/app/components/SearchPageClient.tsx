"use client";

import { CollectionProvider, useCollection } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { SearchPageData } from "../lib/search";
import { SearchViewedTracker } from "./AnalyticsTrackers";
import {
  ActiveFilterChips,
  FacetForm,
  FilterDrawer,
  LoadMore,
  SEARCH_SORT_OPTIONS,
  Toolbar,
  useLoadMore,
} from "./CollectionBrowse";
import { ProductCard } from "./ProductCard";

const FILTER_DRAWER_ID = "search-filter-drawer";
const SEARCH_DEFAULT_SORT_VALUE = SEARCH_SORT_OPTIONS[0].value;

function breadcrumbJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Search",
        item: `${origin}/search`,
      },
    ],
  };
}

function qHref(term: string) {
  return `/search?q=${encodeURIComponent(term)}`;
}

function SearchHeader({ searchTerm, origin }: { searchTerm: string; origin: string }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(origin)) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="text-on-surface-secondary flex items-center gap-1.5 text-sm">
          <li>
            <Link
              href="/"
              className="hover:text-on-surface rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current motion-safe:transition-colors"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-on-surface-secondary">
            /
          </li>
          <li>
            <span aria-current="page" className="text-on-surface font-medium">
              Search
            </span>
          </li>
        </ol>
      </nav>
      <div className="mb-8 max-w-2xl">
        <h1 className="type-display text-on-surface mb-6">Search</h1>
        <form action="/search" method="get" role="search" className="space-y-2">
          <label htmlFor="search-q" className="type-body-sm text-on-surface block font-medium">
            Search
          </label>
          <div className="relative">
            <img
              src="/icons/icon-search.svg"
              alt=""
              className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="search-q"
              type="search"
              name="q"
              defaultValue={searchTerm}
              className="ps-10 pe-12"
              placeholder="Search products"
              autoComplete="off"
            />
            {searchTerm ? (
              <Link
                href="/search"
                aria-label="Clear search"
                className="button-icon focus-visible:outline-accent absolute end-1 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </>
  );
}

function SearchEmptyState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="border-border bg-surface-secondary rounded-lg border p-8" aria-live="polite">
      <p className="type-body text-on-surface-secondary">No results for “{searchTerm}”</p>
      <p className="text-on-surface-secondary mt-2 text-sm">
        Check your spelling or try a more general term.
      </p>
    </div>
  );
}

function SearchContent({ data }: { data: SearchPageData }) {
  const state = useCollection();
  const { items, pageInfo, pending, setPending } = useLoadMore({
    initialItems: data.products,
    pageInfo: data.pageInfo,
    dataSearch: data.dataSearch,
  });
  const isLoading = state.status === "loading";
  const hiddenSearchInput = <input type="hidden" name="q" value={data.searchTerm} />;
  const preservedParams = useMemo(() => [{ name: "q", value: data.searchTerm }], [data.searchTerm]);

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      <div className="max-w-page px-margin mx-auto w-full py-8 md:py-12">
        {data.performed ? (
          <SearchViewedTracker searchTerm={data.searchTerm} totalCount={data.totalCount} />
        ) : null}
        <SearchHeader searchTerm={data.searchTerm} origin={data.origin} />

        {!data.performed ? null : items.length === 0 && !isLoading ? (
          <SearchEmptyState searchTerm={data.searchTerm} />
        ) : (
          <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
            <aside className="hidden lg:block" aria-label="Filters">
              <div className="sticky top-8">
                <h2 className="type-heading-sm text-on-surface mb-2">Filters</h2>
                <FacetForm
                  availableFilters={data.availableFilters}
                  extraHiddenInputs={hiddenSearchInput}
                  idPrefix="search-desktop"
                  resetKeySuffix={data.searchTerm}
                  sortOptions={SEARCH_SORT_OPTIONS}
                  defaultSortValue={SEARCH_DEFAULT_SORT_VALUE}
                />
              </div>
            </aside>

            <div className="min-w-0">
              <Toolbar
                countText={`${items.length} results found for “${data.searchTerm}”`}
                defaultSortValue={SEARCH_DEFAULT_SORT_VALUE}
                filterDrawerId={FILTER_DRAWER_ID}
                extraHiddenInputs={hiddenSearchInput}
                sortOptions={SEARCH_SORT_OPTIONS}
              />
              <ActiveFilterChips
                basePath="/search"
                clearHref={qHref(data.searchTerm)}
                currencyCode={data.currencyCode}
                preservedParams={preservedParams}
              />

              <h2 className="sr-only">Products</h2>
              {items.length > 0 ? (
                <div className={`px-1 contain-paint ${isLoading ? "opacity-60" : ""}`}>
                  <ul
                    id="product-grid"
                    role="list"
                    className="grid grid-cols-2 gap-x-1 gap-y-10 lg:grid-cols-3"
                    data-testid="product-grid"
                  >
                    {items.map((product, index) => (
                      <li key={product.id}>
                        <ProductCard product={product} priority={index < 3} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div
                  className="border-border bg-surface-secondary rounded-lg border p-8 text-sm"
                  data-testid="product-grid"
                >
                  Updating products…
                </div>
              )}

              <LoadMore
                pageInfo={pageInfo}
                pending={pending}
                setPending={setPending}
                shownCount={items.length}
              />
            </div>
          </div>
        )}
      </div>
      {data.performed && (items.length > 0 || isLoading) ? (
        <FilterDrawer
          id={FILTER_DRAWER_ID}
          availableFilters={data.availableFilters}
          extraHiddenInputs={hiddenSearchInput}
          idPrefix="search-mobile"
          resetKeySuffix={data.searchTerm}
          sortOptions={SEARCH_SORT_OPTIONS}
          defaultSortValue={SEARCH_DEFAULT_SORT_VALUE}
        />
      ) : null}
    </main>
  );
}

export function SearchPageClient({ data }: { data: SearchPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.toString();

  return (
    <CollectionProvider
      data={{ handle: `search:${data.searchTerm}`, dataSearch: data.dataSearch }}
      urlSearch={urlSearch}
      onChange={(search) => {
        const next = new URLSearchParams(search);
        next.set("q", data.searchTerm);
        next.delete("after");
        const query = next.toString();
        const href = query ? `${pathname}?${query}` : pathname;
        if (urlSearch) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
        router.refresh();
      }}
    >
      <SearchContent data={data} />
    </CollectionProvider>
  );
}
