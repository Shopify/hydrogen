# Nuxt

Use the Vue binding from `@shopify/hydrogen/vue`. In Nuxt, route query objects can treat dotted keys as nested data, so use Hydrogen's serialized search string for navigation.

## Local Re-Export

Create a small storefront module:

```ts
// storefront/collection.ts
export {
  CollectionProvider,
  useCollection,
  useCollectionActions,
  useCollectionForm,
} from "@shopify/hydrogen/vue";
```

## Page Data

Use `useAsyncData` or route-level server data to query the Storefront API with `parseCollectionParams(new URLSearchParams(search))`. Return:

- `handle`
- `dataSearch`
- `products`
- `availableFilters`
- For search, `term` and `totalCount`

Keep a way to refresh data after hydrated navigation, usually the `refresh` function returned by `useAsyncData`.

## Provider Wrapper

Nuxt can lag for one tick after `navigateTo`, so pin the target URL search while navigation and refresh are in flight:

```vue
<script setup lang="ts">
import { normalizeCollectionSearch } from "@shopify/hydrogen";
import { CollectionProvider } from "~/storefront/collection";

const route = useRoute();
const urlSearchOverride = ref<string | null>(null);
const urlSearch = computed(() => urlSearchOverride.value ?? collectionRouteSearch(route));
const collectionData = computed(() => ({
  handle: props.handle,
  dataSearch: props.dataSearch,
}));

async function handleChange(search: string) {
  const normalizedSearch = normalizeCollectionSearch(search);
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
</script>

<template>
  <CollectionProvider :data="collectionData" :url-search="urlSearch" @change="handleChange">
    <CollectionBrowserContent />
  </CollectionProvider>
</template>
```

`collectionRouteSearch(route)` should return the current URL search string with literal dotted keys. Do not rely on `route.query` for filter serialization.

## Browse Content

In the content component:

```vue
<script setup lang="ts">
import {
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  serializeCollectionParams,
} from "@shopify/hydrogen";
import { useCollection, useCollectionForm } from "~/storefront/collection";

const state = useCollection();
const { formProps } = useCollectionForm();
const fProps = formProps();
const isLoading = computed(() => state.value.status === "loading");
</script>

<template>
  <form v-bind="fProps" method="get" :action="collectionPath">
    <!-- filters, sort, product grid -->
  </form>
</template>
```

Apply form helper props with `v-bind`. Use `@change="event.target.form?.requestSubmit()"` for filters and sort controls.

## Search Pages

Use `handle = computed(() => \`search:${term.value}\`)` for provider data. Include a hidden `q` input inside the filter/sort form. When the term changes, suppress stale query watchers while refreshing data.

## Gotchas

- Browser-side Storefront API refetches should use the same-origin SFAPI proxy, not the remote store domain. See the Nuxt storefront-client reference.
- Preserve unrelated query params when removing filters.
- If loading never settles, verify `dataSearch` and `urlSearch` normalize to the same string.
