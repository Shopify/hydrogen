# Analytics

## Contents

- What you're installing, and what it does on its own
- Configuration
  - `shop`
  - `consent`
- The shared singleton pattern
- Root configuration examples
- Per-route view events
- Framework-specific shapes
  - SvelteKit — single-hook (cleanest case)
  - Next.js App Router — Suspense-wrapped tracker + per-page client trackers
  - Astro — inline `<script>` + hidden-data bridge (MPA pattern)
- Adapting to a new framework
- Cart Tracking
- Wiring third-party destinations
- Verify
- Common gotchas
- Anti-patterns

**Prerequisites:**

- A storefront built on `@shopify/hydrogen` with the request interceptors already wired (`handleShopifyRoutes` and `handleShopifyRedirects`). The analytics bus depends on the SFAPI proxy so the browser can observe same-origin Storefront API responses for session cookies. Without the proxy, analytics falls back to deprecated JavaScript-visible cookies and should be treated as incomplete. If you have not installed the interceptors yet, install them first with the local `hydrogen-request-handlers` skill.
- Shopify runtime scripts rendered from the root/document head. Use `ShopifyScripts` from your framework binding if it exports one, or `getShopifyScriptTags()` / `renderShopifyScriptTags()` from core in other framework heads. Pass `{country, language, currency?}` as `i18n`; pass `{shopId: env.SHOP_ID, storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0", myshopifyDomain: env.PUBLIC_STORE_DOMAIN}` as `shop`. Resolve both on the server, declare them as consts annotated with the `ShopifyScriptsShop` / `ShopifyScriptsI18n` types from `@shopify/hydrogen` (so wrong or missing fields fail typecheck where they are built), and serialize them into ShopifyScripts. ShopifyScripts creates `window.Shopify.analytics` by default and exposes the permanent domain as `window.Shopify.shop`. Analytics consent config does not accept `country` or `language`.
- A client-side lifecycle hook in your framework (route-change effect, navigation event, `<script>` tag, etc.) so view events can fire on the right URL transitions.

`ShopifyScripts` creates the zero-dependency analytics bus, sets it on `window.Shopify.analytics`, and owns Shopify consent setup, analytics CDN loading, and deprecated-cookie compatibility. Framework adapters stay thin: they translate framework lifecycle events into bus calls and wire cart delta tracking with `trackCartAnalytics()`.

## What you're installing, and what it does on its own

```
Your app code
  │
  ▼
window.Shopify.analytics
  │
  ├── publish / subscribe / addDestination / destroy  (app-facing)
  ├── raw live subscribers
  └── consent-gated destinations with replay
      │
      └── Customer Privacy gates destination delivery and replay

ShopifyScripts
  │
  ├── loads Shopify Customer Privacy script (consent + region gating)
  ├── loads Privacy Banner script in default-banner mode
  ├── loads Shopify analytics destination by default
  └── writes deprecated _shopify_y / _shopify_s cookies
```

The bus is **browser-only effective** and is created by ShopifyScripts in the browser. There is no server-side dispatch.

What the bus does for you out of the box:

- Sends `page_viewed`, `product_viewed`, `collection_viewed`, `search_viewed`, and `product_added_to_cart` events to Monorail (`https://monorail-edge.shopifysvc.com/unstable/produce_batch`) using the customer-tracking schema.
- Exposes itself on `window.Shopify.analytics` so Shopify runtime scripts can attach browser-only analytics integrations.

What it does **not** do:

- Server-side analytics dispatch.
- Third-party destination integrations (GA4, Meta Pixel, Klaviyo) — wire those with `addDestination()`.
- Cart event publishing without `trackCartAnalytics()`. App code should not manually publish `cart_updated` etc.
- DOM event ingestion or Standard Events. Explicit `publish()` is the API.

---

## Configuration

