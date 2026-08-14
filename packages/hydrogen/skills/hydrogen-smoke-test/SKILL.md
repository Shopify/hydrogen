---
name: hydrogen-smoke-test
description: >
  Smoke-test checklist for Hydrogen storefronts built by agents. Use after
  creating or modifying a Hydrogen storefront, setup flow, cart, product page,
  collection/search browsing, analytics, request handlers, Shopify redirects,
  Shop Pay, or framework middleware integration.
---

# Hydrogen Storefront Smoke Tests

Run the app in the framework's dev server and, when practical, in a production build. Type checks are not enough for Hydrogen wiring.

If any check below fails, fix the app and re-run the failing check before treating verification as complete.

Copyable checklist (details for each check are in the sections below):

```
Static checks:
- [ ] Formatting fixer, if present
- [ ] lint, typecheck, or check
- [ ] GraphQL validation (`hydrogen gql check`) when `gql()` documents changed
- [ ] build
- [ ] test
- [ ] Formatting check, if distinct from the fixer

Request handlers:
- [ ] POST /api/{api-version}/graphql.json returns Storefront API JSON, not the framework 404
- [ ] GET /api/cart returns cart handler JSON (no cart cookie -> {cart: null})
- [ ] GET /admin redirects to the configured shop/admin domain
- [ ] Unknown path returns framework 404 unless a Shopify URL redirect matches

Navigation:
- [ ] Every navbar and footer link href returns 200 when curled directly (no invented routes)

Product page:
- [ ] Server-renders title, gallery, price, variant options, add-to-cart form, and related products when available
- [ ] URL option params select the expected variant on reload
- [ ] Selecting same-product options updates the URL without scroll reset
- [ ] Combined-listing values navigate to the target product handle instead of calling selectOption
- [ ] Sold-out values remain selectable and show sold-out text
- [ ] Non-existent combinations are disabled
- [ ] Add-to-cart is enabled only when canAddToCart(product, options) is true
- [ ] Shop Pay renders only when a selected variant exists and is disabled when add-to-cart is disabled or pending

Cart:
- [ ] /cart works without JavaScript and is reachable via a real /cart link in the footer
- [ ] Header cart trigger is a `/cart` anchor that opens the drawer via `showModal()` after hydration
- [ ] window.Shopify.actions.openCart() opens the drawer after Standard Actions loads
- [ ] A mutation driven through the real Add to cart UI or framework cart action issues `Set-Cookie` and propagates expected response headers
- [ ] Add-to-cart can open the drawer after a successful submit when the product UX chooses that behavior
- [ ] Each line item form includes hidden set, scoped lineId, and editable quantity
- [ ] Quantity Enter key submits a set action
- [ ] Rapid quantity clicks settle to the final expected quantity
- [ ] Line, discount, note, attribute, network, and cart-level errors appear in the right scope
- [ ] Attribute editing submits the complete list, preserves unrelated attributes, and shows scoped pending UI
- [ ] Totals are server-provided and visually pending during cart mutations

Collection and search:
- [ ] Collection filters and sort update the URL and product grid
- [ ] Reloading a filtered URL server-renders the same filter/sort state
- [ ] Active filter chips remove one filter and preserve unrelated params
- [ ] Search filters preserve q
- [ ] JavaScript-disabled filter forms still submit with GET
- [ ] Back/forward navigation does not leave browse state stuck in loading

Analytics:
- [ ] Page view fires on initial load and client navigations
- [ ] Product/collection/search/cart view events fire once per route data change
- [ ] Cart tracking is wired once via trackCartAnalytics(cartStore) (React/Vue: useCartAnalytics()), delta events fire on confirmed cart data changes, and the cart query includes updatedAt
- [ ] No browser module reads private env variables
- [ ] Production does not bypass Customer Privacy consent gating (no forced-always-true consent checks)

Markets and money:
- [ ] Market-aware Storefront API queries declare $country, $language, and @inContext
- [ ] Money renders from Storefront API money fields via formatMoney()
- [ ] No client-side subtotal/total arithmetic exists

Production pass:
- [ ] Build and run the production bundle and repeat the request-handler checks against production mode
```

## Static Checks

Run the app's available scripts:

1. Formatting fixer, if present.
2. `lint`, `typecheck`, or `check`.
3. GraphQL validation (`hydrogen gql check`) when `gql()` documents changed.
4. `build`.
5. `test`.
6. Formatting check, if distinct from the fixer.

## Request Handlers

Replace `<port>` with the running app port, and `{api-version}` with the Storefront API version configured by the app:

