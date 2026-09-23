---
'@shopify/hydrogen-react': patch
'@shopify/hydrogen': patch
---

Clarify the `flattenConnection` and `CartCheckoutButton` docs: `flattenConnection` only flattens the connection you hand it, so nested connections need their own call, and `CartCheckoutButton` stays disabled while the cart is being created or updated and while it has no checkout URL.
