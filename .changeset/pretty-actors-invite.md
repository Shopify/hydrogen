---
'@shopify/hydrogen': patch
---

Fix the Pagination component to reset internal state when the URL changes (not including Pagination params).
We also now validate the connection prop to include a `pageInfo` object with the following properties:

1. `hasNextPage`
1. `hasPreviousPage`
1. `endCursor`
1. `startCursor`

Previously our templates had a bug where `startCursor` was not included. Upgrading means the app will error
until you update your query to include it:

```diff
 query CollectionDetails {
   collection(handle: $handle) {
     ...
     pageInfo {
       hasPreviousPage
       hasNextPage
       hasNextPage
       endCursor
+      startCursor
     }
   }
 }

```
