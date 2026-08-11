---
"@shopify/hydrogen": patch
---

Render the Shop Pay button locally instead of loading Shopify's hosted shop-js web component. The button is now a self-contained `<hydrogen-shop-pay-button>` element with its own styles and an anchor pointing at same-origin `/checkout` and `/cart/<id>:<qty>` paths (handled by `handleShopifyRoutes`), so it server-renders as a working button with zero client JavaScript. Add `renderShopPayButton` (HTML string), `defineShopPayButton` (self-registering `<hydrogen-shop-pay-button>` custom element for declarative usage), `getShopPayButtonUrl`, and `accessibilityLabel`/`buttonText` options. Remove `loadShopJs`, `getShopPayButtonAttributes`, the `loadScript` prop, and the dev-only click interception; the React and Vue `ShopPayButton` bindings render the self-contained element directly and no longer require client-side hydration.
