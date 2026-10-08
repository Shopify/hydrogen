---
"@shopify/hydrogen": patch
---

`ShopifyScripts` now adds `<link rel="ucp" href="/.well-known/ucp">` to every page's `<head>`, so AI agents and link-preview services that read your storefront's HTML can discover that it supports the Universal Commerce Protocol (UCP). If you render Shopify's tags yourself, render both the `links` and `scripts` from `getShopifyScriptTags()`, or every string returned by `renderShopifyScriptTags()`. Browsers ignore this link type, so it adds no network requests.
