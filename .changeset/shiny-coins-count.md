---
"@shopify/hydrogen": patch
---

Require `i18n.currency` in `ShopifyScripts` / `getShopifyScriptTags()` whenever Shopify analytics is enabled (the default). Product events carry prices, and product pages can be viewed before the cart initializes currency, so `window.Shopify.currency.active` must be set from initial script rendering. `i18n` and `currency` remain optional with `shopifyAnalytics: false`. JS consumers and the Vue binding get a runtime warning instead of a compile-time error. Adds the `ShopifyScriptsI18nWithCurrency` type.
