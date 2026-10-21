---
"@shopify/hydrogen": patch
---

`ShopifyScripts` now adds `<link rel="ucp" href="/.well-known/ucp">` to every page's `<head>`, so AI agents and link-preview services that read your storefront's HTML can discover that it supports the Universal Commerce Protocol (UCP). If you render Shopify's tags yourself, render both the `links` and `scripts` from `getShopifyScriptTags()`, or every string returned by `renderShopifyScriptTags()`. Browsers ignore this link type, so it adds no network requests. The tag renders everywhere, including Oxygen preview domains on `myshopify.dev` where the profile returns 404, because the descriptors are built without a request; the `Link` response header ([#4153](https://github.com/Shopify/hydrogen/pull/4153)) is skipped there.
