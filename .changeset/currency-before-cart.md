---
"@shopify/hydrogen": patch
---

Update analytics skills to require `i18n.currency` during initial `ShopifyScripts` rendering so `window.Shopify.currency.active` exists before consent replays buffered events.
