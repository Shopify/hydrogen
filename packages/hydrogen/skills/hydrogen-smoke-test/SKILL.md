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

## Static Checks

Run the app's available scripts:

1. Formatting fixer, if present.
2. `lint`, `typecheck`, or `check`.
3. GraphQL validation (`gql.tada check`) when `gql()` documents changed.
4. `build`.
5. `test`.
6. Formatting check, if distinct from the fixer.

## Request Handlers

Replace `<port>` with the running app port:

```bash
curl -i -X POST http://localhost:<port>/api/2026-04/graphql.json \
  -H "content-type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: <public-token>" \
  -d '{"query":"{ shop { name } }"}'
```

Expected: Storefront API JSON, not the framework 404.

Use the Storefront API version configured by the app when it differs from `2026-04`. The SFAPI proxy forwards the incoming public token header; it does not inject a token from server config.

```bash
curl -i http://localhost:<port>/api/cart
```

Expected: cart JSON, not 404.

```bash
curl -i http://localhost:<port>/admin
```

Expected: redirect to `/admin` on the configured shop/admin domain.

```bash
curl -i http://localhost:<port>/this-does-not-exist
```

Expected: framework 404 unless Shopify has a matching URL redirect.

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

- `/cart` works without JavaScript.
- Drawer opens from the header cart trigger after hydration and `/cart` remains the no-JS fallback.
- `window.Shopify.actions.openCart()` opens the drawer after Standard Actions loads.
- Add-to-cart can open the drawer after a successful submit when the product UX chooses that behavior.
- Each line item form includes hidden `set`, scoped `lineId`, and editable `quantity`.
- Quantity Enter key submits a set action.
- Rapid quantity clicks settle to the final expected quantity.
- Line, discount, note, network, and cart-level errors appear in the right scope.
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
- `analytics.updateCart(cart)` runs when confirmed cart data changes, and the cart query includes `updatedAt`.
- No browser module reads private env variables.
- Production does not override `canTrack` to always true.

## Markets And Money

- Storefront API queries that should be market-aware declare `$country`, `$language`, and `@inContext`.
- Money renders from Storefront API money fields via `formatMoney()`.
- No client-side subtotal/total arithmetic exists.

## Production Pass

Build and run the production bundle. Repeat request-handler checks against production mode because dev-only middleware or development export conditions can hide broken production wiring.
