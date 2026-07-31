---
'@shopify/hydrogen': minor
---

Add a `useCartAnalytics()` composable to the Vue binding (`@shopify/hydrogen/vue`), mirroring the React binding's hook. Call it in a component inside `CartProvider` to subscribe the cart store to analytics tracking on mount and unsubscribe on dispose.