```bash
curl -i -X POST http://localhost:<port>/api/{api-version}/graphql.json \
  -H "content-type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: <public-token>" \
  -d '{"query":"{ shop { name } }"}'
```

Expected: Storefront API JSON, not the framework 404.

The SFAPI proxy forwards the incoming public token header; it does not inject a token from server config.

```bash
curl -i http://localhost:<port>/api/cart
```

Expected: cart handler JSON, not 404. With no cart cookie, the body should be `{cart: null}`.

```bash
curl -i http://localhost:<port>/admin
```

Expected: redirect to `/admin` on the configured shop/admin domain.

```bash
curl -i http://localhost:<port>/this-does-not-exist
```

Expected: framework 404 unless Shopify has a matching URL redirect.

## Navigation

Extract every `href` from the rendered navbar and footer and request each one directly:

```bash
curl -s -o /dev/null -w "%{http_code} <href>\n" http://localhost:<port><href>
```

Expected: 200 for every link. A 404 means the link points to a route the app never created or a handle the shop does not have. `/collections/all` is the classic failure: the Liquid "all" collection does not exist in the Storefront API, so only link to it when the shop really has a collection with that handle.

## Account

```bash
curl -i http://localhost:<port>/account/login
```

Expected: a redirect whose `location` header points at Shopify's hosted login, not a framework 404 or 500.

- `/account` renders the signed-out panel when no session exists, without touching access tokens.
- The logout control is a native `<form method="post" action="/account/logout">`; the handler enforces same-origin POST and returns a raw redirect only a native browser submit can follow.
- Completing a real login requires a public HTTPS origin registered for the OAuth callback; when the local origin is not registered, verify the signed-out checks and say so instead of faking signed-in ones.

## Product Page

- Product page server-renders title, gallery, price, variant options, add-to-cart form, and related products when available.
- URL option params select the expected variant on reload.
- Selecting same-product options updates the URL without scroll reset.
- Combined-listing values navigate to the target product handle instead of calling `selectOption`.
- Sold-out values remain selectable and show sold-out text.
- Non-existent combinations are disabled.
- Add-to-cart is enabled only when `canAddToCart(product, options)` is true.
- Shop Pay renders only when a selected variant exists and is disabled when add-to-cart is disabled or pending.

## Cart

- `/cart` works without JavaScript and is reachable via a real `/cart` link in the footer.
- The header cart trigger is a `/cart` anchor that opens the drawer via `showModal()` after hydration.
- `window.Shopify.actions.openCart()` opens the drawer after Standard Actions loads.
- Exercise a mutation through the real Add to cart UI or the framework's cart action. Do not hand-craft an internal
  Hydrogen cart payload. Confirm the response issues the expected cart or session `Set-Cookie` and propagates the
  action's response headers.
- `handleShopifyRoutes` can intercept `/api/cart` and predictive-search requests, so the absence of a matching route
  file does not mean the handler is missing.
- Add-to-cart can open the drawer after a successful submit when the product UX chooses that behavior.
- Each line item form includes hidden `set`, scoped `lineId`, and editable `quantity`.
- Quantity Enter key submits a set action.
- Rapid quantity clicks settle to the final expected quantity.
- Line, discount, note, attribute, network, and cart-level errors appear in the right scope.
- Saving one cart attribute submits the complete next list, preserves unrelated attributes, and shows a saving state while `pending.attributes` is true. Submitting no attribute fields clears the list.
- Totals are server-provided and visually pending during cart mutations.

## Collection And Search

- Collection filters and sort update the URL and product grid.
- Reloading a filtered URL server-renders the same filter/sort state.
- Active filter chips remove one filter and preserve unrelated params.
- Search filters preserve `q`.
- JavaScript-disabled filter forms still submit with GET.
- Back/forward navigation does not leave browse state stuck in loading.

## Analytics

- Page view fires on initial load and client navigations.
- Product/collection/search/cart view events fire once per route data change.
- Cart tracking is wired once per cart store lifecycle via `trackCartAnalytics(cartStore)` (React/Vue: `useCartAnalytics()`), cart delta events fire on confirmed cart data changes, and the cart query includes `updatedAt`.
- No browser module reads private env variables.
- Analytics destinations only receive events after Shopify Customer Privacy allows analytics processing.

## Markets And Money

- Storefront API queries that should be market-aware declare `$country`, `$language`, and `@inContext`.
- Money renders from Storefront API money fields via `formatMoney()`.
- No client-side subtotal/total arithmetic exists.

## Production Pass

Build and run the production bundle. Repeat request-handler checks against production mode because dev-only middleware or development export conditions can hide broken production wiring.
