---
"@shopify/hydrogen": patch
---

On a combined-listing child, option values for an option that only a sibling child has now report `exists: false` and `available: false` when the query loads no variant for them. Before, if that option came before an option the child does have (for example `Color, Strap, Size` on a child with only `Color` and `Size`), a value could be reported as existing and in stock.
