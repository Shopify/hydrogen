---
"@shopify/hydrogen": patch
---

The cart route now keeps `merchandiseId` on line updates, so `{ id, merchandiseId, quantity }` swaps an existing line to another variant, as the Storefront API allows. `CartLineUpdateInput` has the new optional `merchandiseId` field, and the store shows the swapped line once Shopify responds, even when Shopify returns it under a new line ID.
