# Astro Analytics

Astro is MPA-by-default. Each navigation is a full page load, so there is no client-side route-change hook to wire to. Page-view tracking goes in an inline `<script>` in the root layout:

```astro
---
// src/layouts/BaseLayout.astro
const { title } = Astro.props;
---
<html lang="en">
  <head><title>{title}</title></head>
  <body>
    <slot />
    <script>
      import { getAnalytics, AnalyticsEvent } from "../lib/analytics";
      const analytics = getAnalytics();
      if (analytics) analytics.publish(AnalyticsEvent.PAGE_VIEWED);
    </script>
  </body>
</html>
```

Astro `<script>` tags are processed and hoisted at build time — they cannot reference component-scoped variables directly. To bridge SSR data into the client script, render hidden DOM with `data-*` attributes and read them from the script:

```astro
---
// src/pages/products/[handle].astro
const product = await fetchProduct(Astro.params.handle);
---
<BaseLayout title={`${product.title} — Mock.shop`}>
  <main>{/* …product UI… */}</main>

  <div
    id="product-analytics"
    data-id={product.id}
    data-title={product.title}
    data-vendor={product.vendor}
    data-price={product.selectedOrFirstAvailableVariant?.price.amount ?? product.priceRange.minVariantPrice.amount}
    data-variant-id={product.selectedOrFirstAvailableVariant?.id ?? product.id}
    data-variant-title={product.selectedOrFirstAvailableVariant?.title ?? product.title}
    data-sku={product.selectedOrFirstAvailableVariant?.sku ?? ""}
    hidden
  ></div>

  <script>
    import { getAnalytics, AnalyticsEvent } from "../../lib/analytics";
    const el = document.getElementById("product-analytics");
    const analytics = getAnalytics();
    if (el && analytics) {
      analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
        products: [{
          id: el.dataset.id ?? "",
          title: el.dataset.title ?? "",
          price: el.dataset.price ?? "",
          vendor: el.dataset.vendor ?? "",
          variantId: el.dataset.variantId ?? el.dataset.id ?? "",
          variantTitle: el.dataset.variantTitle ?? el.dataset.title ?? "",
          quantity: 1,
          sku: el.dataset.sku || undefined,
        }],
      });
    }
  </script>
</BaseLayout>
```

If you adopt Astro's View Transitions, swap the inline page-view script for a listener on the `astro:after-swap` event instead — the inline form only fires on full page loads.