```ts
import {
  type ConsentConfig,
  type ShopifyScriptTagsOptions,
  type ShopifyScriptsShop,
  type ShopifyScriptsI18n,
} from "@shopify/hydrogen";

const shop: ShopifyScriptsShop = {
  shopId: "12345",             // numeric Shop ID or Shopify Shop GID
  storefrontId: "0",           // your storefront ID, or "0"
  myshopifyDomain: "example.myshopify.com", // permanent MyShopify domain
};

const i18n: ShopifyScriptsI18n = {
  country: "US",
  language: "EN",              // sent as Monorail content language
  currency: "USD",             // optional; sets window.Shopify.currency.active
};

const consent: ConsentConfig = {
  mode: "default-banner", // "default-banner" | "custom-banner" | "no-banner"
};

const analytics: NonNullable<ShopifyScriptTagsOptions["analytics"]> = {
  customData: { theme: "v2" },             // optional, attached to bus-generated payloads
};
```

`ShopifyScripts` loads Shopify's built-in analytics destination by default. Pass
`shopifyAnalytics: false` to `getShopifyScriptTags()` / `renderShopifyScriptTags()` if a
storefront needs to omit that CDN script.

### `shop`

Required flat shop metadata. `shopId` may be a numeric Shop ID or a Shopify Shop GID (e.g. `gid://shopify/Shop/12345`); it is normalized before the analytics bus receives it.

`shopId` and `storefrontId` are different identifiers: `shopId` identifies the shop itself (the same shop as the Customer Account API `SHOP_ID`), while `storefrontId` identifies the specific headless/Hydrogen storefront instance attached to that shop — a shop can have several storefronts, and analytics/PerfKit attribute traffic to this one. Use `"0"` when the app has no provisioned storefront ID.

Resolve shop metadata on the server and pass it to ShopifyScripts. Shopify analytics needs the shop ID, PerfKit needs the numeric shop ID plus storefront ID, and storefront components use `myshopifyDomain` through `window.Shopify.shop`.

### `i18n`

Pass the app's resolved `country` and `language` market values. Optional `currency` sets `window.Shopify.currency.active` for Shopify runtime scripts and Shopify analytics. Shopify analytics reads its content language from `window.Shopify.locale`.

### `analytics`

The analytics bus is enabled by default. Pass `analytics` only when you need optional bus configuration such as `customData`, which is attached to bus-generated payloads. Shopify analytics reads currency from `window.Shopify.currency.active`, which is seeded by `i18n.currency` and updated from cart currency when available.

### `consent`

This is where the location/region nuance lives. Shopify's hosted Customer Privacy API decides per-visitor whether tracking requires consent based on the visitor's geography:

- **Visitors in jurisdictions with consent requirements** (EU/EEA/UK GDPR, parts of Canada, California CCPA, etc.) — analytics must wait for consent. Use `mode: "default-banner"` for Shopify's hosted privacy banner, or `mode: "custom-banner"` if your app renders its own banner and calls `window.Shopify.customerPrivacy.setTrackingConsent()`.
- **Visitors in jurisdictions without consent requirements** — the Customer Privacy SDK auto-allows tracking and the banner does not render. The bus dispatches normally.

`mode` controls how consent is collected:

- `"default-banner"` loads Shopify's hosted privacy banner and waits when the Customer Privacy API says banner interaction is required.
- `"custom-banner"` loads only the Customer Privacy API and treats the initial consent event as actionable. Your banner must call `setTrackingConsent()` when the shopper accepts or declines.
- `"no-banner"` loads only the Customer Privacy API and releases analytics after consent setup. Use this only when consent is already allowed or managed outside this storefront.

### Consent Gating

Default:

```ts
() => window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() ?? false
```

This is conservative by design: if the Customer Privacy script is blocked, hasn't loaded, or is unavailable, **destination delivery is blocked**. Raw `subscribe()` listeners still see live events, but analytics destinations do not receive events until `analyticsProcessingAllowed()` returns true.

