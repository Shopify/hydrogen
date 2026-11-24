---
'@shopify/hydrogen': patch
---

`createCartHandler()` and the `cart` option of `createHydrogenContext()` take an `assignRollouts` option. When it's set, the cart handler calls the Storefront API `rolloutsAssign` mutation once per request before it creates a cart or adds lines, so checkout rollouts assign the buyer before the cart write. The handler only assigns with a private Storefront API token and waits at most one second. Later Storefront API calls in the request send the session cookie that the assignment returns, and the response forwards the assignment's cookies, also when the cart write fails. A failed or slow assignment never blocks the cart write.
