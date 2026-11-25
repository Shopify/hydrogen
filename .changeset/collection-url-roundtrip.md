---
"@shopify/hydrogen": patch
---

Fix collection category filters and some sorts that the URL sync dropped. On shops with the Category filter turned on in Search & Discovery, ticking a category did not filter the products, and the checkbox unchecked itself after the URL sync. Hand-written or serialized `collection-default`, `id-ascending`, `id-descending`, and `relevance` sorts were also dropped.

`parseCollectionParams` now reads every value that `serializeCollectionParams` writes, including `filter.p.category`. It reads `sort_by` with `parseSortByValue`, so short forms such as `price` also work. `Object.prototype` keys, such as `constructor`, are no longer sort keys. A `-descending` value for a sort key that has no direction, such as `best-selling-descending`, now reads `reverse: false`, so it matches the collection store state.
