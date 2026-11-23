---
"@shopify/hydrogen": patch
---

Fix `hydrogen gql check` on Windows when the project and the Hydrogen package are on different drives. The schemas are now copied next to the temporary tsconfig, so gql.tada reads them from disk instead of fetching them as URLs.
