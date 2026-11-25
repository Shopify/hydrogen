---
"@shopify/hydrogen": patch
---

`parseCollectionParams` now reads every value that `serializeCollectionParams` writes. Before, it ignored the `collection-default`, `id-ascending`, `id-descending`, and `relevance` sort values and the `filter.p.category` param. After a URL sync, the collection store dropped these sorts and category filters, and the loader queried without them. `parseCollectionParams` now reads `sort_by` with `parseSortByValue`, so it also accepts the same short forms, such as `price` for price ascending. `parseSortByValue` also no longer returns an `Object.prototype` member, such as `constructor`, as a sort key.
