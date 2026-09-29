---
"@shopify/hydrogen": patch
---

Fix React hydration interruption caused by Analytics.Provider state updates. Deferred cart, shop, and consent state updates are now wrapped in `startTransition`, preventing React from abandoning server-rendered HTML when Suspense boundaries are still dehydrating.
