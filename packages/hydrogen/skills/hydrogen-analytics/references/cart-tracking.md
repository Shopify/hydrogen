# Cart Tracking

Cart events do not come from `publish()` — they come from a cart tracker subscribed to the cart store:

```ts
const stopTracking = trackCartAnalytics(cartStore);
```

Pass the cart store created by Hydrogen (`createCartStore`, or the store provided by the React/Vue `CartProvider` — the React and Vue bindings export a `useCartAnalytics()` hook/composable that does this for the provider's store). The tracker subscribes to the store itself, stores tracker state internally per analytics bus, skips pending/revalidating/note updates, and returns an unsubscribe function. It throws if `window.Shopify.analytics` is unavailable — render ShopifyScripts first — and runs change detection:

- Compares the new cart's `updatedAt` against the previous in-memory cart, against `localStorage.cartLastUpdatedAt`, and against the last emitted event ID.
- Diffs lines: removed lines emit `product_removed_from_cart`, new lines or quantity increases emit `product_added_to_cart`, quantity decreases emit `product_removed_from_cart`.
- Emits `cart_updated` first, then any line-level events.

The cart payload type is intentionally lightweight (no Hydrogen cart-type dependency):

```ts
type AnalyticsCart = {
  id: string;
  updatedAt: string;                    // required by AnalyticsCart for stable dedupe
  lines: { nodes?: AnalyticsCartLine[]; edges?: { node: AnalyticsCartLine }[] };
  [key: string]: unknown;
};
```

Manually published `AnalyticsCart` payloads (like `CART_VIEWED`) accept both `lines.nodes` and `lines.edges` (GraphQL connection) shapes at the type level; the bus forwards them unchanged, so subscribers that read lines should flatten them with the exported `flattenConnection()` helper. The cart store consumed by `trackCartAnalytics` is different: it reads `cart.lines.nodes` directly, so the app's cart query must select `lines.nodes`. The tracker falls back to the current time internally if store data is missing `updatedAt`, but include `updatedAt` in the cart query for stable dedupe.

Application code should not manually publish `cart_updated`, `product_added_to_cart`, or `product_removed_from_cart`. Always go through `trackCartAnalytics`.

