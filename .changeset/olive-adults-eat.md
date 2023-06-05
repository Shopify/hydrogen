---
'@shopify/hydrogen-react': patch
---

Fix the `<CartProvider>` to by default pull localization from `<ShopifyProvider>`. You can still override the countryCode by passing a prop directly to `<CartProvider>`. Resovles https://github.com/Shopify/hydrogen/issues/622
