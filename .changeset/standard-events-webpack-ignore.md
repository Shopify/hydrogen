---
"@shopify/hydrogen": patch
---

Fix webpack builds, the Next.js 15 default, failing with `UnhandledSchemeError` in apps that import `@shopify/hydrogen`. This also fixes `shopify:page:view` events never firing in Next.js apps built with Turbopack. `ShopifyScripts` now marks its Standard Events CDN import with `webpackIgnore`, so both bundlers leave it to the browser.
