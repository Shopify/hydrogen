---
"@shopify/hydrogen": minor
---

`CollectionView` for React and Vue changes in three ways from the earlier `CollectionView` release note:

- It now also sends Shopify's `shopify:collection:update` event for each filter or sort change that the customer makes. The event has the products count before the change. Its promise resolves with the new `productsCount` when the new results render, and rejects with an `AbortError` when the collection changes, back or forward navigation leaves the change, or the component unmounts first. Back and forward navigation send no update event.
- It must now be inside `CollectionProvider`. It throws outside `CollectionProvider`.
- Wrap the filter and sort controls, the results, and the empty state in `CollectionView`, not only the product grid.

Frameworks without a binding can use the new `connectCollectionUpdates(store, { target, getView })` function. Call `notify()` in the store's browse change callback, before you navigate, and `disconnect()` on cleanup. When the view element is keyed on the collection handle, connect to the new element after each collection change.
