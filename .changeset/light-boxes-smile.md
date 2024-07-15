---
'@shopify/remix-oxygen': patch
'skeleton': patch
'@shopify/hydrogen': patch
'@shopify/create-hydrogen': patch
---

Move `getStorefrontHeaders` from @shopify/remix-oxygen to @shopify/hydrogen

Create `createShopifyHandler` that combined `createStorefrontClient`, `createCustomerAccountClient` and `createCartHandler`
