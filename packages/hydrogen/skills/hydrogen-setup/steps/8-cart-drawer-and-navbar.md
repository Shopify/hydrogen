# Cart Drawer And Navbar

## Add The Cart Drawer

Invoke the `hydrogen-cart-drawer` skill to render an accessible cart drawer once in the root layout. Keep the `/cart` route as the full-page fallback when the drawer is unavailable, wire the drawer's Standard Actions `openCart` handler, and preserve the `hydrogen-cart-ui` progressive line item form contract in drawer content.

The drawer's `openCart` handler depends on the Shopify runtime scripts installed in the previous step; `window.Shopify.actions` must exist before the drawer's Standard Actions wiring can work.

### Continue when

- [ ] The drawer renders once in the root layout and can open on every page
- [ ] `window.Shopify.actions.openCart()` opens the drawer from the browser console
- [ ] Adding a product to cart opens the drawer and shows the added line item
- [ ] Drawer line item forms use the same `hydrogen-cart-ui` progressive form contract as the `/cart` page
- [ ] The drawer passes the `hydrogen-cart-drawer` skill's verification checklist

## Build The Navbar

Create or update the shared site navigation. Do this after the cart drawer, so the cart trigger can follow the drawer's markup contract.

### Requirements

- Preserve the app's existing layout component and styling conventions. Do not remove existing navigation items unless they directly conflict with the setup.
- Ensure a home link exists, if not, make one and point to `/`.
- Every navbar link must resolve: the route must exist in the app, and dynamic destinations (collection or page handles) must exist in the shop. Do not invent handles. In particular, do not link to `/collections/all` — the "all" collection is a Liquid storefront convention with no Storefront API equivalent; `collection(handle: "all")` returns null and the route 404s unless the merchant explicitly created a collection with that handle. For a browse-everything destination link to the `/collections` listing route or `/search`; for specific collections use handles returned by the Storefront API (e.g. from the home page collections query).
- The cart trigger is a `/cart` anchor that opens the drawer via `showModal()` after hydration; follow the `hydrogen-cart-drawer` skill for the markup.
- Make `/cart` reachable as a real link in the **footer** (site chrome). `/cart` is the full-page fallback when the cart drawer is unavailable. For strict no-JS live cart HTML, the cart route must receive resolved cart `initialData`.
- Use the framework's native link component when one is already used in the app.
- Keep the navbar server-renderable unless the app already uses a client-only navigation shell.
- Do not block the response by waiting for the cart contents to load.

### Continue when

- [ ] The navbar appears on the home, collection, product, and cart routes
- [ ] Every navbar and footer link href returns a 200 when requested directly against the dev server (`curl -s -o /dev/null -w "%{http_code}" http://localhost:<port><href>` for each one) — no 404s, no invented collection handles
