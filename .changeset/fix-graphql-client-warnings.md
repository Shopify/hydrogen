---
'@shopify/hydrogen': patch
---

Fix GraphQL client development warnings

Updates `@shopify/graphql-client` from v1.4.0 to v1.4.1 to resolve sourcemap warnings and pre-optimizes the dependency in Vite configuration to prevent unexpected page reloads during development.

**What's fixed:**
- Eliminates sourcemap warnings: "Sourcemap for '/node_modules/@shopify/graphql-client/dist/graphql-client/graphql-client.mjs' points to missing source files"
- Prevents "new dependencies optimized" messages and automatic page reloads during development

**Technical changes:**
- Updated `@shopify/graphql-client` dependency to v1.4.1 which includes proper sourcemap generation
- Added `@shopify/graphql-client` to Vite's `optimizeDeps.include` array for pre-optimization