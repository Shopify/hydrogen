import type { AvailableFilter, MoneyV2, ProductFilter } from "@shopify/hydrogen";
import {
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  serializeCollectionParams,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import { useEffect } from "react";
import { Form, useLocation, useNavigate, useSearchParams } from "react-router";

import { ProductCard, type ProductCardData } from "../components/ProductCard";
import { AnalyticsEvent, analyticsShop, getAnalytics } from "../lib/analytics";
import { collectionFilterNavigateOptions } from "../lib/collection";
import { formatMoney } from "../lib/money";
import { querySearch } from "../lib/search";
import { storefrontClientContext } from "../lib/storefront";
import type { Route } from "./+types/search";

const SORT_OPTIONS = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];

export function meta({ data }: Route.MetaArgs) {
  const term = data?.term;
  return [{ title: term ? `Search results for "${term}" - Mock.shop` : "Search - Mock.shop" }];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const url = new URL(request.url);
  const result = await querySearch({
    storefrontClient,
    searchParams: url.searchParams,
  });

  return {
    ...result,
    dataSearch: url.searchParams.toString(),
  };
}

export default function Search({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <CollectionProvider
      data={{
        // Key the store on the search term so it's rebuilt with fresh
        // filter/sort state whenever the query changes. A constant handle would
        // carry the previous term's filters and wedge the UI in "loading".
        handle: `search:${loaderData.term}`,
        dataSearch: loaderData.dataSearch,
      }}
      urlSearch={searchParams.toString()}
      onChange={(search) => navigate({ search }, collectionFilterNavigateOptions(searchParams))}
    >
      <SearchAnalytics term={loaderData.term} totalCount={loaderData.totalCount} />
      <SearchPage
        term={loaderData.term}
        products={loaderData.products}
        availableFilters={loaderData.availableFilters}
        totalCount={loaderData.totalCount}
      />
    </CollectionProvider>
  );
}

function SearchAnalytics({ term, totalCount }: { term: string; totalCount: number }) {
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
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- fire only on new search term
  }, [term]);

  return null;
}

function requestFormSubmit(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

function SearchPage({
  term,
  products,
  availableFilters,
  totalCount,
}: {
  term: string;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
  totalCount: number;
}) {
  const { pathname } = useLocation();
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const currentSortValue =
    state.sortKey === "PRICE"
      ? getSortByValue("PRICE", state.reverse)
      : getSortByValue("RELEVANCE", false);
  const hasActiveFilters = state.filters.length > 0;
  const isLoading = state.status === "loading";
  const searchAction = buildSearchUrl(pathname, term);

  return (
    <main className="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <SearchHeader term={term} totalCount={totalCount} />

      <Form method="get" action={pathname} className="mt-8 flex max-w-xl gap-3">
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
      </Form>

      {!term ? (
        <p className="mt-12 text-lg text-black/60">Enter a search term to find products.</p>
      ) : (
        <form
          {...formProps()}
          // See collection route: key remounts uncontrolled filter inputs when browse
          // state changes; term prefix resets checkboxes on a new search query.
          key={`${term}|${serializeCollectionParams(state).toString()}`}
          method="get"
          // No action: a GET form submits to the current URL, so the hidden `q`
          // input plus the checked filters rebuild the query string (no-JS path).
          className="mt-12 flex gap-12"
        >
          <input type="hidden" name="q" value={term} />

          {availableFilters.length > 0 ? (
            <SearchFilters
              availableFilters={availableFilters}
              activeFilters={state.filters}
              disabled={isLoading}
            />
          ) : null}

          <div className="flex-1">
            <SearchToolbar
              searchPath={searchAction}
              sortValue={currentSortValue}
              hasActiveFilters={hasActiveFilters}
              isLoading={isLoading}
            />

            {hasActiveFilters ? (
              <ActiveFilterChips
                searchPath={searchAction}
                filters={state.filters}
                currentParams={serializeCollectionParams(state)}
              />
            ) : null}

            <section
              className={`mt-8 grid grid-cols-2 gap-x-6 gap-y-12 transition-opacity duration-200 md:grid-cols-3 ${isLoading ? "opacity-50" : "opacity-100"}`}
            >
              {products.map((product) => (
                <ProductCard key={product.handle} product={product} />
              ))}
            </section>

            {products.length === 0 && !isLoading ? (
              <div className="mt-16 text-center">
                <p className="text-lg text-black/60">No products found for "{term}".</p>
                {hasActiveFilters ? (
                  <a
                    href={searchAction}
                    className="mt-4 inline-block text-sm font-semibold underline"
                  >
                    Clear all filters
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </form>
      )}
    </main>
  );
}

function SearchHeader({ term, totalCount }: { term: string; totalCount: number }) {
  return (
    <header className="max-w-2xl">
      <h1 className="text-6xl font-black tracking-tight md:text-8xl">Search</h1>
      {term ? (
        <p className="mt-6 text-base leading-relaxed text-black/70 md:text-lg">
          Results for "{term}"
        </p>
      ) : null}
      <p className="mt-3 text-sm text-black/50">
        {totalCount} {totalCount === 1 ? "product" : "products"}
      </p>
    </header>
  );
}

function SearchToolbar({
  searchPath,
  sortValue,
  hasActiveFilters,
  isLoading,
}: {
  searchPath: string;
  sortValue: string;
  hasActiveFilters: boolean;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 pb-4">
      <div className="flex items-center gap-4">
        {hasActiveFilters ? (
          <a href={searchPath} className="text-sm text-black/60 underline hover:text-black">
            Clear all
          </a>
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
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ActiveFilterChips({
  searchPath,
  filters,
  currentParams,
}: {
  searchPath: string;
  filters: ProductFilter[];
  currentParams: URLSearchParams;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {filters.map((filter) => {
        const serialized = JSON.stringify(filter);
        const removalSearch = getFilterRemovalUrl(currentParams, filter);
        const href = removalSearch === "?" ? searchPath : `${searchPath}&${removalSearch.slice(1)}`;

        return (
          <a
            key={serialized}
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-sm hover:bg-black/10"
          >
            {describeFilter(filter)}
            <span aria-hidden="true">&times;</span>
          </a>
        );
      })}
    </div>
  );
}

function SearchFilters({
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
  const visibleValues = filter.values.filter((v) => v.count > 0);
  if (visibleValues.length === 0) return null;

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
                onChange={requestFormSubmit}
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
    const range: MoneyV2[] = [];
    if (min != null) range.push({ amount: String(min), currencyCode });
    if (max != null) range.push({ amount: String(max), currencyCode });
    if (range.length === 0) return "Filter";

    const formatted = formatMoney(range);
    if (min != null && max == null) return `${formatted}+`;
    if (max != null && min == null) return `Up to ${formatted}`;
    return formatted;
  }
  return "Filter";
}

function buildSearchUrl(pathname: string, term: string) {
  const params = new URLSearchParams();
  params.set("q", term);
  return `${pathname}?${params.toString()}`;
}
