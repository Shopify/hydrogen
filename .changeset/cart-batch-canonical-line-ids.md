---
"@shopify/hydrogen": patch
---

A `Shopify.actions.updateCart` call that changes several lines now keeps each line at its new quantity when the response returns the lines under different IDs, unless the response reports an error or warning for that line. Before, the lines kept their old quantities next to the new cart totals until the follow-up refresh, and lost the update if that refresh failed. The store also stops waiting for a cart request it doesn't own after `STANDARD_ACTION_TIMEOUT_IN_MS`, so a request that never settles can't block cart revalidation after a reconnect.
