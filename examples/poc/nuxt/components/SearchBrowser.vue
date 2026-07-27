<script setup lang="ts">
import type { AvailableFilter } from "@shopify/hydrogen";
import { normalizeCollectionSearch } from "@shopify/hydrogen";

import type { ProductCardData } from "~/components/ProductCard.vue";
import { provideCollectionStore } from "~/storefront/collection";
import { collectionRouteSearch } from "~/utils/collection-route-search";

const props = defineProps<{
  term: string;
  totalCount: number;
  dataSearch: string;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
  refreshSearch: (search: string) => Promise<void>;
  setQueryWatchSuppressed: (value: boolean) => void;
}>();

const route = useRoute();

const urlSearchOverride = ref<string | null>(null);
const urlSearch = computed(() => urlSearchOverride.value ?? collectionRouteSearch(route));

const collectionData = computed(() => ({
  handle: `search:${props.term}`,
  dataSearch: props.dataSearch,
}));

const searchPath = computed(() => {
  const params = new URLSearchParams({ q: props.term });
  return `/search?${params.toString()}`;
});

async function handleChange(search: string) {
  const normalizedSearch = normalizeCollectionSearch(search);
  props.setQueryWatchSuppressed(true);
  urlSearchOverride.value = normalizedSearch;
  try {
    await navigateTo(`${route.path}${search}`, { replace: urlSearch.value.length > 0 });
    await props.refreshSearch(search);
  } finally {
    urlSearchOverride.value = null;
    props.setQueryWatchSuppressed(false);
  }
}

provideCollectionStore({
  data: collectionData,
  urlSearch,
  onChange: handleChange,
});
</script>

<template>
  <SearchBrowserContent
    :term="term"
    :total-count="totalCount"
    :products="products"
    :available-filters="availableFilters"
    :search-path="searchPath"
  />
</template>
