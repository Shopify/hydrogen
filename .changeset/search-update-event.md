---
"@shopify/hydrogen": minor
---

New `SearchUpdates` component for React and Vue sends Shopify's `shopify:search:update` event for each filter or sort change that the customer makes on the search page. Render it inside the search page's `CollectionProvider`, around the filters, the results, and the empty state, and pass the search term and the Storefront API `totalCount`. It renders a `div`. The event has the search term, the active filters, and the sort key (`PRICE` for price sorts, `RELEVANCE` for other sorts). Its promise resolves with the total count after the new results render, or rejects with an `AbortError` when the search term changes or the component unmounts first.

Frameworks without a binding can use the new `connectSearchUpdates(store, { target, getView })` function. Call `notify()` in the store's browse change callback, before you navigate, and `disconnect()` on cleanup.
