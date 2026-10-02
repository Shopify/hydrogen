---
"@shopify/hydrogen": minor
---

Add an `account` option to `getShopifyScriptTags()` and the React/Vue `ShopifyScripts` components. When enabled, Hydrogen loads the Shopify customer account web component (`https://cdn.shopify.com/storefront/web-components/account.js`) with the same nonce and `crossorigin` handling as the other Shopify runtime scripts. Render `<shopify-account>` where you want the account UI to appear. The script URL is also exported as `SHOPIFY_ACCOUNT_SCRIPT`.
