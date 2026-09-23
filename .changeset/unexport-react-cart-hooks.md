---
"@shopify/hydrogen": patch
---

Remove the standalone `CartProvider`, `useCart`, `useCartActions`, and `useCartForm` exports from `@shopify/hydrogen/react`. Use the typed versions returned by `createCartComponents<typeof cartHandlers>()` instead. `useCartAnalytics` is still exported.