Events published before consent is ready are buffered for destinations and replayed only if analytics consent is granted. Destinations only receive supported event names they subscribe to. If the visitor explicitly denies analytics consent, the replay buffer is cleared.

Custom event names such as `custom_*` are temporarily unsupported. Publishing or subscribing to an unsupported event name logs a small warning and the event is ignored.

Do not bypass this gate in production. Shipping consent bypasses is a regulatory issue.

---

## The shared singleton pattern

Across all frameworks the right shape is **one bus per page lifetime**, created by ShopifyScripts and read lazily on the client. Resolve `shop` and `i18n` on the server, pass them to ShopifyScripts in the root layout/document head, then let route components publish through the shared global bus. Pass `i18n.currency` when Shopify runtime scripts and Shopify analytics need `window.Shopify.currency.active`. A module-level `getAnalytics()` helper works everywhere — React, Solid, Svelte, vanilla JS — and is what every framework example should use:

```ts
// app/lib/analytics.ts (or your framework's idiomatic shared-lib path)
import {
  AnalyticsEvent,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let bus: StorefrontAnalytics | null = null;

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null; // SSR no-op
  if (bus) return bus;
  bus = window.Shopify?.analytics ?? null;
  return bus;
}
```

Non-optional constraints:

- **No client env reads.** `shopId`, `storefrontId`, `myshopifyDomain`, `country`, `language`, and `currency` are safe to serialize, but they should still be resolved on the server and passed into ShopifyScripts. Do not read `process.env` or `import.meta.env` inside this browser-lazy module.
- **Root configuration before publishing.** The root route/layout should render ShopifyScripts with `shop` and `i18n` before route components publish analytics events.
- **Browser-only access.** `typeof window === 'undefined'` guard (or your framework's equivalent — SvelteKit's `$app/environment.browser`, Next.js implicit on `"use client"`) prevents reading the global bus on the server.
- **One instance per page.** The singleton means every route, every effect, every script tag shares the same bus. Multiple instances on the same page overwrite `window.Shopify.customerPrivacy.config`; the latest initialized config wins. Multi-store on one page is not supported.
- **Lazy.** Reading the bus happens on first `getAnalytics()` call. ShopifyScripts owns bus construction.

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

---

## Root configuration examples

Each framework should derive `shop` and `i18n` on the server and render ShopifyScripts before publishing. The exact env API varies by framework; these examples show the data flow, not a requirement to use these file names.

Do not query `localization.language` just to echo the language already passed to `@inContext`. If the app only knows country/language and does not have a market currency code, add `currencyCode` to the app's market config or query `localization { country { currency { isoCode } } }` as a fallback.

React root layout:

```tsx
<ShopifyScripts
  shop={{
    shopId: env.SHOP_ID,
    storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0",
    myshopifyDomain: env.PUBLIC_STORE_DOMAIN,
  }}
  i18n={{ country: market.country, language: market.language, currency: market.currencyCode }}
  consent={{ mode: "default-banner" }}
/>
```

Core renderer for non-React heads:

```ts
const shopifyTags = renderShopifyScriptTags({
  shop: {
    shopId: env.SHOP_ID,
    storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0",
    myshopifyDomain: env.PUBLIC_STORE_DOMAIN,
  },
  i18n: { country: market.country, language: market.language, currency: market.currencyCode },
  consent: { mode: "default-banner" },
});
```

Per-page trackers can then call `getAnalytics()` as shown below. They do not need to configure the bus; ShopifyScripts already put it on `window.Shopify.analytics`.

---

## Per-route view events

The bus is consent- and consent-region-aware on its own. The framework adapter is responsible for **when** to publish events — namely, on every relevant page transition. View events infer `url` from `window.location.href`, and `shop` defaults from the ShopifyScripts analytics config; pass either field only when a framework needs an explicit override.

The generic shape is:

