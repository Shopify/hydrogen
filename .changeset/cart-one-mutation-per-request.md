---
"@shopify/hydrogen": patch
---

The cart route now rejects a JSON body that combines `lines`, `discountCodes`, `attributes` or `note` with an `invalid_cart_request` error, instead of running one of them and silently dropping the rest. Send one kind of change per request, for example one `Shopify.actions.updateCart` call per kind; the store rolls back the projections of a rejected call.
