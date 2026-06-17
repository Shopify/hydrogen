"use client";

import type { AvailableFilter, MoneyV2, ProductFilter } from "@shopify/hydrogen";
import {
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  serializeCollectionParams,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { AnalyticsEvent, analyticsShop, getAnalytics } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";

import { ProductCard, type ProductCardData } from "./ProductCard";

const COLLECTION_SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A-Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z-A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, old to new", value: getSortByValue("CREATED", false) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

const SEARCH_SORT_OPTIONS = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];

type CollectionBrowserProps =
  | {
      mode: "collection";
      title: string;
      description: string | null;
      handle: string;
      dataSearch: string;
      products: ProductCardData[];
      availableFilters: AvailableFilter[];
    }
  | {
      mode: "search";
      term: string;
      dataSearch: string;
      products: ProductCardData[];
      availableFilters: AvailableFilter[];
      totalCount: number;
    };

export function CollectionBrowser(props: CollectionBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.toString();
  const handle = props.mode === "collection" ? props.handle : `search:${props.term}`;

  return (
    <CollectionProvider
      data={{ handle, dataSearch: props.dataSearch }}
      urlSearch={urlSearch}
      onChange={(search) => {
        const href = `${pathname}${search}`;
        if (urlSearch) {
          router.replace(href, { scroll: false });
        } else {
          router.push(href, { scroll: false });
        }
        // Ensure the RSC payload catches up when replaceState updates searchParams first.
        router.refresh();
      }}
    >
      {props.mode === "search" ? (
        <SearchViewedTracker term={props.term} totalCount={props.totalCount} />
      ) : null}
      <BrowserContent {...props} />
    </CollectionProvider>
  );
}

function BrowserContent(props: CollectionBrowserProps) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const pathname = usePathname();
  const currentSortValue =
    props.mode === "search"
      ? state.sortKey === "PRICE"
        ? getSortByValue("PRICE", state.reverse)
        : getSortByValue("RELEVANCE", false)
      : state.sortKey
        ? getSortByValue(state.sortKey, state.reverse)
        : getSortByValue("COLLECTION_DEFAULT", false);
  const hasActiveFilters = state.filters.length > 0;
  const isLoading = state.status === "loading";
  const clearPath = props.mode === "search" ? buildSearchUrl(pathname, props.term) : pathname;
  const formKey =
    props.mode === "search"
      ? `${props.term}|${serializeCollectionParams(state).toString()}`
      : serializeCollectionParams(state).toString();

  return (
    <main className="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      {props.mode === "search" ? (
        <SearchHeader term={props.term} totalCount={props.totalCount} />
      ) : (
        <CollectionHeader
          title={props.title}
          description={props.description}
          count={props.products.length}
        />
      )}

      {props.mode === "search" ? <SearchForm term={props.term} /> : null}

      {props.mode === "search" && !props.term ? (
        <p className="mt-12 text-lg text-black/60">Enter a search term to find products.</p>
      ) : (
        <form
          {...formProps()}
          key={formKey}
          method="get"
          action={pathname}
          className="mt-12 flex gap-12"
        >
          {props.mode === "search" ? <input type="hidden" name="q" value={props.term} /> : null}

          {props.availableFilters.length > 0 ? (
            <BrowseFilters
              availableFilters={props.availableFilters}
              activeFilters={state.filters}
              disabled={isLoading}
            />
          ) : null}

          <div className="flex-1">
            <BrowseToolbar
              clearPath={clearPath}
              sortOptions={props.mode === "search" ? SEARCH_SORT_OPTIONS : COLLECTION_SORT_OPTIONS}
              sortValue={currentSortValue}
              hasActiveFilters={hasActiveFilters}
              isLoading={isLoading}
            />

            {hasActiveFilters ? (
              <ActiveFilterChips
                clearPath={clearPath}
                filters={state.filters}
                currentParams={serializeCollectionParams(state)}
              />
            ) : null}

            <section
              className={`mt-8 grid grid-cols-2 gap-x-6 gap-y-12 transition-opacity duration-200 md:grid-cols-3 ${isLoading ? "opacity-50" : "opacity-100"}`}
            >
              {props.products.map((product) => (
                <ProductCard key={product.handle} product={product} />
              ))}
            </section>

            {props.products.length === 0 && !isLoading ? (
              <EmptyResults
                mode={props.mode}
                term={props.mode === "search" ? props.term : undefined}
                clearPath={clearPath}
                hasActiveFilters={hasActiveFilters}
              />
            ) : null}
          </div>
        </form>
      )}
    </main>
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
      url: window.location.href,
      shop: analyticsShop,
    });
  }, [term, totalCount]);

  return null;
}

