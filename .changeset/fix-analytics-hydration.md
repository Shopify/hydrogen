---
"@shopify/hydrogen": patch
---

Fix React hydration interruption caused by Analytics.Provider state updates. Deferred cart, shop, and consent state updates are now wrapped in `startTransition`, preventing React from abandoning server-rendered HTML when Suspense boundaries are still dehydrating.

`publish` from `useAnalytics()` also re-checks consent when called. If a visitor revokes consent while React is still holding that update, events published in the meantime no longer reach subscribers.
