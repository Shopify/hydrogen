---
"@shopify/hydrogen": minor
---

Add `renderShopifyAccountWidget()` and `ShopifyAccountWidgetOptions`. The renderer returns the `<shopify-store>` / `<shopify-account>` markup for Shopify's customer account component as an HTML string, so the signed-out avatar can be server-rendered before the account bundle loads. It wraps the required, trusted `signedOutAvatarHtml` in the `signed-out-avatar` slot, escapes every attribute value, omits `customer-access-token` when the customer is signed out, defaults `sign-in-url` to `/account/login`, and emits a nonce-capable `<style>` scoped by `data-hydrogen-account-widget` that reserves the control's footprint with `var(--shopify-account-avatar-size, 44px)` to prevent layout shift while Shopify upgrades the element. Enable `account` in `ShopifyScripts` to load the bundle.
