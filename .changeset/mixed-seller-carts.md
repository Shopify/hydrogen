---
"@shopify/hydrogen": minor
---

Support seller metadata and child cart groups in cart data. Cart-wide cost is optional for mixed-currency carts; use group totals and line costs instead of combining different currencies.

Type-only change: `CartData.cost` is now optional. Code typed against plain `CartData` that reads `cart.cost` must handle `undefined` (e.g. `cart.cost?.totalAmount`, or render `groups`). Stores typed from their cart server handlers are unaffected.