```
On every page transition:
  analytics.publish(AnalyticsEvent.PAGE_VIEWED)

On product page mount:
  analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, { products: [...] })

On collection page mount:
  analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, { collection })

On search results page:
  analytics.publish(AnalyticsEvent.SEARCH_VIEWED, { searchTerm })

On cart view (page or drawer):
  analytics.publish(AnalyticsEvent.CART_VIEWED, { cart })

Once per cart store lifecycle, in a client-only effect after ShopifyScripts has rendered:
  trackCartAnalytics(cartStore) // subscribes to the store; emits cart_updated / product_added_to_cart / product_removed_from_cart on confirmed changes
  // never at cart-store creation time — that runs during SSR, where the analytics bus does not exist
  // React/Vue bindings: render useCartAnalytics() inside CartProvider instead
```

Required product fields for `product_viewed` and `product_added_to_cart` Monorail dispatch: `id`, `title`, `price`, `vendor`, `variantId`, `variantTitle`. `id` must be the Shopify Product GID and `variantId` must be the Shopify ProductVariant GID when one is available; handles are routing/display data, not analytics IDs. Missing fields cause the Shopify analytics subscriber to skip the Monorail event and log a field-specific error — the bus event still fires for your subscribers, only the Monorail leg drops.

`CART_VIEWED` requires `{ cart }`. `cart` is `AnalyticsCart | null`; when a compatible cart is available, include `id`, `updatedAt`, and connection-shaped `lines`, otherwise pass `cart: null` rather than a partial object. (`prevCart` belongs to the cart-change events emitted by `trackCartAnalytics`, not to `CART_VIEWED`.)

## Framework-specific shapes

The patterns below cover the main shapes a framework will land in. They are illustrative — the universal singleton above is the load-bearing piece. For frameworks not listed, see "Adapting to a new framework" below.

### SvelteKit — single-hook (cleanest case)

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

### Next.js App Router — Suspense-wrapped tracker + per-page client trackers

Next App Router pages are async server components. Effects must live in client components. The pattern: one root-level `AnalyticsTracker` for `page_viewed`, plus per-page client trackers for product/collection/search.

```tsx
// app/components/AnalyticsTracker.tsx
"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAnalytics, AnalyticsEvent } from "../lib/analytics";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [key]);

  return null;
}
```

Wrap the tracker in `<Suspense>` in the root layout. `useSearchParams()` opts the client tree out of static rendering; the Suspense boundary keeps that opt-out scoped to the tracker, not the whole layout:

```tsx
// app/layout.tsx
import { Suspense } from "react";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
```

Per-page trackers are thin client components that take server-resolved data and publish on mount:

```tsx
// app/components/ProductViewedTracker.tsx
"use client";
import { useEffect } from "react";
import { getAnalytics, AnalyticsEvent } from "../lib/analytics";

type Props = {
  product: {
    id: string;
    handle: string;
    title: string;
    vendor: string;
    selectedOrFirstAvailableVariant: {
      id: string;
      title: string;
      price: { amount: string };
      sku?: string | null;
    } | null;
    priceRange: { minVariantPrice: { amount: string } };
  };
};

export function ProductViewedTracker({ product }: Props) {
  useEffect(() => {
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [{
        id: product.id,
        title: product.title,
        price:
          product.selectedOrFirstAvailableVariant?.price.amount ??
          product.priceRange.minVariantPrice.amount,
        vendor: product.vendor,
        variantId: product.selectedOrFirstAvailableVariant?.id ?? product.id,
        variantTitle:
          product.selectedOrFirstAvailableVariant?.title ?? product.title,
        quantity: 1,
        sku: product.selectedOrFirstAvailableVariant?.sku,
      }],
    });
  }, [product.handle]);
  return null;
}
```

Render it from the (server) page component:

```tsx
// app/products/[handle]/page.tsx
export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = await fetchProduct(handle);
  return (
    <main>
      <ProductViewedTracker product={product} />
      {/* …rest of UI… */}
    </main>
  );
}
```

