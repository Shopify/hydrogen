---
"@shopify/hydrogen": patch
---

The cart GET handler now resets a cart's buyer country to the request's country when the two differ. Checkout changes the cart's country when the buyer enters a shipping address, and the Storefront API keeps pricing the cart in that country's currency on every later read because a cart is priced from its persisted buyer identity, not from `@inContext`. A buyer who entered a Canadian address at checkout and returned to the US storefront kept seeing CAD. The handler now runs `cartBuyerIdentityUpdate` with the request's country and echoes the cart's email and phone, which the mutation clears when they're omitted. The customer attached to the cart stays attached. B2B carts, which are priced by their company location, are left unchanged.

The default cart fragment now selects `buyerIdentity { countryCode email phone purchasingCompany { location { id } } }`, `CartData` gains an optional `buyerIdentity` field typed as the new `CartBuyerIdentity`, and `cartQueries` includes a `cartBuyerIdentityUpdate` document. With a custom `fragment`, the handlers' `cartBuyerIdentityUpdate` returns the cart with your `CartFragment`.
