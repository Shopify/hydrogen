---
"@shopify/hydrogen": patch
---

`hydrogen gql check` no longer uses the TypeScript compiler API, so it works in projects on TypeScript 7. It reads `gql()` documents straight from the files your `tsconfig.json` includes. Calls through a local module that re-exports `gql` aren't checked, and documents it can't read statically, such as queries built with `${}` expressions, are reported as warnings.
