---
'@shopify/hydrogen': patch
---

[**Breaking change**]

Update all cart mutation methods from `createCartHandler` to return cart warnings.

As of API version 2024-10, inventory errors about stock levels will no longer be included in the `userErrors` of cart mutations. Inventory errors will now be available in a new return field `warnings` and will contain explicit code values of `MERCHANDISE_NOT_ENOUGH_STOCK` or `MERCHANDISE_OUT_OF_STOCK`. Reference: https://shopify.dev/changelog/cart-warnings-in-storefront-api-cart
