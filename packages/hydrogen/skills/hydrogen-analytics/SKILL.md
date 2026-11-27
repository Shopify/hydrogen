---
name: hydrogen-analytics
description: >
  Guide for adding or reviewing Hydrogen storefront analytics. Use when working
  with ShopifyScripts analytics, AnalyticsEvent, consent mode, page/product/
  collection/search/cart view events, cart update tracking, custom analytics
  destinations, or framework route-change analytics wiring.
---

# Storefront Analytics

Hydrogen's analytics bus owns the event API, event normalization, and consent-gated destination replay. ShopifyScripts owns Shopify consent setup and analytics CDN loading. App code owns when to publish route/view events and when to call cart delta tracking.

## Framework References

Before wiring route events, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and use that framework's route-change and lifecycle primitives. If there is no matching reference, keep the core singleton below and adapt page-view, product-view, collection-view, search-view, and cart tracking to the app's own route lifecycle.

Prerequisite: analytics depends on the same-origin SFAPI proxy (see `hydrogen-request-handlers`) so the browser can observe tracking values from Storefront API responses. The proxy establishes the backend session cookies needed for analytics and checkout continuity; treat analytics as incomplete until it is wired. Key consent setup: Shopify Customer Privacy controls destination delivery in production. Register event consumers with `addDestination()`; live delivery and replay require analytics consent. Do not bypass Customer Privacy consent gating in production.

## Core Pattern

Render Shopify runtime scripts once from the app root/document head with the same resolved locale used by Storefront API requests (`requestContext.locale`, also `storefrontClient.locale`). Use `ShopifyScripts` from your framework binding if it exports one, or `getShopifyScriptTags()` / `renderShopifyScriptTags()` from core in other framework heads. Pass the `shop` object matching the `ShopifyScriptsShop` type, and `i18n` matching the `ShopifyScriptsI18n` type and serialize them into ShopifyScripts. — declare them as constants with type annotations to keep errors located close to the source of writing. The analytics bus is created by default; pass `analytics` only for optional bus configuration such as `customData`. `customData` isn't added to events you publish; destinations read it via `getConfig().customData`. Do not pass market `country` or `language` through analytics consent config.

Read one browser-lazy singleton from the Shopify global created by `ShopifyScripts`:

```ts
import {
  AnalyticsEvent,
  type StorefrontAnalytics,
  trackCartAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let bus: StorefrontAnalytics | null = null;

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  bus ??= window.Shopify?.analytics ?? null;
  return bus;
}

export { trackCartAnalytics };
```

Read `shop` and `i18n` values on the server and pass them to `ShopifyScripts`. Do not read env APIs in browser modules.

In the ShopifyScripts `analytics` config, `channel` is optional and defaults to `"hydrogen"`. The `"hydrogen"` channel is the one that requires `storefrontId` — it is pulled from the ShopifyScripts `shop` config into analytics payloads. Headless storefronts pass `channel: "headless"` in the ShopifyScripts `analytics` config; the analytics payload then omits `storefrontId`, but `shop.storefrontId` itself is still required (pass `"0"` when the app has no storefront ID).

## Publish Events

Publish these from route/page boundaries:

- `PAGE_VIEWED` on each page transition.
- `PRODUCT_VIEWED` when product data is resolved on a product page.
- `COLLECTION_VIEWED` when collection data is resolved.
- `SEARCH_VIEWED` when a non-empty search term has results metadata.
- `CART_VIEWED` when the full cart page or cart drawer is viewed.
- Wire cart tracking once per cart store lifecycle with `trackCartAnalytics(cartStore)` — React apps use the `useCartAnalytics()` hook from `@shopify/hydrogen/react` and Vue apps use the `useCartAnalytics()` composable from `@shopify/hydrogen/vue`; both call it with the provider's cart store and clean up on unmount. The tracker subscribes to the cart store itself, skips pending/revalidating/note updates, publishes cart delta events on confirmed cart changes, and returns an unsubscribe function. Call it from a client-only effect (`useEffect` / `onMounted`), never at cart-store creation time — it throws when `window.Shopify.analytics` is missing (SSR). Do not manually publish cart delta events.

