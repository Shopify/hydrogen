---
"@shopify/hydrogen": minor
---

Add an `accountWidget` option to `getShopifyScriptTags()` and the React/Vue `ShopifyScripts` components. When enabled, Hydrogen loads the Shopify customer account web component (`https://cdn.shopify.com/storefront/web-components/account.js`) with the same nonce and `crossorigin` handling as the other Shopify runtime scripts. The script URL is also exported as `SHOPIFY_ACCOUNT_WIDGET_SCRIPT`.
