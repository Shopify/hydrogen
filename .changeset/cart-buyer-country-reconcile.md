---
"@shopify/hydrogen": patch
---

The cart GET handler now resets a cart's buyer country to the request's country when the two differ. Checkout changes the cart's country when the buyer enters a shipping address, and the Storefront API keeps pricing the cart in that country's currency on every later read because a cart is priced from its persisted buyer identity, not from `@inContext`. A buyer who entered a Canadian address at checkout and returned to the US storefront kept seeing CAD. The handler now runs `cartBuyerIdentityUpdate` with the request's country, echoes the cart's email and phone, and attaches the logged-in customer's access token so the update never detaches them. The reset is skipped, with a warning, when the cart belongs to a customer and no access token is available.

The default cart fragment now selects `buyerIdentity { countryCode email phone customer { id } }`, `CartData` gains an optional `buyerIdentity` field, and `cartQueries` and `makeCartQueries()` include a `cartBuyerIdentityUpdate` document that returns the cart with your `CartFragment`.
