import type { AvailableFilter, ProductFilter } from "@shopify/hydrogen";
import {
  createCollectionReconciler,
  createCollectionStore,
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  serializeCollectionParams,
  type CollectionData,
  type CollectionState,
  type CollectionStore,
} from "@shopify/hydrogen";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";

import { ProductCard, type ProductCardData } from "./ProductCard";

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

function onSortChange(event: Event) {
  (event.target as HTMLSelectElement).form?.requestSubmit();
}

function uncheckSiblings(checkbox: HTMLInputElement) {
  const form = checkbox.form;
  if (!form) return;
  for (const el of form.elements) {
    if (
      el instanceof HTMLInputElement &&
      el !== checkbox &&
      el.name === checkbox.name &&
      el.type === "checkbox"
    ) {
      el.checked = false;
    }
  }
}

function describeFilter(filter: ProductFilter): string {
  if (filter.tag) return filter.tag;
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.available != null) return filter.available ? "In stock" : "Out of stock";
  if (filter.variantOption) return `${filter.variantOption.name}: ${filter.variantOption.value}`;
  if (filter.price) {
    const { min, max } = filter.price;
    if (min != null && max == null) return `$${min}+`;
    if (max != null && min == null) return `Up to $${max}`;
    if (min != null && max != null) return `$${min} - $${max}`;
  }
  return "Filter";
}

function visibleValues(filter: AvailableFilter) {
  return filter.values.filter((value) => value.count > 0);
}

