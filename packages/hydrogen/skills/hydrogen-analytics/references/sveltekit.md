# SvelteKit Analytics

SvelteKit's `afterNavigate` hook fires on every client-side navigation. Combined with `$app/environment.browser`, the entire wiring fits in the root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { getAnalytics, AnalyticsEvent } from '$lib/analytics';

  let { children } = $props();

  afterNavigate(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  });
</script>

{@render children()}
```

Per-page view events go in the route's `$effect`. The route loader must include `product.id` and `selectedOrFirstAvailableVariant { id title sku price { amount currencyCode } }` so analytics publishes Shopify GIDs, not handles. The empty `void handle;` line is intentional — Svelte 5's `$effect` only re-runs when reactive reads happen inside it; reading `data.product.handle` once forces tracking:

```svelte
<!-- src/routes/products/[handle]/+page.svelte -->
<script lang="ts">
  import { getAnalytics, AnalyticsEvent } from '$lib/analytics';
  let { data } = $props();

  $effect(() => {
    const handle = data.product.handle;
    const variant = data.product.selectedOrFirstAvailableVariant;
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [{
        id: data.product.id,
        title: data.product.title,
        price: variant?.price.amount ?? data.product.priceRange.minVariantPrice.amount,
        vendor: data.product.vendor,
        variantId: variant?.id ?? data.product.id,
        variantTitle: variant?.title ?? data.product.title,
        quantity: 1,
        sku: variant?.sku,
      }],
    });
    void handle;
  });
</script>
```
