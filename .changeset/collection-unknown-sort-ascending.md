---
"@shopify/hydrogen": patch
---

A `sort_by` value that Hydrogen does not recognize, such as `foo-descending`, now reads `reverse: false` in `parseSortByValue` and `parseCollectionParams`. Before, it read `reverse: true` with no sort key, so a loader that passed the result to the Storefront API reversed the default product order for an invalid URL. The parsed state now matches the collection store state. `reverse` reads `true` only for descending price, title, created, and ID sorts.