export function CollectionBrowser(props: {
  title: string;
  description: string | null;
  handle: string;
  dataSearch: string;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [urlSearchOverride, setUrlSearchOverride] = createSignal<string | null>(null);
  const readUrlSearch = () => urlSearchOverride() ?? location.search;
  const collectionData = (): CollectionData => ({
    handle: props.handle,
    dataSearch: props.dataSearch,
  });
  const [store, setStore] = createSignal<CollectionStore>(
    createCollectionStore({ data: collectionData(), urlSearch: readUrlSearch() }),
  );
  const [state, setState] = createSignal<CollectionState>(store().getState());

  const reconciler = createCollectionReconciler(
    {
      getStore: store,
      readUrlSearch,
      emitChange: handleBrowseChange,
    },
    readUrlSearch(),
  );

  store().setOnBrowseChange(() => reconciler.handleBrowseChange());

  createEffect(() => {
    const nextHandle = props.handle;
    if (store().getState().handle === nextHandle) return;
    store().setOnBrowseChange(null);
    const nextStore = createCollectionStore({
      data: collectionData(),
      urlSearch: readUrlSearch(),
    });
    nextStore.setOnBrowseChange(() => reconciler.handleBrowseChange());
    reconciler.reset(readUrlSearch());
    setStore(nextStore);
  });

  createEffect(() => {
    const currentStore = store();
    setState(currentStore.getState());
    const unsubscribe = currentStore.subscribe(setState);
    onCleanup(unsubscribe);
  });

  createEffect(() => {
    reconciler.reconcile(readUrlSearch(), props.dataSearch);
  });

  async function handleBrowseChange(search: string) {
    setUrlSearchOverride(search.startsWith("?") ? search.slice(1) : search);
    try {
      await navigate(`${location.pathname}${search}`, {
        replace: readUrlSearch().length > 0,
        scroll: false,
      });
    } finally {
      setUrlSearchOverride(null);
    }
  }

  function formProps() {
    return {
      onSubmit: (event: SubmitEvent) => {
        event.preventDefault();
        store().handleFormSubmit(event);
      },
    };
  }

  function onFilterChange(event: Event, filter: AvailableFilter) {
    const checkbox = event.target as HTMLInputElement;
    if (isMutuallyExclusive(filter) && checkbox.checked) {
      uncheckSiblings(checkbox);
    }
    checkbox.form?.requestSubmit();
  }

  function isMutuallyExclusive(filter: AvailableFilter): boolean {
    return (
      filter.type === "BOOLEAN" ||
      filter.values.some((value) => {
        const entries = filterInputToParamEntries(value.input);
        return entries.length === 1 && entries[0].name === "filter.v.availability";
      })
    );
  }

  function filterInputToParamEntries(input: string): Array<{ name: string; value: string }> {
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

  const currentSortValue = createMemo(() => {
    const sortKey = state().sortKey;
    return sortKey !== undefined
      ? getSortByValue(sortKey, state().reverse)
      : getSortByValue("COLLECTION_DEFAULT", false);
  });
  const hasActiveFilters = createMemo(() => state().filters.length > 0);
  const isLoading = createMemo(() => state().status === "loading");
  const currentParams = createMemo(() => serializeCollectionParams(state()));
  const collectionPath = () => location.pathname;

  function filterRemovalHref(filter: ProductFilter): string {
    const removal = getFilterRemovalUrl(currentParams(), filter);
    return removal === "?" ? collectionPath() : `${collectionPath()}${removal}`;
  }

  return (
    <main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <header class="max-w-2xl">
        <h1 class="text-6xl font-black tracking-tight md:text-8xl">{props.title}</h1>
        <Show when={props.description}>
          <p class="mt-6 text-base leading-relaxed text-black/70 md:text-lg">{props.description}</p>
        </Show>
        <p class="mt-3 text-sm text-black/50">
          {props.products.length} {props.products.length === 1 ? "product" : "products"}
        </p>
      </header>

      <form {...formProps()} method="get" action={collectionPath()} class="mt-12 flex gap-12">
        <Show when={props.availableFilters.length > 0}>
          <aside class="hidden w-60 shrink-0 md:block">
            <h2 class="text-sm font-semibold tracking-wider text-black/50 uppercase">Filters</h2>
            <div class="mt-6 space-y-8">
              <For each={props.availableFilters}>
                {(filter) => (
                  <Show when={visibleValues(filter).length > 0}>
                    <fieldset disabled={isLoading()} class={isLoading() ? "opacity-60" : undefined}>
                      <legend class="text-sm font-semibold">{filter.label}</legend>
                      <div class="mt-3 space-y-2">
                        <For each={visibleValues(filter)}>
                          {(value) => {
                            const entry = filterInputToParamEntries(value.input)[0];
                            return (
                              <Show when={entry}>
                                {(filterEntry) => (
                                  <label class="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      name={filterEntry().name}
                                      value={filterEntry().value}
                                      checked={isFilterInputActive(state().filters, value.input)}
                                      class="h-4 w-4 rounded border-black/20 disabled:cursor-not-allowed"
                                      onChange={(event) => onFilterChange(event, filter)}
                                    />
                                    <span
                                      class={
                                        isFilterInputActive(state().filters, value.input)
                                          ? "font-medium"
                                          : ""
                                      }
                                    >
                                      {value.label}
                                    </span>
                                    <span class="ml-auto text-xs text-black/40">
                                      ({value.count})
                                    </span>
                                  </label>
                                )}
                              </Show>
                            );
                          }}
                        </For>
                      </div>
                    </fieldset>
                  </Show>
                )}
              </For>
            </div>
            <noscript>
              <button
                type="submit"
                class="mt-8 w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
              >
                Apply
              </button>
            </noscript>
          </aside>
        </Show>

        <div class="flex-1">
          <div class="flex items-center justify-between border-b border-black/10 pb-4">
            <div class="flex items-center gap-4">
              <Show when={hasActiveFilters()}>
                <A href={collectionPath()} class="text-sm text-black/60 underline hover:text-black">
                  Clear all
                </A>
              </Show>
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                class="text-sm text-black/40"
              >
                {isLoading() ? "Updating..." : ""}
              </span>
            </div>

            <label class="flex items-center gap-2 text-sm">
              <span class="text-black/60">Sort by</span>
              <select
                name="sort_by"
                value={currentSortValue()}
                disabled={isLoading()}
                class="rounded border border-black/15 bg-white px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                onChange={onSortChange}
              >
                <For each={SORT_OPTIONS}>
                  {(option) => <option value={option.value}>{option.label}</option>}
                </For>
              </select>
            </label>
          </div>

          <Show when={hasActiveFilters()}>
            <div class="mt-4 flex flex-wrap gap-2">
              <For each={state().filters}>
                {(filter) => (
                  <A
                    href={filterRemovalHref(filter)}
                    class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-sm hover:bg-black/10"
                  >
                    {describeFilter(filter)}
                    <span aria-hidden="true">x</span>
                  </A>
                )}
              </For>
            </div>
          </Show>

          <section
            class={
              isLoading()
                ? "mt-8 grid grid-cols-2 gap-x-6 gap-y-12 opacity-50 transition-opacity duration-200 md:grid-cols-3"
                : "mt-8 grid grid-cols-2 gap-x-6 gap-y-12 opacity-100 transition-opacity duration-200 md:grid-cols-3"
            }
          >
            <For each={props.products}>{(product) => <ProductCard product={product} />}</For>
          </section>

          <Show when={props.products.length === 0 && !isLoading()}>
            <div class="mt-16 text-center">
              <p class="text-lg text-black/60">No products found matching your filters.</p>
              <Show when={hasActiveFilters()}>
                <A
                  href={collectionPath()}
                  class="mt-4 inline-block text-sm font-semibold underline"
                >
                  Clear all filters
                </A>
              </Show>
            </div>
          </Show>
        </div>
      </form>
    </main>
  );
}
