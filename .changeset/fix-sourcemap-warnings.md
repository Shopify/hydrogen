---
'@shopify/hydrogen': patch
---

Fix source map warnings from @shopify/graphql-client in development

Suppress non-actionable source map warnings from external dependencies that ship with invalid source maps. This fix was previously applied but accidentally removed during the React Router 7 migration.

Fixes #3093