The bus defaults `shop` from the top-level `shop` config passed to ShopifyScripts; pass `shop` in an event payload only when intentionally overriding that configured value. Shopify analytics reads its content language from `window.Shopify.locale`. It reads the currency of product events from the event price's `currencyCode` and falls back to `window.Shopify.currency.active`, which `i18n.currency` sets. Page, collection, and search views take only the global. When it is unset, Shopify analytics sends them without a currency.

Required product analytics fields include Shopify Product GID, ProductVariant GID when available, title, price, vendor, quantity, and variant title.

## Product and Collection View Elements

Shopify's Standard Events need a `shopify:product:view` event wherever the storefront shows a product, and a `shopify:collection:view` event on each collection page. Hydrogen sends nothing on its own: place the elements yourself. `ShopifyScripts` (or `initializeShopifyScripts()`) registers them in the browser.

- Product page: wrap the product content in `<ProductView product={product} context="page">` from `@shopify/hydrogen/react` or `@shopify/hydrogen/vue`. The product needs `id`, `title`, `handle`, and `selectedOrFirstAvailableVariant`. The event fires once when the component mounts, and again when `product.id` changes, so the component needs no React or Vue `key`. Variant changes do not fire it. In React, the event fires again each time an `<Activity>` shows the page. In Vue, it fires again each time `<KeepAlive>` shows the page.
- Product cards: wrap each card root with the context that matches the list: `"collection"`, `"search"`, or `"recommendation"`. Use `"dialog"` for quick views inside a `<dialog>`. Card events fire once, when half of the element is visible, and again when the card shows a different `product.id`.
- The element is inline by default. Give card wrappers a box with a class (for example `display: block` or a grid item class), or the visibility check can't measure them.
- Optional `trigger` (`"connect"`, `"intersect"`, `"dialog"`, or `"manual"`) overrides the context's default when CSS stops it, such as `trigger="connect"` for a card with no box. With `trigger="manual"`, nothing fires on its own: in React, pass the required `elementRef` prop (a ref object or callback, not `ref`) and call `elementRef.current.dispatchViewEvent()`; in Vue, call `dispatchViewEvent()` on the component's `$el`.
- Frameworks without a binding (Solid, Svelte, others): render `VIEW_EVENT_TAG_NAME` with the attributes from `getProductViewAttributes({ product, context })` from `@shopify/hydrogen`. The element fires once each time it connects. To fire again for a new product, key the element on `product.id` with the framework's primitive, such as `{#key product.id}` in Svelte or `<Show when={product.id} keyed>` in Solid. Set the values as HTML attributes, not properties. In Solid, use `attr:view-event-trigger` and `attr:view-event-payload`, because Solid sets custom element properties in the browser. `initializeShopifyScripts()` registers the element.
- Collection page: inside `CollectionProvider`, wrap the filter and sort controls, the product grid, and the empty state in `<CollectionView collection={collection} productsCount={products.length}>` from `@shopify/hydrogen/react` or `@shopify/hydrogen/vue`. It throws outside `CollectionProvider`. The collection needs `handle` and `id` (pass `id: null` on an all-products page without a collection record). The Storefront API has no product total for a collection, so pass the number of products that the page loaded. If the page keeps loaded products in state (for example for "load more"), reset that state each time the loader data changes, for a new collection and for filter and sort changes, so the count belongs to the new results. In React, reset it during render when the loader data changes, not in an effect. Otherwise the update promise resolves with the old count. The event fires once when the component mounts, and again when `collection.handle` changes, so the component needs no React or Vue `key` for the event. In React, the event fires again each time an `<Activity>` shows the page. In Vue, it fires again each time `<KeepAlive>` shows the page. Filters, sorting, pagination, and `productsCount` changes do not fire the view event. Keep the product card `ProductView` elements inside it.
- Collection updates: `CollectionView` also sends `shopify:collection:update` for each filter or sort change that the customer makes, but not for back and forward navigation, links, or "load more". The event has the count before the change. Its promise resolves with `{ productsCount }` after the new results render, and rejects with an `AbortError` for a new collection, for back or forward navigation that leaves the change, or for an unmount. Derive `productsCount` from the same loader data as the results.
- Search updates: inside the search page's `CollectionProvider`, wrap the filters, the results, and the empty state in `<SearchUpdates query={term} totalCount={totalCount}>` from `@shopify/hydrogen/react` or `@shopify/hydrogen/vue`. It renders a `div` and sends `shopify:search:update` like `CollectionView` sends collection updates. The sort key is `PRICE` for price sorts and `RELEVANCE` for other sorts. The promise resolves with `{ totalCount }`, including `0`, so pass the Storefront API `search` `totalCount` from the same loader data as the results.
- Frameworks without a binding, and React or Vue pages without filters (no `CollectionProvider`): render `VIEW_EVENT_TAG_NAME` with the attributes from `getCollectionViewAttributes({ collection, productsCount })` from `@shopify/hydrogen`. The element fires once each time it connects. To fire again for a new collection, key the element on `collection.handle`: `key={collection.handle}` in React, `:key` in Vue, `{#key collection.handle}` in Svelte, or `<Show when={collection.handle} keyed>` in Solid. Set the values as HTML attributes, not properties. In Solid, use `attr:view-event-trigger` and `attr:view-event-payload`.
- Collection updates without a binding: call `connectCollectionUpdates(store, { target, getView })` from `@shopify/hydrogen` in the browser. `target` is the element that contains the filter and sort controls. `getView` returns the collection and the products count from the loader data. Call `notify()` in the store's browse change callback, before you navigate, and `disconnect()` on cleanup. When the view element is keyed on the collection handle, keep the connection inside the same keyed block, or reconnect to the new element:

  ```ts
  const updates = connectCollectionUpdates(store, {
    target: element,
    getView: () => ({ collection, productsCount: products.length }),
  });
  store.setOnBrowseChange(() => {
    updates.notify();
    reconciler.handleBrowseChange();
  });
  ```

  When the store settles before the page renders the new count, pass `afterRender`, such as Vue's `nextTick`. For search, call `connectSearchUpdates(store, { target, getView })` the same way, with `getView` that returns `{ query, totalCount }`.

