<script setup lang="ts">
import { gql } from "@shopify/hydrogen";
import type { AvailableFilter, ProductFilter } from "@shopify/hydrogen";
import { normalizeCollectionSearch, parseCollectionParams } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";

import type { ProductCardData } from "~/components/ProductCard.vue";
import { collectionRouteSearch } from "~/utils/collection-route-search";

const COLLECTION_QUERY = gql(`
  query Collection(
    $handle: String!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) {
    collection(handle: $handle) {
      handle
      title
      description
      products(first: 24, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
        nodes {
          handle
          title
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
        filters {
          id
          label
          type
          presentation
          values {
            id
            label
            count
            input
          }
        }
      }
    }
  }
`);

const TAXONOMY_METAFIELD_KEY_SEPARATOR = ".";

type CollectionQueryResult = {
  collection: {
    handle: string;
    title: string;
    description: string | null;
    products: {
      nodes: ProductCardData[];
      filters: AvailableFilter[];
    };
  } | null;
};

const route = useRoute();
const handle = computed(() => route.params.handle as string);
const { $storefrontClient } = useNuxtApp();

// Browse-param changes for back/forward only — filter toggles go through handleChange.
const collectionQueryKey = computed(() => collectionRouteSearch(route));

// Pin the fetch target while handleChange's refresh() runs. Without this,
// collectionRouteSearch(route) inside the fetcher can read a stale route
// (navigateTo updates the URL bar first), so dataSearch disagrees with
// urlSearch and CollectionProvider stays in loading forever.
const fetchSearchOverride = ref<string | null>(null);

type CollectionPageData = {
  /** Params this product snapshot was fetched for (not live route.query — see CollectionProvider). */
  dataSearch: string;
  collection: NonNullable<CollectionQueryResult["collection"]>;
};

function toStorefrontApiFilters(
  filters: ProductFilter[],
): StorefrontApiProductFilter[] | undefined {
  const storefrontFilters = filters.flatMap(toStorefrontApiFilter);
  return storefrontFilters.length > 0 ? storefrontFilters : undefined;
}

function toStorefrontApiFilter(filter: ProductFilter): StorefrontApiProductFilter[] {
  const storefrontFilters: StorefrontApiProductFilter[] = [];

  if (filter.available != null) storefrontFilters.push({ available: filter.available });
  if (filter.category) storefrontFilters.push({ category: filter.category });
  if (filter.price) storefrontFilters.push({ price: filter.price });
  if (filter.productType != null) storefrontFilters.push({ productType: filter.productType });
  if (filter.productVendor != null) storefrontFilters.push({ productVendor: filter.productVendor });
  if (filter.tag != null) storefrontFilters.push({ tag: filter.tag });
  if (filter.productMetafield?.value != null) {
    const { namespace, key, value } = filter.productMetafield;
    storefrontFilters.push({ productMetafield: { namespace, key, value } });
  }
  if (filter.variantMetafield?.value != null) {
    const { namespace, key, value } = filter.variantMetafield;
    storefrontFilters.push({ variantMetafield: { namespace, key, value } });
  }
  if (filter.variantOption?.value != null) {
    const { name, value } = filter.variantOption;
    storefrontFilters.push({ variantOption: { name, value } });
  }

  const taxonomyMetafield = toStorefrontApiTaxonomyMetafield(filter);
  if (taxonomyMetafield) storefrontFilters.push({ taxonomyMetafield });

  return storefrontFilters;
}

function toStorefrontApiTaxonomyMetafield(filter: ProductFilter) {
  if (!filter.taxonomyMetafield) return null;

  const { key: fullKey, value } = filter.taxonomyMetafield;
  const separatorIndex = fullKey.indexOf(TAXONOMY_METAFIELD_KEY_SEPARATOR);
  if (separatorIndex < 0) return null;

  const namespace = fullKey.slice(0, separatorIndex);
  const key = fullKey.slice(separatorIndex + TAXONOMY_METAFIELD_KEY_SEPARATOR.length);
  if (!namespace || !key) return null;

  return { namespace, key, value };
}

const { data, refresh } = await useAsyncData(
  computed(() => `collection-${handle.value}`),
  async () => {
    const search = fetchSearchOverride.value ?? collectionRouteSearch(route);
    const params = new URLSearchParams(search);
    const parsed = parseCollectionParams(params);

    const response = await $storefrontClient.graphql(COLLECTION_QUERY, {
      variables: {
        handle: handle.value,
        filters: toStorefrontApiFilters(parsed.filters),
        sortKey: parsed.sortKey ?? undefined,
        reverse: parsed.reverse || undefined,
      },
    });
    const result = response.data as CollectionQueryResult | null;
    if (!result?.collection) {
      return null;
    }

    return {
      dataSearch: search,
      collection: result.collection,
    } satisfies CollectionPageData;
  },
  // Only watch handle — filter/sort refetch via refreshCollection() from handleChange.
  // Also watching collectionQueryKey here races that explicit refresh: two concurrent
  // fetches can finish out of order and tag dataSearch with a stale route snapshot
  // while urlSearch already moved, so CollectionProvider never settles.
  { watch: [handle] },
);

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
