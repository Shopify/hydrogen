<script setup lang="ts">
import type { AvailableFilter } from "@shopify/hydrogen";
import { normalizeCollectionSearch } from "@shopify/hydrogen";

import type { ProductCardData } from "~/components/ProductCard.vue";
import { provideCollectionStore } from "~/storefront/collection";
import { collectionRouteSearch } from "~/utils/collection-route-search";

const props = defineProps<{
  title: string;
  description: string | null;
  handle: string;
  dataSearch: string;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
  refreshCollection: (search: string) => Promise<void>;
  setQueryWatchSuppressed: (value: boolean) => void;
}>();

const route = useRoute();

// The collection store settles when dataSearch === urlSearch. Pin urlSearch to the
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
  <CollectionBrowserContent
    :title="title"
    :description="description"
    :products="products"
    :available-filters="availableFilters"
    :collection-path="route.path"
  />
</template>
