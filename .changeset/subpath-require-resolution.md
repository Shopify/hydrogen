---
"@shopify/hydrogen": patch
---

Resolve `@shopify/hydrogen/react`, `/vue`, `/customer-account`, and `/vite` for `require`-based resolvers, such as Jest in its default CommonJS mode, the same way the root entry point already resolves. They still point at the ESM build, so those tools load them through `require(esm)` or a transform, as with the root.
