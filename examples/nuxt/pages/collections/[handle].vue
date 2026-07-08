<script setup lang="ts">
import { normalizeCollectionSearch } from "@shopify/hydrogen";

import { AnalyticsEvent, analyticsShop, getAnalytics } from "~/storefront/analytics";
import { collectionRouteSearch } from "~/utils/collection-route-search";
import { toFetchQuery } from "~/utils/fetch-query";

const route = useRoute();
const handle = computed(() => route.params.handle as string);

// Browse-param changes for back/forward only — filter toggles go through handleChange.
const collectionQueryKey = computed(() => collectionRouteSearch(route));

// Pin the fetch target while handleChange's refresh() runs. Without this,
// collectionRouteSearch(route) inside the fetcher can read a stale route
// (navigateTo updates the URL bar first), so dataSearch disagrees with
// urlSearch and the collection store stays in loading forever.
const fetchSearchOverride = ref<string | null>(null);
const collectionApiPath = computed(
  () => `/api/collections/${encodeURIComponent(handle.value)}` as const,
);

const { data, refresh } = await useFetch(() => collectionApiPath.value, {
  key: computed(() => `collection-${handle.value}`),
  query: computed(() => toFetchQuery(fetchSearchOverride.value ?? collectionRouteSearch(route))),
  // Only watch handle — filter/sort refetch via refreshCollection() from handleChange.
  // Also watching collectionQueryKey here races that explicit refresh: two concurrent
  // fetches can finish out of order and tag dataSearch with a stale route snapshot
  // while urlSearch already moved, so the collection store never settles.
  watch: [handle],
});

// handleChange already calls refreshCollection; suppress this watch during that
// window so back/forward still refetch but in-app filter toggles don't double-fetch.
const suppressQueryKeyWatch = ref(false);

watch(collectionQueryKey, (key) => {
  if (suppressQueryKeyWatch.value) return;
  void refreshCollection(key ? `?${key}` : "");
});

if (!data.value?.collection) {
  throw createError({ statusCode: 404, statusMessage: "Collection not found" });
}

const collection = computed(() => {
  const collectionValue = data.value?.collection;
  if (!collectionValue) {
    throw createError({ statusCode: 404, statusMessage: "Collection not found" });
  }

  return collectionValue;
});

function publishCollectionView() {
  const analytics = getAnalytics();
  if (!analytics) return;

  analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
    collection: {
      id: collection.value.id,
      handle: collection.value.handle,
    },
    url: window.location.href,
    shop: analyticsShop,
  });
}

onMounted(() => {
  publishCollectionView();
  watch(() => collection.value.handle, publishCollectionView);
});

async function refreshCollection(search: string) {
  fetchSearchOverride.value = normalizeCollectionSearch(search);
  try {
    await refresh();
  } finally {
    fetchSearchOverride.value = null;
  }
}

useHead({ title: () => `${collection.value.title} — Mock.shop` });
</script>

<template>
  <CollectionBrowser
    :title="collection.title"
    :description="collection.description"
    :handle="collection.handle"
    :data-search="data?.dataSearch ?? ''"
    :products="collection.products.nodes"
    :available-filters="collection.products.filters"
    :refresh-collection="refreshCollection"
    :set-query-watch-suppressed="
      (value) => {
        suppressQueryKeyWatch = value;
      }
    "
  />
</template>
