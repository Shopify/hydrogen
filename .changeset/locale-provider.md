---
"@shopify/hydrogen": minor
---

Fix carts and predictive search using the default locale on storefronts that serve locales under a path prefix. The browser sent cart and predictive search requests to `/api/cart` and `/api/predictive-search` from every page, so a cart created from `/fr-ca` was created and priced in the default market.

Add `LocaleProvider` and `useLocale` to `@shopify/hydrogen/react` and `@shopify/hydrogen/vue`. Pass the request's locale through your loader data and wrap your app in `LocaleProvider`, above the cart and predictive search providers:

```tsx
// root loader: return { locale: requestContext.locale, cartData }
<LocaleProvider locale={loaderData.locale}>
  <CartProvider initialData={loaderData.cartData}>
    <App />
  </CartProvider>
</LocaleProvider>
```

- Inside `LocaleProvider`, the cart provider sends its requests to `/fr-ca/api/cart`, and cart and product forms post there. `PredictiveSearchProvider` requests `/fr-ca/api/predictive-search`, and its form submits to `/fr-ca/search`. A custom cart endpoint, `predictiveSearchEndpoint`, or `searchAction` that starts with `/` gets the prefix too. Absolute URLs are used as they are.
- `useLocale()` returns the request's `{language, country, pathPrefix}` for your own links and requests.
- The cart and predictive search routes have to answer under the locale prefix. Handlers registered with `handleShopifyRoutes` already do. Path-based rules for `/api/cart` and `/api/predictive-search`, such as rate limits, need the prefixed paths too.
- Storefronts with one locale, or with one domain per locale, need no changes.
- Hydrogen keeps one locale per page load. Change locale with a full page load, such as a plain link built with `getLocalizedHref`. In development, Hydrogen logs a warning when a page under a locale prefix has no `LocaleProvider`, when `LocaleProvider` and `ShopifyScripts` receive different locales, and when a client-side navigation leaves the page's locale prefix.
- `configureCartEndpoint` now works with the React and Vue cart providers, which used to reset the endpoint to `/api/cart` when they mounted. Call it at module scope in code that runs on the server and in the browser, and pass the path without a locale prefix.
- Fix server rendering hanging when `configureCartEndpoint` ran on the server and the cart streamed in through `initialData`.
- Without the React or Vue bindings, add the prefix yourself in the browser: ``configureCartEndpoint(`${locale.pathPrefix}/api/cart`)`` and ``createPredictiveSearchStore({ predictiveSearchEndpoint: `${locale.pathPrefix}/api/predictive-search` })``.
