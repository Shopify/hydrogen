# Hydrogen Cart Parity

This example is moving from the cart in Hydrogen 2026-04 and earlier (`CartForm` and its `/cart` route action) to the cart store and form helpers in Hydrogen 2026-10. The migration keeps the basic cart flows: SSR cart state, cart count, line add, line quantity changes, line removal, bundle child lines, discount apply/remove, checkout link, `/cart/:lines` permalinks, and `/discount/:code` links.

Known gaps compared to the cart in Hydrogen 2026-04 and earlier:

- **Applied gift cards**: Hydrogen's cart state and form helpers don't model `appliedGiftCards`, gift card add, or gift card removal yet. The earlier example could display applied gift cards, add gift card codes, and remove applied gift cards through `CartForm`. This example omits that behavior until Hydrogen supports it.
- **Buyer identity cart mutations**: the earlier `/cart` action handled `BuyerIdentityUpdate`. The Hydrogen form helpers used here don't expose that flow yet.
- **`CartForm` action responses**: cart forms now post to Hydrogen's `/api/cart` route and update through Standard Actions. The example no longer returns the earlier action payloads with `warnings`, `errors`, and cart analytics metadata from its `/cart` route.

Routes checked during migration:

- `/discount/:code` is still needed. Hydrogen's request handlers serve `/api/cart` and the Shopify and AJAX proxy routes, but not the example's discount-link route.
- `/cart/:lines` is still needed for locale-prefixed permalinks. Hydrogen's request handlers answer unprefixed cart permalinks, such as `/cart/<variant_id>:<quantity>`, before the router runs.
