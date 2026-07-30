---
name: hydrogen-analytics
description: >
  Guide for adding or reviewing Hydrogen storefront analytics. Use when working
  with ShopifyScripts analytics, AnalyticsEvent, consent mode, page/product/
  collection/search/cart view events, cart update tracking, custom analytics
  destinations, or framework route-change analytics wiring.
---

# Storefront Analytics

Hydrogen's analytics bus owns the event API, event normalization, and consent-gated destination replay. ShopifyScripts owns Shopify consent setup, analytics CDN loading, and deprecated cookie compatibility. App code owns when to publish route/view events and when to call cart delta tracking.

## Framework References

Before wiring route events, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and use that framework's route-change and lifecycle primitives. If there is no matching reference, keep the core singleton below and adapt page-view, product-view, collection-view, search-view, and cart tracking to the app's own route lifecycle.

For full setup details and consent nuance, also read `../hydrogen-setup/references/analytics.md`.

## Core Pattern

Render Shopify runtime scripts once from the app root/document head with the same resolved market used by Storefront API requests. Use `ShopifyScripts` from your framework binding if it exports one, or `getShopifyScriptTags()` / `renderShopifyScriptTags()` from core in other framework heads. Pass `{shopId: env.SHOP_ID, storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0", myshopifyDomain: env.PUBLIC_STORE_DOMAIN}` as `shop` and pass `{country, language, currency?}` as `i18n`; resolve both on the server and serialize them into ShopifyScripts. The analytics bus is created by default; pass `analytics` only for optional bus configuration such as `customData`. Do not pass market `country` or `language` through analytics consent config.

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

`ShopAnalytics.channel` is required. Use `channel: "hydrogen"` with `hydrogenSubchannelId` for Hydrogen storefronts, or `channel: "headless"` without `hydrogenSubchannelId` for Headless storefronts.

## Publish Events

Publish these from route/page boundaries:

- `PAGE_VIEWED` on each page transition.
- `PRODUCT_VIEWED` when product data is resolved on a product page.
- `COLLECTION_VIEWED` when collection data is resolved.
- `SEARCH_VIEWED` when a non-empty search term has results metadata.
- `CART_VIEWED` when the full cart page or cart drawer is viewed.
- `trackCartAnalytics(cart)` whenever confirmed cart state resolves; do not manually publish cart delta events.

The bus defaults `shop` from the top-level `shop` config passed to ShopifyScripts; pass `shop` in an event payload only when intentionally overriding that configured value. Shopify analytics reads language and currency from `window.Shopify.locale` and `window.Shopify.currency.active`.

Required product analytics fields include Shopify Product GID, ProductVariant GID when available, title, price, vendor, quantity, and variant title.

## Rules

- Let Shopify Customer Privacy control destination delivery in production.
- Initialize one single bus per page lifetime through ShopifyScripts.
- Raw subscribers can observe events before consent; destinations receive only consent-allowed replay.
- Render ShopifyScripts before route components publish events.
- Do not dispatch server-side analytics through this browser bus.
- Keep ShopifyScripts i18n aligned with the resolved market when the storefront uses markets.

## Verify

- Page view fires on initial load and client navigations.
- Product, collection, search, and cart view events fire once per relevant route data change.
- Confirmed cart data changes call `trackCartAnalytics(cart)` and the cart query includes `updatedAt`.
- Consent-denied visitors do not deliver destination events.
- No browser module reads private or server-only env variables.
