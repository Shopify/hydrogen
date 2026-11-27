---
"@shopify/hydrogen": patch
---

Fix `hydrogen gql check` failing on Windows with `[Network] fetch failed`. The Hydrogen schema paths are now passed to gql.tada relative to the temporary tsconfig instead of as absolute paths, which Windows drive letters made look like URLs.