function requestFormSubmit(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

function uncheckSiblings(checkbox: HTMLInputElement) {
  const form = checkbox.form;
  if (!form) return;

  for (const sibling of form.elements) {
    if (
      sibling instanceof HTMLInputElement &&
      sibling !== checkbox &&
      sibling.name === checkbox.name &&
      sibling.type === "checkbox"
    ) {
      sibling.checked = false;
    }
  }
}

function SearchForm({ term }: { term: string }) {
  const pathname = usePathname();

  return (
    <form method="get" action={pathname} className="mt-8 flex max-w-xl gap-3">
      <input
        type="search"
        name="q"
        defaultValue={term}
        placeholder="Search products"
        className="min-w-0 flex-1 rounded border border-black/15 px-4 py-2 text-base"
      />
      <button
        type="submit"
        className="rounded bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-black/80"
      >
        Search
      </button>
    </form>
  );
}

function CollectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string | null;
  count: number;
}) {
  return (
    <header className="max-w-2xl">
      <h1 className="text-6xl font-black tracking-tight md:text-8xl">{title}</h1>
      {description ? (
        <p className="mt-6 text-base leading-relaxed text-black/70 md:text-lg">{description}</p>
      ) : null}
      <p className="mt-3 text-sm text-black/50">
        {count} {count === 1 ? "product" : "products"}
      </p>
    </header>
  );
}

function SearchHeader({ term, totalCount }: { term: string; totalCount: number }) {
  return (
    <header className="max-w-2xl">
      <h1 className="text-6xl font-black tracking-tight md:text-8xl">Search</h1>
      {term ? (
        <p className="mt-6 text-base leading-relaxed text-black/70 md:text-lg">
          Results for &quot;{term}&quot;
        </p>
      ) : null}
      <p className="mt-3 text-sm text-black/50">
        {totalCount} {totalCount === 1 ? "product" : "products"}
      </p>
    </header>
  );
}

function BrowseToolbar({
  clearPath,
  sortOptions,
  sortValue,
  hasActiveFilters,
  isLoading,
}: {
  clearPath: string;
  sortOptions: Array<{ label: string; value: string }>;
  sortValue: string;
  hasActiveFilters: boolean;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 pb-4">
      <div className="flex items-center gap-4">
        {hasActiveFilters ? (
          <Link href={clearPath} className="text-sm text-black/60 underline hover:text-black">
            Clear all
          </Link>
        ) : null}
        <span role="status" aria-live="polite" aria-atomic={true} className="text-sm text-black/40">
          {isLoading ? "Updating..." : ""}
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-black/60">Sort by</span>
        <select
          name="sort_by"
          defaultValue={sortValue}
          disabled={isLoading}
          onChange={requestFormSubmit}
          className="rounded border border-black/15 bg-white px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sortOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ActiveFilterChips({
  clearPath,
  filters,
  currentParams,
}: {
  clearPath: string;
  filters: ProductFilter[];
  currentParams: URLSearchParams;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {filters.map((filter) => {
        const serialized = JSON.stringify(filter);
        const removalSearch = getFilterRemovalUrl(currentParams, filter);
        const href = removalSearch === "?" ? clearPath : `${clearPath}${removalSearch}`;

        return (
          <Link
            key={serialized}
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-sm hover:bg-black/10"
          >
            {describeFilter(filter)}
            <span aria-hidden="true">&times;</span>
          </Link>
        );
      })}
    </div>
  );
}

