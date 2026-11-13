---
"@shopify/hydrogen": patch
---

`hydrogen gql check` now points gql.tada at the bundled schemas with a path relative to your tsconfig instead of an absolute one. On Windows, gql.tada parsed `C:\...\storefront.schema.json` as a URL with a `c:` protocol and tried to fetch it, so the command failed with `CombinedError: [Network] fetch failed`.