### Astro — inline `<script>` + hidden-data bridge (MPA pattern)

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

---

## Adapting to a new framework

Three questions, in order, decide where things go:

1. **Is there a route-change hook on the client?** (SvelteKit `afterNavigate`, Solid `useLocation` reactive read, React Router `useLocation`, etc.) That is where `page_viewed` goes. If the framework is MPA-only and has no SPA navigation, fall back to a script in the root document layout — the page-view fires on every full load.

2. **Where does per-page server-resolved data become available on the client?** That is where each view event (`product_viewed`, `collection_viewed`, etc.) goes. In React, that is a `useEffect` keyed on the resolved data. In Solid, a `createEffect` reading the async value. In Svelte 5, an `$effect`. In Astro, an inline script that reads from a data-attribute bridge.

3. **Where does the client first have the cart store?** That is where you call `trackCartAnalytics(cartStore)` once — in a client-only effect after ShopifyScripts has rendered, never at cart-store creation time (that runs during SSR, where the analytics bus does not exist yet). The tracker subscribes to the store itself, so every confirmed cart change from any source (initial fetch, mutation result, SPA navigation re-fetch, optimistic update settled) is tracked without further app code. Keep the cleanup returned by the tracker when your framework has teardown hooks. See Cart Tracking below.

The singleton + lazy-init pattern from the previous section is universal. Every framework converges on the same shape: one shared analytics module, getter that no-ops on the server, and adapters that translate framework lifecycle into `publish()` / `trackCartAnalytics()` calls.

---

## Cart Tracking

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

---

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

## Verify

After wiring, smoke-test each event in the browser dev tools:

1. **Destination log fires** — open the page with the dev console open. You should see `[analytics] page_viewed` (or whichever events you logged) after consent allows tracking. If nothing logs, either `getAnalytics()` is no-op'ing on the server, the bus is unavailable, or `analyticsProcessingAllowed()` is false.
2. **Monorail request fires** — Network tab, filter for `monorail-edge.shopifysvc.com`. A `produce_batch` POST should land within ~1s of consent being granted (or immediately if the visitor is in a no-consent-required region). If it never fires, either consent has not been granted, the schemas are missing required fields (check console for warnings about missing `id`/`title`/`vendor`/etc.), or `hasUserConsent` is false on the payload.
3. **Per-route navigation fires page_viewed** — click around. Each navigation should produce a fresh `page_viewed` event. If only the initial page load fires, the route-change hook is wired wrong (e.g. effect dependency missing in React, reactive read missing in Solid).
4. **Cart events fire** — add an item to the cart. You should see `cart_updated` followed by `product_added_to_cart`. If you see `cart_updated` repeating with the same payload, the dedupe key (`updatedAt`) is stale — confirm your cart query selects `updatedAt`.
5. **Privacy banner renders for EU/UK visitors** — if `mode: "default-banner"`, simulate a GDPR-protected region with browser dev-tools location override or VPN. The banner should render. If it does not, check that `cdn.shopify.com` is not blocked by your CSP.

For production, re-verify against the production bundle. Several gotchas only appear once the SSR/CSR boundary stabilizes.

---

## Common gotchas

