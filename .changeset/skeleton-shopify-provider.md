---
"skeleton": patch
"@shopify/cli-hydrogen": patch
"@shopify/create-hydrogen": patch
---

Add `ShopifyProvider` to the skeleton template so that `Money` and other locale-aware components format values using your store's configured locale instead of defaulting to `en-US`. Also sets the `<html lang>` attribute dynamically based on the store's language setting.
