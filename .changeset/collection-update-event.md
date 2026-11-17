---
"@shopify/hydrogen": minor
---

`CollectionView` for React and Vue now sends Shopify's `shopify:collection:update` event inside a `CollectionProvider`. Each filter or sort change that the customer makes sends one event from the element, with the active filters, the sort key, and the products count before the change. The event's promise resolves with the products count of the new results when the provider settles. Back and forward navigation, pagination, and changes that leave the filters and sort the same send no event. When the collection changes or the element unmounts before the results arrive, the promise rejects with an `AbortError`. Outside a provider, `CollectionView` sends only the view event.

Wrap the filters and the product grid of the collection page in `CollectionView`, so that the element contains the filter and sort controls.