- **Replay is destination-only.** Raw `analytics.subscribe()` listeners only receive live events. `analytics.addDestination()` callbacks receive consent-gated live events plus buffered replay after analytics consent is granted. If the visitor explicitly denies analytics consent, the buffer is cleared and those pre-denial events are never replayed.
- **The singleton must be lazy.** Reading the global bus at module top-level can run on the server during SSR and crash on `window` access. Always wrap in a `typeof window === 'undefined'` guard.
- **Use the right shop shape for each API.** `ShopifyScripts` accepts a numeric Shop ID or Shopify Shop GID plus `storefrontId` and the permanent `myshopifyDomain`; the analytics bus normalizes `shop.shopId` to a Shopify Shop GID before dispatch, while the bootstrap exposes the domain as `window.Shopify.shop`.
- **Customer Privacy script blocked by CSP.** If your CSP does not allow `cdn.shopify.com`, the consent script never loads, `analyticsProcessingAllowed()` stays `false`, and destination events never deliver. Check Network tab for blocked requests; add `cdn.shopify.com` to `script-src`.
- **`mode: "no-banner"` is wrong for any storefront with EU/UK/CA visitors unless consent is handled elsewhere.** Without a hosted or custom banner, those visitors have no UI to grant consent — destination events never deliver. Default to `mode: "default-banner"` unless you have a custom consent UI that calls `setTrackingConsent()`.
- **Multiple bus instances on the same page conflict.** `window.Shopify.customerPrivacy.config` is global; the latest initialized config wins. Multi-store-per-page is not supported. Use one bus per active storefront shell.
- **Astro inline scripts cannot reference component scope.** Astro hoists `<script>` tags at build time. Bridge SSR data through hidden DOM (`data-*` attributes) and read it from the script. Trying to interpolate `{product.id}` directly into a script body silently fails — the script ships as a static string.
- **Astro page-view fires only on full loads.** Astro is MPA-by-default. If you adopt View Transitions, listen for `astro:after-swap` instead of relying on the inline-script-runs-on-load behavior — otherwise SPA-nav transitions skip `page_viewed`.
- **Required product fields silently drop the Monorail leg.** Missing `id`/`title`/`vendor`/`variantId`/`variantTitle`/`price` causes the Shopify analytics subscriber to skip Monorail dispatch and log a field-specific error. The bus event still fires for your subscribers — the loss is only in Shopify analytics. Watch the console.
- **`updatedAt` missing from cart query weakens dedupe.** The cart tracker prefers cart `updatedAt`, but falls back to the current time when it is absent. Include `updatedAt` in cart queries for stable dedupe across navigations and reloads.
- **`destroy()` is not called by any of the framework adapter sketches.** During HMR or React Strict Mode double-mount, this means duplicate event subscribers and possibly duplicate Monorail events in dev. For production this is rarely visible (one bus per page lifetime). If duplicate dev events bother you, wire `analytics.destroy()` into your framework's teardown (React effect cleanup, Svelte `onDestroy`, Solid `onCleanup`, or equivalent).
- **Lighthouse skip is silent.** Monorail dispatch is skipped for Chrome Lighthouse user-agents. If your synthetic monitoring runs Lighthouse, you will see no Monorail requests in those runs — this is intentional.

---

## Anti-patterns

- **Don't construct the bus on the server.** SSR has no `window`, no consent SDK, and no useful behavior. Constructing on the server initializes browser internals against undefined globals and crashes — or worse, no-ops silently and ships analytics-free.
- **Don't manually publish `cart_updated` / `product_added_to_cart` / `product_removed_from_cart`.** These events come from `trackCartAnalytics(cartStore)`'s diff. Manual publishing bypasses the dedupe and produces duplicate or contradictory cart history.
- **Don't reimplement consent.** Shopify's Customer Privacy SDK already implements region-aware gating. Trying to replace that logic almost always introduces regulatory exposure.
- **Don't reimplement Monorail dispatch.** If you need a third-party destination, register it with `addDestination()` and forward from there — do not parallel-publish to Monorail yourself.
- **Don't put per-route view events in a global subscriber.** A single subscriber that watches `page_viewed` and synthesizes `product_viewed` from URL parsing is brittle and loses payload context. Publish each view event from the route that has the data.
- **Don't construct multiple buses for "different consent contexts" on the same page.** Customer Privacy config is global; the latest initialized config takes effect. If you need conditional behavior, branch inside subscribers, not at construction.
- **Don't skip the request-handler prerequisite.** Without the SFAPI proxy, modern same-origin Shopify cookies cannot be set. Analytics may appear to work via deprecated JS-visible cookies, but session continuity into checkout breaks. Treat analytics as incomplete until the proxy is live in production.
