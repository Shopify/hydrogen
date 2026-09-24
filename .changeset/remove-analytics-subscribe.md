---
"@shopify/hydrogen": patch
---

**Breaking:** Remove the top-level `analytics.subscribe()` method. Register event consumers with `analytics.addDestination()` and use the `subscribe` function provided to its setup callback. All event consumers now receive consent-gated delivery and buffered replay.

```ts
analytics.addDestination({
  name: "my-destination",
  setup({ subscribe }) {
    subscribe("page_viewed", (payload, { getTrackingValues }) => {
      // Send the event to your destination.
    });
  },
});
```

The function returned by `addDestination()` removes the destination; each setup subscription also returns an unsubscribe function. Events published before consent is ready can be replayed after consent is granted, so consumers migrating from the live-only API should account for buffered events.