function BrowseFilters({
  availableFilters,
  activeFilters,
  disabled,
}: {
  availableFilters: AvailableFilter[];
  activeFilters: ProductFilter[];
  disabled: boolean;
}) {
  return (
    <aside className="hidden w-60 shrink-0 md:block">
      <h2 className="text-sm font-semibold tracking-wider text-black/50 uppercase">Filters</h2>
      <div className="mt-6 space-y-8">
        {availableFilters.map((filter) => (
          <FilterGroup
            key={filter.id}
            filter={filter}
            activeFilters={activeFilters}
            disabled={disabled}
          />
        ))}
      </div>
      <noscript>
        <button
          type="submit"
          className="mt-8 w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
        >
          Apply
        </button>
      </noscript>
    </aside>
  );
}

function FilterGroup({
  filter,
  activeFilters,
  disabled,
}: {
  filter: AvailableFilter;
  activeFilters: ProductFilter[];
  disabled: boolean;
}) {
  const visibleValues = filter.values.filter((value) => value.count > 0);
  if (visibleValues.length === 0) return null;

  const availabilityParamName = "filter.v.availability";
  const isMutuallyExclusive =
    filter.type === "BOOLEAN" ||
    filter.values.some((v) => {
      const entries = filterInputParamEntries(v.input);
      return entries.length === 1 && entries[0].name === availabilityParamName;
    });

  return (
    <fieldset disabled={disabled} className={disabled ? "opacity-60" : undefined}>
      <legend className="text-sm font-semibold">{filter.label}</legend>
      <div className="mt-3 space-y-2">
        {visibleValues.map((value) => {
          const entries = filterInputParamEntries(value.input);
          if (entries.length !== 1) return null;

          const [{ name, value: paramValue }] = entries;
          const isActive = isFilterInputActive(activeFilters, value.input);

          return (
            <label key={value.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={name}
                value={paramValue}
                defaultChecked={isActive}
                onChange={(e) => {
                  if (isMutuallyExclusive && e.currentTarget.checked) {
                    uncheckSiblings(e.currentTarget);
                  }
                  requestFormSubmit(e);
                }}
                className="h-4 w-4 rounded border-black/20 disabled:cursor-not-allowed"
              />
              <span className={isActive ? "font-medium" : ""}>{value.label}</span>
              <span className="ml-auto text-xs text-black/40">({value.count})</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function EmptyResults({
  mode,
  term,
  clearPath,
  hasActiveFilters,
}: {
  mode: "collection" | "search";
  term?: string;
  clearPath: string;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="mt-16 text-center">
      <p className="text-lg text-black/60">
        {mode === "search"
          ? `No products found for "${term ?? ""}".`
          : "No products found matching your filters."}
      </p>
      {hasActiveFilters ? (
        <Link href={clearPath} className="mt-4 inline-block text-sm font-semibold underline">
          Clear all filters
        </Link>
      ) : null}
    </div>
  );
}

function filterInputParamEntries(input: string): Array<{ name: string; value: string }> {
  let filter: ProductFilter;
  try {
    filter = JSON.parse(input) as ProductFilter;
  } catch {
    return [];
  }

  return Array.from(
    serializeCollectionParams({ filters: [filter], sortKey: undefined, reverse: false }),
    ([name, value]) => ({ name, value }),
  );
}

function describeFilter(filter: ProductFilter): string {
  if (filter.tag) return filter.tag;
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.available != null) return filter.available ? "In stock" : "Out of stock";
  if (filter.variantOption) return `${filter.variantOption.name}: ${filter.variantOption.value}`;
  if (filter.price) {
    const { min, max } = filter.price;
    const currencyCode = analyticsShop.currency;
    const minMoney: MoneyV2 | null = min != null ? { amount: String(min), currencyCode } : null;
    const maxMoney: MoneyV2 | null = max != null ? { amount: String(max), currencyCode } : null;

    if (minMoney && !maxMoney) return `${formatMoney(minMoney)}+`;
    if (maxMoney && !minMoney) return `Up to ${formatMoney(maxMoney)}`;
    if (minMoney && maxMoney) return `${formatMoney(minMoney)} - ${formatMoney(maxMoney)}`;
  }
  return "Filter";
}

function buildSearchUrl(pathname: string, term: string) {
  const params = new URLSearchParams();
  params.set("q", term);
  return `${pathname}?${params.toString()}`;
}
