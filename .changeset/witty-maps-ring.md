---
'@shopify/hydrogen-react': patch
---

Add a new utility helper for getting the myshopify domain for the site:

```ts
const client = createStorefrontClient(...);
client.getShopifyDomain() === `https://testing.myshopify.com`;
```
