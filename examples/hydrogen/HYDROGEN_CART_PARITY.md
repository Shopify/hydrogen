# Hydrogen Cart Parity

This example is incrementally replacing Hydrogen classic cart primitives with Hydrogen dev-preview. The current migration keeps the basic cart flows: SSR cart state, cart count, line add, line quantity changes, line removal, discount apply/remove, checkout link, `/cart/:lines` permalinks, and `/discount/:code` links.

Known gaps compared to Hydrogen classic's cart client:

- **Applied gift cards**: Hydrogen dev-preview cart state and form helpers do not model `appliedGiftCards`, gift card add, or gift card removal yet. The previous Hydrogen classic example could display applied gift cards, add gift card codes, and remove applied gift cards through Hydrogen classic `CartForm`; that behavior is intentionally omitted during this transition until Hydrogen dev-preview owns it.
- **Bundle/component child lines**: Hydrogen dev-preview cart state does not model `parentRelationship` or `lineComponents` yet. The Hydrogen example no longer renders nested child lines under parent cart lines.
- **Buyer identity cart mutations**: the previous `/cart` action handled `BuyerIdentityUpdate`; the Hydrogen dev-preview form helpers used here do not expose that flow yet.
- **Hydrogen classic `CartForm` action responses**: cart forms now post to Hydrogen dev-preview's `/api/cart` route and update through Standard Actions. The example no longer returns Hydrogen classic action payloads with `warnings`, `errors`, and cart analytics metadata from its `/cart` route.

Routes checked during migration:

- `/discount/:code` is still needed. Hydrogen dev-preview middleware handles `/api/cart` and Shopify/Ajax proxy routes, but it does not handle the example's discount-link route.
- `/cart/:lines` is still needed. It creates a cart from permalink-style line input and redirects to checkout; Hydrogen dev-preview middleware does not replace that route.
