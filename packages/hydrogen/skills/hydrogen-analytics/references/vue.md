# Vue And Nuxt

Use a shared singleton module plus a plugin/component that configures it on the client.

## Singleton

```ts
import {
  AnalyticsEvent,
  createStorefrontAnalytics,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let analytics: StorefrontAnalytics | null = null;
let shop: ShopAnalytics | null = null;

export function configureAnalytics(nextShop: ShopAnalytics) {
  shop = nextShop;
}

export function getAnalyticsShop() {
  return shop;
}

export function getAnalytics() {
  if (!import.meta.client) return null;
  if (!shop) return null;
  analytics ??= createStorefrontAnalytics({
    shop,
    consent: { mode: "default-banner" },
  });
  return analytics;
}
```

## Nuxt Client Plugin

Read safe shop metadata from runtime config or server payload, then configure the singleton in a client plugin:

```ts
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public;
  configureAnalytics({
    shopId: config.shopId,
    acceptedLanguage: "EN",
    currency: "USD",
    hydrogenSubchannelId: config.storefrontId ?? "0",
  });
});
```

Do not expose private tokens through runtime public config.

## Page Views

Use a client plugin or root component watcher:

```ts
export default defineNuxtPlugin(() => {
  const router = useRouter();
  router.afterEach(() => {
    const analytics = getAnalytics();
    const shop = getAnalyticsShop();
    if (!analytics || !shop) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop,
    });
  });
});
```

## Product, Collection, Search

Use `onMounted` or `watch` keyed on resolved route data:

```ts
onMounted(() => {
  const analytics = getAnalytics();
  const shop = getAnalyticsShop();
  if (!analytics || !shop) return;
  analytics.publish(AnalyticsEvent.SEARCH_VIEWED, {
    searchTerm: term.value,
    searchResults: { totalCount: totalCount.value },
    url: window.location.href,
    shop,
  });
});
```

Avoid publishing view events before server data is available.

## Cart Updates

Watch the cart store's confirmed cart data and call `analytics.updateCart(cart)`. Let the bus publish derived cart delta events.
