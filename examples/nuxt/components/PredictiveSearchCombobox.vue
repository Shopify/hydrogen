<script setup lang="ts">
import {
  getPredictiveSearchItemUrl,
  type PredictiveSearchData,
  type PredictiveSearchResourceItem,
  type MoneyV2,
} from "@shopify/hydrogen";

import { formatMoney } from "~/storefront/money";
import {
  usePredictiveSearch,
  usePredictiveSearchActions,
  usePredictiveSearchForm,
} from "~/storefront/predictive-search";
import { routeTemplates } from "~/utils/route-templates";

type PredictiveSearchItems = PredictiveSearchData["items"];

const SEARCH_ENDPOINT = "/search";
const THUMBNAIL_SIZE_IN_PIXELS = 56;

const isOpen = ref(false);
const { clear, search } = usePredictiveSearchActions();
const { formProps, register } = usePredictiveSearchForm();
const state = usePredictiveSearch();

const error = computed(() => state.value.error);
const result = computed(() => state.value.result);
const status = computed(() => state.value.status);
const term = computed(() => state.value.term);

function closeSearch() {
  isOpen.value = false;
  clear();
}

function handleBlur(event: FocusEvent) {
  const nextFocusTarget = event.relatedTarget;
  if (nextFocusTarget instanceof Node && (event.currentTarget as Node).contains(nextFocusTarget)) {
    return;
  }
  isOpen.value = false;
}

function handleFocus(event: FocusEvent) {
  isOpen.value = true;
  void search((event.currentTarget as HTMLInputElement).value);
}

function getSearchPageUrl(searchTerm: string): string {
  const trimmed = searchTerm.trim();
  if (!trimmed) return SEARCH_ENDPOINT;
  const searchParams = new URLSearchParams({ q: trimmed });
  return `${SEARCH_ENDPOINT}?${searchParams}`;
}

function getPredictiveSearchResourceUrl(
  item: PredictiveSearchResourceItem,
  searchTerm: string,
): string {
  return getPredictiveSearchItemUrl(item, {
    routes: routeTemplates,
    term: searchTerm,
  });
}

function variantPrice(product: PredictiveSearchItems["products"][number]): MoneyV2 | undefined {
  return product.selectedOrFirstAvailableVariant?.price;
}

function variantImageUrl(product: PredictiveSearchItems["products"][number]): string | undefined {
  return product.selectedOrFirstAvailableVariant?.image?.url;
}

function variantImageAlt(product: PredictiveSearchItems["products"][number]): string {
  return product.selectedOrFirstAvailableVariant?.image?.altText ?? product.title;
}

const showPanel = computed(() => isOpen.value && term.value);
</script>

