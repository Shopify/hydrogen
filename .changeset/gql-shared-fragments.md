---
"@shopify/hydrogen": patch
---

`gql()` now adds each fragment definition once when composed fragments share a dependency. Before, a query composed from two fragments that both spread the same fragment included that fragment's definition twice, and the Storefront API and Customer Account API rejected the document with "Fragment name must be unique". Definitions that the source document already contains are also skipped.
