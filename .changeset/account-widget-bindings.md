---
"@shopify/hydrogen": minor
---

Add `ShopifyAccountWidget` to `@shopify/hydrogen/react` and `@shopify/hydrogen/vue`. Both bindings render the same SSR-safe `<shopify-store>` / `<shopify-account>` markup as `renderShopifyAccountWidget()` and share its `storeDomain`, `publicAccessToken`, `customerAccessToken`, `menu`, `signInUrl`, and `nonce` options. React takes the signed-out avatar as a required `signedOutAvatar` element and exposes `onOpen` / `onClose` callbacks; Vue takes a required `signed-out-avatar` slot and re-emits the component's `open` / `close` events. Load Shopify's account bundle with the existing `account` option on `ShopifyScripts` or `getShopifyScriptTags()`.
