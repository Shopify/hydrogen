---
"@shopify/hydrogen": patch
---

Declare all library GraphQL documents with `gql()` so the gql.tada plugin validates them, and add a `gql(document, fragments)` overload that composes additional fragments onto an already-declared document while preserving inferred types.
