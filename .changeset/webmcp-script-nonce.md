---
"@shopify/hydrogen": patch
---

Forward the document's CSP nonce to the dynamically loaded Shopify WebMCP script. React and Vue pass the existing `ShopifyScripts` nonce automatically; custom framework integrations can pass it to `initializeShopifyScripts`.
