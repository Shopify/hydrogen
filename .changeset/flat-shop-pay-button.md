---
"@shopify/hydrogen": patch
---

Render the Shop Pay button locally instead of loading Shopify's hosted shop-js web component. `createShopPayButton` now creates a self-contained `<hydrogen-shop-pay-button>` with protected shadow-root styles; add `renderShopPayButton` for server HTML, `defineShopPayButton` for custom-element registration, and `getShopPayButtonUrl` for checkout URL construction. The button works before JavaScript runs, supports `accessibilityLabel`, accepts a `nonce` for strict Content Security Policies, preserves optional explicit channel attribution, and limits styling to `width` and `borderRadius`. Remove `loadShopJs`, `getShopPayButtonAttributes`, the React and Vue `loadScript` prop, and the dev-only click interception.
