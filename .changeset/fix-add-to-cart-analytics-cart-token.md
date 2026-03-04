---
'@shopify/hydrogen': patch
'@shopify/hydrogen-react': patch
---

Fixed a regression where add-to-cart analytics could include the cart key in `cart_token`, which could prevent `product_added_to_cart` events from being attributed in Shopify Admin analytics.
