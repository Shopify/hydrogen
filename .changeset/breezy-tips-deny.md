---
'@shopify/hydrogen-react': patch
---

Ensure the `getShopifyDomain` method from the [`useShop` hook](https://shopify.dev/docs/api/hydrogen-react/2024-01/hooks/useshop#:~:text=%2D%20storefrontToken-,getShopifyDomain,-%28props%3F%3A) always includes the HTTPS protocol.
