<script setup lang="ts">
import type { AvailableFilter } from "@shopify/hydrogen";
import { normalizeCollectionSearch } from "@shopify/hydrogen";

import type { ProductCardData } from "~/components/ProductCard.vue";
import { CollectionProvider } from "~/storefront/collection";
import { collectionRouteSearch } from "~/utils/collection-route-search";

const props = defineProps<{
  title: string;
  description: string | null;
  id: string;
  handle: string;
  dataSearch: string;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
  refreshCollection: (search: string) => Promise<void>;
  setQueryWatchSuppressed: (value: boolean) => void;
}>();

const route = useRoute();

// CollectionProvider settles when dataSearch === urlSearch. Pin urlSearch to the
// target we're navigating to — collectionRouteSearch(route) can lag behind the
// address bar for a tick after navigateTo, which leaves filters stuck loading.
const urlSearchOverride = ref<string | null>(null);

const urlSearch = computed(() => urlSearchOverride.value ?? collectionRouteSearch(route));

const collectionData = computed(() => ({
  handle: props.handle,
  dataSearch: props.dataSearch,
}));

async function handleChange(search: string) {
  // Use the kit's search string in the URL bar — not router { query } (dots nest in route.query).
  const normalizedSearch = normalizeCollectionSearch(search);
  // Overrides + suppress keep dataSearch/urlSearch aligned and avoid a second
  // useAsyncData refetch while navigateTo + refresh() are in flight (see page).
  props.setQueryWatchSuppressed(true);
  urlSearchOverride.value = normalizedSearch;
  try {
    await navigateTo(`${route.path}${search}`, { replace: urlSearch.value.length > 0 });
    await props.refreshCollection(search);
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
    <CollectionBrowserContent
      :title="title"
      :description="description"
      :collection="{ id, handle }"
      :products="products"
      :available-filters="availableFilters"
      :collection-path="route.path"
    />
  </CollectionProvider>
</template>
