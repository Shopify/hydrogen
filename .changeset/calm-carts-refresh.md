---
"@shopify/hydrogen": minor
---

Add `CartStore.refresh()` and React/Vue `useCartActions()` APIs for reconciling the current cart after an out-of-band mutation. Refreshes use the configured cart transport, wait for active optimistic mutations, update custom cart fragment fields, and report progress and failures through cart state.
