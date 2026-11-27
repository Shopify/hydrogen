<script setup lang="ts">
import type { AvailableFilter } from "@shopify/hydrogen";
import { normalizeCollectionSearch } from "@shopify/hydrogen";

import type { ProductCardData } from "~/components/ProductCard.vue";
import { CollectionProvider } from "~/storefront/collection";
import { collectionRouteSearch } from "~/utils/collection-route-search";
import { routeSearchTerm } from "~/utils/route-search-term";

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

// Take the term from the URL, not from the data: Vue Router updates the URL before the new
// results load. A new handle replaces the store, which aborts pending search update events.
// With the old handle, the store would settle with the results of the old term.
const routeTerm = computed(() => routeSearchTerm(route));
const collectionData = computed(() => ({
  handle: `search:${routeTerm.value}`,
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
    // A newer change or Back/Forward may own the override now.
    if (urlSearchOverride.value === normalizedSearch) {
      urlSearchOverride.value = null;
      props.setQueryWatchSuppressed(false);
    }
  }
}

// Back/Forward during a change: release the pinned target so the provider syncs to the new URL,
// which aborts the pending update events. The page's query watch then refetches, which cancels the
// request for the abandoned target, so its result can't settle the store.
function releaseOverride() {
  urlSearchOverride.value = null;
  props.setQueryWatchSuppressed(false);
}
onMounted(() => window.addEventListener("popstate", releaseOverride));
onBeforeUnmount(() => window.removeEventListener("popstate", releaseOverride));
</script>

<template>
  <CollectionProvider :data="collectionData" :url-search="urlSearch" @change="handleChange">
    <SearchBrowserContent
      :term="term"
      :total-count="totalCount"
      :products="products"
      :available-filters="availableFilters"
      :search-path="searchPath"
    />
  </CollectionProvider>
</template>
