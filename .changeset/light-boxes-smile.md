---
'@shopify/remix-oxygen': patch
'@shopify/hydrogen': patch
---

Create `createHydrogenContext` that combined `createStorefrontClient`, `createCustomerAccountClient` and `createCartHandler`.

Move `getStorefrontHeaders` from `@shopify/remix-oxygen` to `@shopify/hydrogen` and deprecate the version in `@shopify/remix-oxygen`.

Enable `cartGetIdDefault` and `getStorefrontHeaders` to be compatible with `CrossRuntimeRequest` thus compatible with express.
