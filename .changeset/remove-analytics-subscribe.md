---
"@shopify/hydrogen": minor
---

**Breaking:** Remove the top-level `analytics.subscribe()` method. Register event consumers with `analytics.addDestination()` and use the `subscribe` function provided to its setup callback. All event consumers now receive consent-gated delivery and buffered replay.

Register each destination once during browser app initialization, after ShopifyScripts has created the bus.

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

New destinations receive retained history when analytics consent allows, including events published while consent was already allowed. The buffer holds up to 500 events and is cleared when analytics consent is explicitly denied. Consumers migrating from the live-only API should account for this replay.

The function returned by `addDestination()` removes the destination; each setup subscription also returns an unsubscribe function.

Also remove `analytics.destroy()`. Hydrogen owns the shared bus for the page's lifetime. Use the cleanup function returned by `addDestination()` when intentionally removing a destination.