## Rules

- Let Shopify Customer Privacy control destination delivery in production.
- Initialize one single bus per page lifetime through ShopifyScripts.
- Register event consumers with `addDestination()` and use the `subscribe` function provided to its setup callback.
- For third-party banners, use `consent: {mode: "custom-banner", setup}` and read [Custom consent providers](references/custom-consent.md) for readiness, synchronization, and framework integration.
- Render ShopifyScripts before route components publish events.
- Do not dispatch server-side analytics through this browser bus.
- Keep ShopifyScripts `i18n` aligned with `requestContext.locale` when the storefront serves several locales; pass the resolved locale, not the `defineShopifyI18n` definition.

## Verify

- Page view fires on initial load and client navigations.
- Product, collection, search, and cart view events fire once per relevant route data change.
- `shopify:product:view` fires once on the product page and once per visible product card.
- `shopify:collection:update` fires once per filter or sort change, not on back navigation or "load more", and its promise resolves with the new products count.
- `shopify:search:update` fires once per filter or sort change on the search page, not on a new search, back navigation, or "load more", and its promise resolves with the new `totalCount`, including `0`.
- Confirmed cart data changes flow through `trackCartAnalytics(cartStore)` (React/Vue bindings: `useCartAnalytics()`).
- Consent-denied visitors do not deliver destination events.
- No browser module reads private or server-only env variables.
