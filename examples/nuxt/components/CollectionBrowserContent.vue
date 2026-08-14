<script setup lang="ts">
import type { AvailableFilter, ProductFilter } from "@shopify/hydrogen";
import {
  getSortByValue,
  getFilterRemovalUrl,
  isFilterInputActive,
  serializeCollectionParams,
} from "@shopify/hydrogen";

import type { ProductCardData } from "~/components/ProductCard.vue";
import { useCollection, useCollectionForm } from "~/storefront/collection";

const props = defineProps<{
  title: string;
  description: string | null;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
  collectionPath: string;
}>();

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

const state = useCollection();
const { formProps } = useCollectionForm();
const fProps = formProps();

const currentSortValue = computed(() => {
  const s = state.value;
  return s.sortKey
    ? getSortByValue(s.sortKey, s.reverse)
    : getSortByValue("COLLECTION_DEFAULT", false);
});

const hasActiveFilters = computed(() => state.value.filters.length > 0);
const isLoading = computed(() => state.value.status === "loading");
const currentParams = computed(() => serializeCollectionParams(state.value));

function onSortChange(event: Event) {
  (event.target as HTMLSelectElement).form?.requestSubmit();
}

function onFilterChange(event: Event, filter: AvailableFilter) {
  const checkbox = event.target as HTMLInputElement;
  if (isMutuallyExclusive(filter) && checkbox.checked) {
    uncheckSiblings(checkbox);
  }
  checkbox.form?.requestSubmit();
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

function isMutuallyExclusive(filter: AvailableFilter): boolean {
  return (
    filter.type === "BOOLEAN" ||
    filter.values.some((v) => {
      const entries = filterInputToParamEntries(v.input);
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
    if (min != null && max != null) return `$${min} – $${max}`;
  }
  return "Filter";
}

function filterRemovalHref(filter: ProductFilter): string {
  const removal = getFilterRemovalUrl(currentParams.value, filter);
  return removal === "?" ? props.collectionPath : `${props.collectionPath}${removal}`;
}

function visibleValues(filter: AvailableFilter) {
  return filter.values.filter((v) => v.count > 0);
}
</script>

<template>
  <main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
    <!-- Header -->
    <header class="max-w-2xl">
      <h1 class="text-6xl font-black tracking-tight md:text-8xl">{{ title }}</h1>
      <p v-if="description" class="mt-6 text-base leading-relaxed text-black/70 md:text-lg">
        {{ description }}
      </p>
      <p class="mt-3 text-sm text-black/50">
        {{ products.length }} {{ products.length === 1 ? "product" : "products" }}
      </p>
    </header>

    <!-- Browse form -->
    <form v-bind="fProps" method="get" :action="collectionPath" class="mt-12 flex gap-12">
      <!-- Filter sidebar -->
      <aside v-if="availableFilters.length > 0" class="hidden w-60 shrink-0 md:block">
        <h2 class="text-sm font-semibold tracking-wider text-black/50 uppercase">Filters</h2>
        <div class="mt-6 space-y-8">
          <fieldset
            v-for="filter in availableFilters"
            :key="filter.id"
            :disabled="isLoading"
            :class="isLoading ? 'opacity-60' : undefined"
          >
            <template v-if="visibleValues(filter).length > 0">
              <legend class="text-sm font-semibold">{{ filter.label }}</legend>
              <div class="mt-3 space-y-2">
                <label
                  v-for="value in visibleValues(filter)"
                  :key="value.id"
                  class="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    :name="filterInputToParamEntries(value.input)[0]?.name"
                    :value="filterInputToParamEntries(value.input)[0]?.value"
                    :checked="isFilterInputActive(state.filters, value.input)"
                    class="h-4 w-4 rounded border-black/20 disabled:cursor-not-allowed"
                    @change="onFilterChange($event, filter)"
                  />
                  <span
                    :class="isFilterInputActive(state.filters, value.input) ? 'font-medium' : ''"
                  >
                    {{ value.label }}
                  </span>
                  <span class="ml-auto text-xs text-black/40">({{ value.count }})</span>
                </label>
              </div>
            </template>
          </fieldset>
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

      <!-- Main content -->
      <div class="flex-1">
        <!-- Toolbar -->
        <div class="flex items-center justify-between border-b border-black/10 pb-4">
          <div class="flex items-center gap-4">
            <NuxtLink
              v-if="hasActiveFilters"
              :to="collectionPath"
              class="text-sm text-black/60 underline hover:text-black"
            >
              Clear all
            </NuxtLink>
            <span role="status" aria-live="polite" aria-atomic="true" class="text-sm text-black/40">
              {{ isLoading ? "Updating..." : "" }}
            </span>
          </div>

          <label class="flex items-center gap-2 text-sm">
            <span class="text-black/60">Sort by</span>
            <select
              name="sort_by"
              :value="currentSortValue"
              :disabled="isLoading"
              class="rounded border border-black/15 bg-white px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              @change="onSortChange"
            >
              <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <!-- Active filter chips -->
        <div v-if="hasActiveFilters" class="mt-4 flex flex-wrap gap-2">
          <NuxtLink
            v-for="filter in state.filters"
            :key="JSON.stringify(filter)"
            :to="filterRemovalHref(filter)"
            class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-sm hover:bg-black/10"
          >
            {{ describeFilter(filter) }}
            <span aria-hidden="true">&times;</span>
          </NuxtLink>
        </div>

        <!-- Product grid -->
        <section
          class="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 transition-opacity duration-200 md:grid-cols-3"
          :class="isLoading ? 'opacity-50' : 'opacity-100'"
        >
          <ProductCard v-for="product in products" :key="product.handle" :product="product" />
        </section>

        <!-- Empty state -->
        <div v-if="products.length === 0 && !isLoading" class="mt-16 text-center">
          <p class="text-lg text-black/60">No products found matching your filters.</p>
          <NuxtLink
            v-if="hasActiveFilters"
            :to="collectionPath"
            class="mt-4 inline-block text-sm font-semibold underline"
          >
            Clear all filters
          </NuxtLink>
        </div>
      </div>
    </form>
  </main>
</template>
