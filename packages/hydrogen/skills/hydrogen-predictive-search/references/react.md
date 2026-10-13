# React Predictive Search

Wrap React search UI with the provider and render with hooks:

```tsx
import { PredictiveSearchProvider, usePredictiveSearch } from "@shopify/hydrogen/react";

const PREDICTIVE_SEARCH_LIMIT = 5;

function SearchAside() {
  return (
    <PredictiveSearchProvider limit={PREDICTIVE_SEARCH_LIMIT}>
      <SearchInput />
      <PredictiveResults />
    </PredictiveSearchProvider>
  );
}

function PredictiveResults() {
  const { status, result, error } = usePredictiveSearch();

  if (status === "loading") return <p>Loading…</p>;
  if (status === "error") return <p role="alert">{error}</p>;
  if (!result.total) return null;

  return <ProductSuggestions products={result.items.products} term={result.term} />;
}
```

Use `usePredictiveSearchActions()` for manual search/clear calls, or `usePredictiveSearchForm()` for headless form props and `register("query")` input props. `formProps()` defaults to native `GET /search` submission; override the provider's `searchAction` when the full search page lives elsewhere. Predictive search JSON requests use `predictiveSearchEndpoint` separately.

Clear the store when closing an autocomplete overlay or navigating away from predictive results so stale suggestions do not reappear on reopen.
