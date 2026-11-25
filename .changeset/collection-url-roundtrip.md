---
"@shopify/hydrogen": patch
---

`parseCollectionParams` now reads every value that `serializeCollectionParams` writes. Before, it ignored the `collection-default`, `id-ascending`, `id-descending`, and `relevance` sort values and the `filter.p.category` param. After a URL sync, the collection store dropped these sorts and category filters, and the loader queried without them. The sort key is still `undefined` for a `sort_by` value that `getSortByValue` never writes, such as `price` or `best-selling-descending`.
