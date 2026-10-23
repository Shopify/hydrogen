---
"@shopify/hydrogen": patch
---

`gql()` now appends each fragment definition once, by name, when composing documents. Two fragments that each spread the same sub-fragment, such as a shared `Image` fragment used by both a product card and a collection card, no longer produce a document that defines that fragment twice and fails with "Fragment name must be unique". Result and variable type inference works for the same shape. Two definitions that share a fragment name but select different fields throw when the document is composed, instead of reaching the API. Applies to the Storefront and Customer Account `gql` functions.