<template>
  <div class="relative" @blur="handleBlur">
    <form v-bind="formProps({ onSubmit: closeSearch })" class="flex items-center gap-1">
      <input
        v-bind="
          register('query', {
            'aria-label': 'Search products',
            placeholder: 'Search',
            onInput: () => (isOpen = true),
            onFocus: handleFocus,
            class:
              'w-28 rounded border border-black/15 px-2 py-1 text-sm transition-[width] focus:w-44 focus:outline-none',
          })
        "
      />
      <button type="submit" aria-label="Search" class="hover:opacity-60">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>

    <div
      v-if="showPanel"
      role="region"
      aria-label="Predictive search results"
      class="absolute right-0 z-50 mt-2 max-h-[75vh] w-80 overflow-y-auto rounded-xl border border-black/10 bg-white p-4 shadow-2xl"
    >
      <p v-if="status === 'loading'" class="text-sm text-black/60">Loading…</p>
      <p v-else-if="status === 'error'" class="text-sm text-red-600">{{ error }}</p>
      <p v-else-if="!result.total" class="text-sm text-black/60">
        No results found for "{{ term }}".
      </p>

      <div v-else class="space-y-5">
        <!-- Query suggestions -->
        <section v-if="result.items.queries.length">
          <h2 class="mb-2 text-xs font-bold tracking-wider text-black/40 uppercase">Suggestions</h2>
          <ul class="space-y-1">
            <li v-for="query in result.items.queries" :key="query.text">
              <NuxtLink
                :to="getPredictiveSearchItemUrl(query)"
                class="flex items-center gap-3 rounded-lg p-2 hover:bg-black/5"
                @click="closeSearch"
              >
                <span class="text-sm font-medium">{{ query.text }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Products -->
        <section v-if="result.items.products.length">
          <h2 class="mb-2 text-xs font-bold tracking-wider text-black/40 uppercase">Products</h2>
          <ul class="space-y-1">
            <li v-for="product in result.items.products" :key="product.id">
              <NuxtLink
                :to="getPredictiveSearchResourceUrl(product, term)"
                class="flex items-center gap-3 rounded-lg p-2 hover:bg-black/5"
                @click="closeSearch"
              >
                <img
                  v-if="variantImageUrl(product)"
                  :src="variantImageUrl(product)"
                  :alt="variantImageAlt(product)"
                  :width="THUMBNAIL_SIZE_IN_PIXELS"
                  :height="THUMBNAIL_SIZE_IN_PIXELS"
                  class="size-14 shrink-0 rounded object-cover"
                />
                <span v-else class="block size-14 shrink-0 rounded bg-black/5" />
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium">{{ product.title }}</span>
                  <span v-if="variantPrice(product)" class="block text-xs text-black/50">
                    {{ formatMoney(variantPrice(product)!) }}
                  </span>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Collections -->
        <section v-if="result.items.collections.length">
          <h2 class="mb-2 text-xs font-bold tracking-wider text-black/40 uppercase">Collections</h2>
          <ul class="space-y-1">
            <li v-for="collection in result.items.collections" :key="collection.id">
              <NuxtLink
                :to="getPredictiveSearchResourceUrl(collection, term)"
                class="flex items-center gap-3 rounded-lg p-2 hover:bg-black/5"
                @click="closeSearch"
              >
                <img
                  v-if="collection.image?.url"
                  :src="collection.image.url"
                  :alt="collection.image.altText ?? collection.title"
                  :width="THUMBNAIL_SIZE_IN_PIXELS"
                  :height="THUMBNAIL_SIZE_IN_PIXELS"
                  class="size-14 shrink-0 rounded object-cover"
                />
                <span v-else class="block size-14 shrink-0 rounded bg-black/5" />
                <span class="truncate text-sm font-medium">{{ collection.title }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Pages -->
        <section v-if="result.items.pages.length">
          <h2 class="mb-2 text-xs font-bold tracking-wider text-black/40 uppercase">Pages</h2>
          <ul class="space-y-1">
            <li v-for="page in result.items.pages" :key="page.id">
              <NuxtLink
                :to="getPredictiveSearchResourceUrl(page, term)"
                class="flex items-center gap-3 rounded-lg p-2 hover:bg-black/5"
                @click="closeSearch"
              >
                <span class="truncate text-sm font-medium">{{ page.title }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Articles -->
        <section v-if="result.items.articles.length">
          <h2 class="mb-2 text-xs font-bold tracking-wider text-black/40 uppercase">Articles</h2>
          <ul class="space-y-1">
            <li v-for="article in result.items.articles" :key="article.id">
              <NuxtLink
                :to="getPredictiveSearchResourceUrl(article, term)"
                class="flex items-center gap-3 rounded-lg p-2 hover:bg-black/5"
                @click="closeSearch"
              >
                <img
                  v-if="article.image?.url"
                  :src="article.image.url"
                  :alt="article.image.altText ?? article.title"
                  :width="THUMBNAIL_SIZE_IN_PIXELS"
                  :height="THUMBNAIL_SIZE_IN_PIXELS"
                  class="size-14 shrink-0 rounded object-cover"
                />
                <span v-else class="block size-14 shrink-0 rounded bg-black/5" />
                <span class="truncate text-sm font-medium">{{ article.title }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- View all results -->
        <NuxtLink
          :to="getSearchPageUrl(term)"
          class="block text-sm font-semibold"
          @click="closeSearch"
        >
          View all results for "{{ term }}" →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
