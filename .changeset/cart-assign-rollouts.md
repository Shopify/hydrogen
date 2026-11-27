---
"@shopify/hydrogen": minor
---

`createCartServerHandlers()` takes an `assignRollouts` option. When it's set, the POST handler calls the Storefront API `rolloutsAssign` mutation before an add creates a cart or adds lines, so checkout rollouts assign the buyer before the cart write. The handler only assigns with a private client, and waits at most one second. A buyer without a Shopify session can get one from the assignment, when the assignment saves the buyer's treatments. The cart write sends the session cookie that the assignment returns, and the response forwards the assignment's cookies, also when the cart write fails. After an assignment for a buyer who already had a session, the response also sets the `_shopify_rollouts_assigned` cookie, and later adds skip the assignment for 30 minutes while the buyer keeps the session. A failed or slow assignment never blocks the cart write.
