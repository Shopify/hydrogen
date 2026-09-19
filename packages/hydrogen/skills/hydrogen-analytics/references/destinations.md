# Analytics Destinations

## Wiring third-party destinations

The bus is the right integration point for GA4, Meta Pixel, Klaviyo, etc. Register third-party analytics with `addDestination()`. The bus gates destination callbacks with Shopify Customer Privacy and replays buffered events after analytics consent is granted:

```ts
const analytics = getAnalytics();
analytics?.addDestination({
  name: "ga4",
  setup({ subscribe }) {
    subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
      if (!payload.url) return;
      window.gtag?.("event", "page_view", { page_location: payload.url });
    });
  },
});
```

Consent gating happens at the bus level before destination callbacks see the payload. Raw `analytics.subscribe()` is live-only and consent-agnostic; use `addDestination()` for logging or analytics destinations that should respect consent and replay.

---

## Development console logger

App code can add explicit destinations for development logging or third-party integrations, then publish from each route:

```ts
const cleanup = analytics.addDestination({
  name: "example-console-logger",
  setup({ subscribe }) {
    const events = [
      AnalyticsEvent.PAGE_VIEWED,
      AnalyticsEvent.PRODUCT_VIEWED,
      AnalyticsEvent.COLLECTION_VIEWED,
      AnalyticsEvent.CART_VIEWED,
      AnalyticsEvent.SEARCH_VIEWED,
    ] as const;
    const unsubscribers = events.map((event) =>
      subscribe(event, (payload) => {
        console.log(`[analytics] ${event}`, payload);
      }),
    );

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  },
});
```

Destinations are consent-gated and receive replayed buffered events once tracking is allowed.
