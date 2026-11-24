---
"@shopify/hydrogen": minor
---

`createCartServerHandlers()` takes an `assignRollouts` option. When it's set, the POST handler calls the Storefront API `rolloutsAssign` mutation before an add creates a cart or adds lines, so checkout rollouts assign the buyer before the cart write. The handler only assigns with a private client and for buyers who already have a Shopify session, and waits at most one second. The cart write sends the session cookie that the assignment returns, and the response forwards the assignment's cookies, also when the cart write fails. A failed or slow assignment never blocks the cart write.
