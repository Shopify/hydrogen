---
'@shopify/hydrogen-codegen': patch
---

Add `@shopify/hydrogen-api` module augmentation to codegen output. The generated type files now include `declare module '@shopify/hydrogen-api'` alongside the existing `@shopify/hydrogen` augmentation, enabling type-safe `storefront.query()` responses when using the `hydrogen-api` package directly. Also updated `getSchema()` to fall back to `@shopify/hydrogen-api` when resolving schema files.
