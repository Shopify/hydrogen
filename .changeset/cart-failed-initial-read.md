---
"@shopify/hydrogen": minor
---

A failed cart read no longer looks like an empty cart. When the cart GET handler returns a `null` cart with errors, such as a throttled Storefront API read in the root loader, `createCartStore` and `CartProvider` now set the new `loadError` field on the cart state instead of showing "no cart", for both resolved and streamed `initialData`. The store doesn't retry on its own: show a "couldn't load your cart" message with a button that calls `refresh()`, and hide the cart's lines, totals, and counts while `loadError` is set. A successful `refresh()` clears it, and a failed one replaces it.

The store also sets `loadError` when its first load, or a load after `reset()`, fails before it has a cart ID, and the browser cart load now treats a `{cart: null, errors}` response from your cart endpoint as a failure. `trackCartAnalytics` now updates its baseline when the cart's lines change without a new `updatedAt`, so a later change no longer reports lines that were already in the cart as added.
