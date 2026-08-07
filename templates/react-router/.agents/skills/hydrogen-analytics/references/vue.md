# Vue And Nuxt

Use `ShopifyScripts` in the app root/head, then read the shared bus from the Shopify global.

## Singleton

```ts
import {
  AnalyticsEvent,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let analytics: StorefrontAnalytics | null = null;

export function getAnalytics() {
  if (!import.meta.client) return null;
  analytics ??= window.Shopify?.analytics ?? null;
  return analytics;
}
```

## Nuxt Client Plugin

Render `ShopifyScripts` with top-level `shop` and `i18n` in the app root/head. A client plugin can then read the global bus directly:

```ts
export default defineNuxtPlugin(() => {
  const analytics = getAnalytics();
  analytics?.addDestination({
    name: "example-console-logger",
    setup({ subscribe }) {
      return subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
        console.log("[analytics] page_viewed", payload);
      });
    },
  });
});
```

Do not expose private tokens through runtime public config.

## Page Views

Use a client plugin or root component watcher. View events infer `url` from `window.location.href`; pass `url` only for an explicit override:

```ts
export default defineNuxtPlugin(() => {
  const router = useRouter();
  router.afterEach(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  });
});
```

## Product, Collection, Search

Use `onMounted` or `watch` keyed on resolved route data:

```ts
onMounted(() => {
  const analytics = getAnalytics();
  if (!analytics) return;
  analytics.publish(AnalyticsEvent.SEARCH_VIEWED, {
    searchTerm: term.value,
    searchResults: { totalCount: totalCount.value },
  });
});
```

Avoid publishing view events before server data is available.

## Cart Updates

Call the `useCartAnalytics()` composable from `@shopify/hydrogen/vue` in a component rendered inside the `CartProvider` returned by `createCartComponents()` (the Vue entry exports no standalone `CartProvider`). It subscribes the provider's cart store on mount, skips pending/revalidating/note updates, publishes derived cart delta events through the global analytics bus on confirmed cart changes, and unsubscribes when the component is disposed. If the app owns its cart store directly (`createCartStore` from `@shopify/hydrogen`), call `trackCartAnalytics(store)` once instead, from a client-only effect (`onMounted`) — never at cart-store creation time, since it throws when `window.Shopify.analytics` is missing during SSR. It returns an unsubscribe function.

If a component reads cart state directly, wait while `cart.revalidating === true || cart.pending.cost === true || cart.pending.note` is true so optimistic or revalidating cart changes do not publish as settled analytics.
