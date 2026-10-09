---
"@shopify/hydrogen": patch
---

The cart route now keeps `merchandiseId` on line updates, so `{ id, merchandiseId, quantity }` swaps an existing line to another variant, as the Storefront API allows. `CartLineUpdateInput` has the new optional `merchandiseId` field, and the store shows the swapped variant once Shopify responds, without keeping fields from the old variant. When Shopify returns the line under a new line ID while other changes are in flight, the swapped line appears after the cart refresh that follows them.
