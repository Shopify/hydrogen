---
'@shopify/hydrogen': patch
---

Customer Account API client's `query` & `mutate` method now returns `errors` as an array of GraphQLError(s) that is better formatted.

Log GraphQL errors automatically in Customer Account API client, with a new `logErrors: boolean` option to disable it.
