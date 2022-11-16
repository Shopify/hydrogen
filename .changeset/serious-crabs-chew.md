---
'@shopify/hydrogen-react': patch
---

Adds the functions `getStorefrontApiUrl()` and `getPublicTokenHeaders()` to the object returned by `useShop()` (and provided by `<ShopifyProvider/>`).

For example:

```ts
const {storefrontId, getPublicTokenHeaders, getStorefrontApiUrl} = useShop();

fetch(getStorefrontApiUrl(), {
  headers: getPublicTokenHeaders({contentType: 'json'})
  body: {...}
})
```
