<script setup lang="ts">
import { normalizeCollectionSearch } from "@shopify/hydrogen";

import { collectionRouteSearch } from "~/utils/collection-route-search";
import { toFetchQuery } from "~/utils/fetch-query";

const route = useRoute();
const term = computed(() => (route.query.q as string)?.trim() ?? "");

const searchQueryKey = computed(() => collectionRouteSearch(route));
const fetchSearchOverride = ref<string | null>(null);

const { data, refresh } = await useFetch("/api/search", {
  key: computed(() => `search-${term.value}`),
  query: computed(() => toFetchQuery(fetchSearchOverride.value ?? collectionRouteSearch(route))),
  watch: [term],
});

const suppressQueryKeyWatch = ref(false);

watch(searchQueryKey, (key) => {
  if (suppressQueryKeyWatch.value) return;
  void refreshSearch(key ? `?${key}` : "");
});

async function refreshSearch(search: string) {
  fetchSearchOverride.value = normalizeCollectionSearch(search);
  try {
    await refresh();
  } finally {
    fetchSearchOverride.value = null;
  }
}

const searchData = computed(
  () =>
    data.value ?? { term: "", dataSearch: "", products: [], availableFilters: [], totalCount: 0 },
);

useHead({
  title: () =>
    searchData.value.term
      ? `Search results for "${searchData.value.term}" — Mock.shop`
      : "Search — Mock.shop",
});
</script>

<template>
  <SearchBrowser
    :term="searchData.term"
    :total-count="searchData.totalCount"
    :data-search="searchData.dataSearch"
    :products="searchData.products"
    :available-filters="searchData.availableFilters"
    :refresh-search="refreshSearch"
    :set-query-watch-suppressed="
      (value) => {
        suppressQueryKeyWatch = value;
      }
    "
  />
</template>
