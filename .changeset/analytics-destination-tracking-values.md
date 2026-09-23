---
"@shopify/hydrogen": minor
---

Add `getTrackingValues()` to analytics destination callback context. Destinations can read current `uniqueToken` and `visitToken` values from Shopify's consent API without accessing its internal globals. Each read requests fallback generation with the tag `hydrogen:<destination name>`; token generation is provided by the consent API when supported. Unavailable values are returned as empty strings, and the getter returns empty strings whenever analytics tracking is not currently allowed, even if a destination retained it and calls it after consent was revoked.

```ts
analytics.addDestination({
  name: "my-destination",
  setup({ subscribe }) {
    subscribe("page_viewed", (payload, { getTrackingValues }) => {
      const { uniqueToken, visitToken } = getTrackingValues();
      // Forward the event and tokens to your destination.
    });
  },
});
```
