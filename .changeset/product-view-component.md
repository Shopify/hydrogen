---
"@shopify/hydrogen": minor
---

Add the `ProductView` component for React and Vue. It renders the `shopify-product-view` element, which sends Shopify's `shopify:product:view` event for the product that it wraps, and sends it again when the product ID changes, but not when the variant changes. Set `context` to `"page"` on the product page, to `"collection"`, `"search"`, or `"recommendation"` on product cards, or to `"dialog"` for products in a dialog. Hydrogen doesn't send the event on its own: add `ProductView` where the storefront shows products, on the product page and on each product card.

`ShopifyScripts` and `initializeShopifyScripts()` now register the element. Frameworks without a Hydrogen binding can render `PRODUCT_VIEW_TAG_NAME` with the attributes from `getProductViewAttributes()`, and call `defineProductView()` when they don't use `initializeShopifyScripts()`.
