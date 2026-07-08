---
name: hydrogen-analytics
description: >
  Guide for adding or reviewing Hydrogen storefront analytics. Use when working
  with createStorefrontAnalytics, AnalyticsEvent, consent mode, page/product/
  collection/search/cart view events, cart update tracking, custom analytics
  destinations, or framework route-change analytics wiring.
---

# Storefront Analytics

Hydrogen's analytics bus owns Shopify consent setup, Shopify analytics destination delivery, cart delta detection, and deprecated cookie compatibility. App code owns when to publish route/view events.

## Framework References

Before wiring route events, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and use that framework's route-change and lifecycle primitives. If there is no matching reference, keep the core singleton below and adapt page-view, product-view, collection-view, search-view, and cart tracking to the app's own route lifecycle.

For full setup details and consent nuance, also read `../hydrogen-setup/references/analytics.md`.

## Core Pattern

Render Shopify runtime scripts once from the app root/document head with the same resolved market used by Storefront API requests. Use `ShopifyScripts` from your framework binding if it exports one, or `getShopifyScriptTags()` / `renderShopifyScriptTags()` from core in other framework heads plus `initializeShopifyScripts({ routes: routeTemplates })` during browser hydration. Use the local `hydrogen-routing` skill for the required routing options. Pass `{shopId: env.SHOP_ID, storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0"}` as `shop` so Shopify scripts can initialize PerfKit. Do not pass market `country` or `language` through analytics consent config.

Create one browser-lazy singleton:

```ts
import {
  AnalyticsEvent,
  createStorefrontAnalytics,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let bus: StorefrontAnalytics | null = null;
let analyticsShop: ShopAnalytics | null = null;

export function configureAnalytics(shop: ShopAnalytics) {
  analyticsShop = shop;
}

export function getAnalyticsShop(): ShopAnalytics | null {
  return analyticsShop;
}

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  if (!analyticsShop) return null;
  bus ??= createStorefrontAnalytics({
    shop: analyticsShop,
    consent: { mode: "default-banner" },
  });
  return bus;
}
```

Read `ShopAnalytics` values on the server and pass them to client code. Do not read env APIs in browser modules.

`ShopAnalytics.shopId` must be the Shopify Shop GID. Fetch `shop { id }` from the Storefront API or read it from existing server-side app config that already stores that GID; do not invent a client env variable for it.

## Publish Events

Publish these from route/page boundaries:

- `PAGE_VIEWED` on each page transition.
- `PRODUCT_VIEWED` when product data is resolved on a product page.
- `COLLECTION_VIEWED` when collection data is resolved.
- `SEARCH_VIEWED` when a non-empty search term has results metadata.
- `CART_VIEWED` when the full cart page or cart drawer is viewed.
- `analytics.updateCart(cart)` whenever confirmed cart state resolves; do not manually publish cart delta events.

The bus defaults `shop` from `createStorefrontAnalytics({ shop })`; pass `shop` in an event payload only when intentionally overriding that configured value.

Required product analytics fields include Shopify Product GID, ProductVariant GID when available, title, price, vendor, quantity, and variant title.

## Rules

- Leave default `canTrack` in production. Do not ship `canTrack: () => true`.
- Initialize one single bus per page lifetime.
- Raw subscribers can observe events before consent; destinations receive only consent-allowed replay.
- Configure analytics before route components publish events.
- Do not dispatch server-side analytics through this browser bus.
- Keep ShopifyScripts i18n aligned with the resolved market when the storefront uses markets.
- Render ShopifyScripts separately from analytics; the bus does not emit standard script tags or load PerfKit.

## Verify

- Page view fires on initial load and client navigations.
- Product, collection, search, and cart view events fire once per relevant route data change.
- Confirmed cart data changes call `updateCart(cart)` and the cart query includes `updatedAt`.
- Consent-denied visitors do not deliver destination events.
- No browser module reads private or server-only env variables.
