---
"@shopify/hydrogen": minor
---

Add `renderShopifyAccountWidget()` and `ShopifyAccountWidgetOptions`. The renderer returns SSR-safe `<shopify-store>` / `<shopify-account>` markup so the trusted `signedOutAvatarHtml` is visible before Shopify's account bundle loads. Attribute values are escaped, `customer-access-token` is omitted when signed out, `sign-in-url` defaults to `/account/login`, and a nonce-capable `<style>` reserves the control's footprint with `var(--shopify-account-avatar-size, 44px)` to prevent layout shift. Enable `account` in `ShopifyScripts` to load the bundle.
