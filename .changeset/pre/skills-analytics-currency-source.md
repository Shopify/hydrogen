---
"@shopify/hydrogen": patch
---

The skills now describe where Shopify analytics reads the event currency. Product events take it from the event price's `currencyCode` and fall back to `window.Shopify.currency.active`, which `ShopifyScripts` `i18n.currency` sets. Page, collection, and search views take only the global. When it is unset, Shopify analytics sends them without a currency.
