import type { AvailableFilter, MoneyV2, ProductFilter } from "@shopify/hydrogen";
import {
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  serializeCollectionParams,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";

import { ProductCard, type ProductCardData } from "../components/ProductCard";
import { analyticsShop } from "../lib/analytics";
import { collectionFilterNavigateOptions, queryCollection } from "../lib/collection";
import { formatMoney } from "../lib/money";
import { storefrontClientContext } from "../lib/storefront";
import type { Route } from "./+types/collection";

const SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A-Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z-A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, old to new", value: getSortByValue("CREATED", false) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

export function meta({ data }: Route.MetaArgs) {
  const title = data?.collection?.title ?? "Collection";
  return [{ title: `${title} - Progressive collection - Mock.shop` }];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const url = new URL(request.url);
  const result = await queryCollection({
    storefrontClient,
    handle: params.handle,
    searchParams: url.searchParams,
  });

  return {
    ...result,
    dataSearch: url.searchParams.toString(),
  };
}

export default function ProgressiveCollection({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <CollectionProvider
      data={{
        handle: loaderData.collection.handle,
        dataSearch: loaderData.dataSearch,
      }}
      urlSearch={searchParams.toString()}
      onChange={(search) => navigate({ search }, collectionFilterNavigateOptions(searchParams))}
    >
      <CollectionPage
        title={loaderData.collection.title ?? ""}
        description={loaderData.collection.description}
        products={loaderData.products}
        availableFilters={loaderData.availableFilters}
      />
    </CollectionProvider>
  );
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

function CollectionPage({
  title,
  description,
  products,
  availableFilters,
}: {
  title: string;
  description: string | null;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
}) {
  const { pathname } = useLocation();
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const currentSortValue = state.sortKey
    ? getSortByValue(state.sortKey, state.reverse)
    : getSortByValue("COLLECTION_DEFAULT", false);
  const hasActiveFilters = state.filters.length > 0;
  const isLoading = state.status === "loading";

  return (
    <main className="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <CollectionHeader title={title} description={description} products={products} />

      <form {...formProps()} method="get" action={pathname} className="mt-12 flex gap-12">
        {availableFilters.length > 0 ? (
          <CollectionFilters
            availableFilters={availableFilters}
            activeFilters={state.filters}
            disabled={isLoading}
          />
        ) : null}

        <div className="flex-1">
          <CollectionToolbar
            collectionPath={pathname}
            sortValue={currentSortValue}
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoading}
          />

          {hasActiveFilters ? (
            <ActiveFilterChips
              collectionPath={pathname}
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
              <p className="text-lg text-black/60">No products found matching your filters.</p>
              {hasActiveFilters ? (
                <Link to={pathname} className="mt-4 inline-block text-sm font-semibold underline">
                  Clear all filters
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </form>
    </main>
  );
}

function CollectionHeader({
  title,
  description,
  products,
}: {
  title: string;
  description: string | null;
  products: ProductCardData[];
}) {
  const count = products.length;

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

function CollectionToolbar({
  collectionPath,
  sortValue,
  hasActiveFilters,
  isLoading,
}: {
  collectionPath: string;
  sortValue: string;
  hasActiveFilters: boolean;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 pb-4">
      <div className="flex items-center gap-4">
        {hasActiveFilters ? (
          <Link to={collectionPath} className="text-sm text-black/60 underline hover:text-black">
            Clear all
          </Link>
        ) : null}
        <span role="status" aria-live="polite" aria-atomic={true} className="text-sm text-black/40">
          {isLoading ? "Updating..." : ""}
        </span>
      </div>

      <div className="flex items-center gap-3">
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
    </div>
  );
}

function ActiveFilterChips({
  collectionPath,
  filters,
  currentParams,
}: {
  collectionPath: string;
  filters: ProductFilter[];
  currentParams: URLSearchParams;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {filters.map((filter) => {
        const serialized = JSON.stringify(filter);
        const removalSearch = getFilterRemovalUrl(currentParams, filter);
        const href = removalSearch === "?" ? collectionPath : `${collectionPath}${removalSearch}`;

        return (
          <Link
            key={serialized}
            to={href}
            preventScrollReset
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

function CollectionFilters({
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
                checked={isActive}
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
