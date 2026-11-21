---
"@shopify/hydrogen": minor
---

Add `SearchUpdates` for React and Vue. Inside the search page's `CollectionProvider`, it sends Shopify's `shopify:search:update` event for each filter or sort change that the customer makes, with the search term, the active filters, and the sort key (`PRICE` or `RELEVANCE`). The event's promise resolves with the `totalCount` that you pass for the new results when the provider settles. A new search term, back and forward navigation, pagination, and changes that leave the filters and sort the same send no event. When the search term changes or the element unmounts before the results arrive, the promise rejects with an `AbortError`.

Wrap the search page's filters, results, and empty state in `SearchUpdates`, so that the element contains the filter and sort controls and stays on the page when a filter matches no products.
