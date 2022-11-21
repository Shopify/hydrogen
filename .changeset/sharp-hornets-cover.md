---
'@shopify/hydrogen-react': patch
---

`<ShopifyProvider/>` and `useShop()` updates:

- Added a function `getShopifyDomain()` which will return a fully-qualified domain URL for your Shopify backend. For example:

  ```ts
  const {getShopifyDomain} = useShop();
  console.log(getShopifyDomain());
  // 'https://test.myshopify.com'
  ```

  This matches the function that was added to `createStorefrontClient()`.

- ShopifyProvider's `storeDomain` prop can now accept the Shopify backend subdomain, matching how `createStorefrontClient()`'s `storeDomain` prop. ShopifyProvider still accepts a full domain, but that will be removed in a future breaking change.

```tsx
// preferred
<ShopifyProvider shopifyConfig={{storeDomain: 'shop'}}></ShopifyProvider>

// still works, but will be removed in the future
<ShopifyProvider shopifyConfig={{storeDomain: 'shop.myshopify.com'}}></ShopifyProvider>
```
