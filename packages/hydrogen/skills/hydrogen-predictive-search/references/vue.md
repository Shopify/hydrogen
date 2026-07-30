# Vue Predictive Search

Wrap Vue search UI with the provider and render with composables:

```vue
<script setup lang="ts">
import {defineComponent, h} from "vue";
import {PredictiveSearchProvider, usePredictiveSearch} from "@shopify/hydrogen/vue";

const PREDICTIVE_SEARCH_LIMIT = 5;

const PredictiveResults = defineComponent({
  setup() {
    const state = usePredictiveSearch();

    return () => {
      if (state.value.status === "loading") return h("p", "Loading...");
      if (state.value.status === "error") return h("p", {role: "alert"}, state.value.error);
      if (!state.value.result.total) return null;

      return h(ProductSuggestions, {
        products: state.value.result.items.products,
        term: state.value.result.term,
      });
    };
  },
});
</script>

<template>
  <PredictiveSearchProvider :limit="PREDICTIVE_SEARCH_LIMIT">
    <SearchInput />
    <PredictiveResults />
  </PredictiveSearchProvider>
</template>
```

Use `usePredictiveSearchActions()` for manual search/clear calls, or `usePredictiveSearchForm()` for headless form props and `register("query")` input props. `formProps()` defaults to native `GET /search` submission; override the provider's `searchAction` when the full search page lives elsewhere. Predictive search JSON requests use `predictiveSearchEndpoint` separately.

Clear the store when closing an autocomplete overlay or navigating away from predictive results so stale suggestions do not reappear on reopen.
