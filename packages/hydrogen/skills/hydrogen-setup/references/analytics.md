# Analytics

**Prerequisites:**

- A storefront built on `@shopify/hydrogen` with the request interceptors already wired (`handleShopifyRoutes` and `handleShopifyRedirects`). The analytics bus depends on the SFAPI proxy so the browser can observe same-origin Storefront API responses for session cookies. Without the proxy, analytics falls back to deprecated JavaScript-visible cookies and should be treated as incomplete. If you have not installed the interceptors yet, install them first with the local `hydrogen-request-handlers` skill.
- Shopify runtime scripts rendered from the root/document head. Use `ShopifyScripts` from your framework binding if it exports one, or `getShopifyScriptTags()` / `renderShopifyScriptTags()` from core in other framework heads plus `initializeShopifyScripts({ routes: routeTemplates })` during browser hydration. Use the local `hydrogen-routing` skill for the required routing options. Pass the resolved market as `i18n`; pass `{shopId: env.SHOP_ID, storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0"}` as `shop` when loading PerfKit. Analytics consent config does not accept `country` or `language`.
- A client-side lifecycle hook in your framework (route-change effect, navigation event, `<script>` tag, etc.) so view events can fire on the right URL transitions.

`createStorefrontAnalytics()` is a zero-dependency event bus that owns Shopify consent setup, Monorail dispatch, cart change detection, and deprecated-cookie compatibility. Framework adapters stay thin — they translate framework lifecycle events into bus calls.

## What you're installing, and what it does on its own

```
Your app code
  │
  ▼
createStorefrontAnalytics(options)
  │
  ├── publish / subscribe / addDestination / updateCart / destroy  (app-facing)
  ├── raw live subscribers
  └── consent-gated destinations with replay
  │
  ├── (browser only)
  │     ├── loads Shopify Customer Privacy script (consent + region gating)
  │     ├── loads Privacy Banner script in default-banner mode
  │     ├── loads Shopify analytics destination by default
  │     ├── dispatches Trekkie + customer schemas to Monorail from that destination
  │     └── writes deprecated _shopify_y / _shopify_s cookies
  │
  └── canTrack() gates destination delivery and replay
```

The bus is **browser-only effective**. On the server it can be constructed, but browser internals (consent, Monorail, cookies) skip — there is no server-side dispatch.

What the bus does for you out of the box:

- Loads `cdn.shopify.com/shopifycloud/consent-tracking-api/v0.2/consent-tracking-api.js`.
- Loads `cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js` in `mode: "default-banner"`.
- Publishes `window.Shopify.customerPrivacy.config` with headless consent config before the SDK initializes.
- Sends `page_viewed`, `product_viewed`, `collection_viewed`, `search_viewed`, and `product_added_to_cart` events to Monorail (`https://monorail-edge.shopifysvc.com/unstable/produce_batch`) using Trekkie + customer-tracking schemas.
- Diff-detects cart changes from `updateCart()` calls and emits `cart_updated` / `product_added_to_cart` / `product_removed_from_cart` with line-level deltas.
- Exposes itself on `window.Shopify.analytics` so Shopify runtime scripts can attach browser-only integrations such as PerfKit SPA navigation.

What it does **not** do:

- Server-side analytics dispatch.
- Rendering Shopify runtime script/link tags. Install ShopifyScripts separately in the app root/document head and pass its `{shopId, storefrontId}` `shop` when PerfKit should load.
- Third-party destination integrations (GA4, Meta Pixel, Klaviyo) — wire those with `addDestination()`.
- Cart event publishing without `updateCart()`. App code should not manually publish `cart_updated` etc.
- DOM event ingestion or Standard Events. Explicit `publish()` is the API.

---

## Configuration

```ts
import {
  createStorefrontAnalytics,
  AnalyticsEvent,
  type ShopAnalytics,
  type ConsentConfig,
} from "@shopify/hydrogen";

const analytics = createStorefrontAnalytics({
  shop: {
    shopId: "gid://shopify/Shop/12345",     // must be a Shopify Shop GID
    acceptedLanguage: "EN",                 // sent as Monorail content language
    currency: "USD",                        // ISO currency code
    hydrogenSubchannelId: "0",              // your storefront ID, or '0'
  },
  consent: {
    publicStorefrontAccessToken: "<public 32-char token>", // optional, public token only
    consentDomain: "www.my-store.com",      // optional; defaults to window.location.host
    mode: "default-banner",                 // "default-banner" | "custom-banner" | "no-banner"
  },
  // canTrack defaults to window.Shopify.customerPrivacy.analyticsProcessingAllowed()
  // shopifyAnalytics defaults to true; set false to disable Shopify's built-in destination
  customData: { theme: "v2" },              // optional, attached to bus-generated payloads
  cookieDomain: ".my-store.com",            // optional, only affects deprecated cookies
});
```

### `shop`

Flat analytics metadata. **`shopId` must be a Shopify Shop GID** (e.g. `gid://shopify/Shop/12345`); not a numeric ID and not a domain.

Create the bus after shop metadata is ready. Shopify analytics needs the shop GID at dispatch time. `ShopifyScripts` uses a separate `shop` shape for PerfKit: `{shopId: env.SHOP_ID, storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0"}`.

### `consent`

This is where the location/region nuance lives. Shopify's hosted Customer Privacy API decides per-visitor whether tracking requires consent based on the visitor's geography:

- **Visitors in jurisdictions with consent requirements** (EU/EEA/UK GDPR, parts of Canada, California CCPA, etc.) — analytics must wait for consent. Use `mode: "default-banner"` for Shopify's hosted privacy banner, or `mode: "custom-banner"` if your app renders its own banner and calls `window.Shopify.customerPrivacy.setTrackingConsent()`.
- **Visitors in jurisdictions without consent requirements** — the Customer Privacy SDK auto-allows tracking and the banner does not render. The bus dispatches normally.

`publicStorefrontAccessToken` is optional. If provided, it must be the public token. The bus logs an error if it appears to be a `shpat_*` private token or is not 32 characters.

`consentDomain` overrides the domain used for consent configuration and browser consent-cookie queries. Pass a host without protocol. If omitted, the bus uses `window.location.host` and assumes the SFAPI proxy is available.

`mode` controls how consent is collected:

- `"default-banner"` loads Shopify's hosted privacy banner and waits when the Customer Privacy API says banner interaction is required.
- `"custom-banner"` loads only the Customer Privacy API and waits when banner interaction is required. Your banner must call `setTrackingConsent()`.
- `"no-banner"` loads only the Customer Privacy API and releases analytics after consent setup. Use this only when consent is already allowed or managed outside this storefront.

### `canTrack` — DO NOT override in production

Default:

```ts
() => window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() ?? false
```

This is conservative by design: if the Customer Privacy script is blocked, hasn't loaded, or is unavailable, **destination delivery is blocked**. Raw `subscribe()` listeners still see live events, but analytics destinations do not receive events until `canTrack()` returns true.

Events published before consent is ready are buffered for destinations and replayed only if analytics consent is granted. Destinations only receive supported event names they subscribe to. If the visitor explicitly denies analytics consent, the replay buffer is cleared.

Custom event names such as `custom_*` are temporarily unsupported. Publishing or subscribing to an unsupported event name logs a small warning and the event is ignored.

`canTrack: () => true` exists for **development and testing only**. Shipping it to production bypasses consent for every visitor in every jurisdiction, which is a regulatory issue. Leave the default in production.

If you need to enforce additional rules on top of the SDK (e.g. "respect a custom user setting"), wrap the default:

```ts
canTrack: () =>
  (window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() ?? false) &&
  myCustomConsentCheck(),
```

### `cookieDomain`

Only affects deprecated JS-visible cookies (`_shopify_y`, `_shopify_s`) — preserved for downstream systems still reading them. Modern http-only Shopify cookies are set by same-origin Storefront API traffic through your proxy, not by this option.

---

## The shared singleton pattern

Across all frameworks the right shape is **one bus per page lifetime**, lazily created on the client. Resolve `ShopAnalytics` on the server, then pass those safe values into the client analytics module from a root layout/loader boundary. `shopId` is the Shopify Shop GID, so fetch `shop { id }` from the Storefront API or read it from existing server-side app config that already stores that GID. Use the app's resolved market/i18n data for `acceptedLanguage` and `currency`. A module-level singleton with `configureAnalytics()` and `getAnalytics()` works everywhere — React, Solid, Svelte, vanilla JS — and is what every framework example should use:

```ts
// app/lib/analytics.ts (or your framework's idiomatic shared-lib path)
import {
  createStorefrontAnalytics,
  AnalyticsEvent,
  type StorefrontAnalytics,
  type ShopAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let bus: StorefrontAnalytics | null = null;
let analyticsShop: ShopAnalytics | null = null;

export function configureAnalytics(shop: ShopAnalytics) {
  analyticsShop = shop;
}

export function getAnalyticsShop(): ShopAnalytics | null {
  return analyticsShop;
}

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null; // SSR no-op
  if (!analyticsShop) return null;
  if (bus) return bus;
  bus = createStorefrontAnalytics({
    shop: analyticsShop,
    consent: {
      mode: "default-banner",
    },
    // canTrack: leave default in production — see the consent section.
  });
  return bus;
}
```

Non-optional constraints:

- **No client env reads.** `shopId`, `acceptedLanguage`, `currency`, and `hydrogenSubchannelId` are safe to serialize, but they should still be resolved on the server and passed into `configureAnalytics()`. Do not read `process.env` or `import.meta.env` inside this browser-lazy module.
- **Root configuration before publishing.** The root route/layout should resolve the safe `ShopAnalytics` object on the server and call `configureAnalytics(shop)` during client hydration before route components publish analytics events.
- **Browser-only initialization.** `typeof window === 'undefined'` guard (or your framework's equivalent — SvelteKit's `$app/environment.browser`, Next.js implicit on `"use client"`) prevents construction on the server. SSR rendering must not call `createStorefrontAnalytics`.
- **One instance per page.** The singleton means every route, every effect, every script tag shares the same bus. Multiple instances on the same page overwrite `window.Shopify.customerPrivacy.config`; the latest initialized config wins. Multi-store on one page is not supported.
- **Lazy.** Construction happens on first `getAnalytics()` call. This avoids running consent scripts during initial paint when the page may not need analytics yet (e.g. a redirect target).

App code can subscribe for development logging or raw live observers, then publishes from each route:

```ts
// One-time setup (e.g. on first call to getAnalytics()):
for (const event of [
  AnalyticsEvent.PAGE_VIEWED,
  AnalyticsEvent.PRODUCT_VIEWED,
  AnalyticsEvent.COLLECTION_VIEWED,
  AnalyticsEvent.CART_VIEWED,
  AnalyticsEvent.SEARCH_VIEWED,
] as const) {
  bus.subscribe(event, (payload) => {
    // forward to your destinations here, or just log in dev
    console.log(`[analytics] ${event}`, payload);
  });
}
```

Subscribers run in insertion order. Subscriber errors are caught; one bad subscriber will not break others.

---

## Root configuration examples

Each framework should derive `ShopAnalytics` on the server and configure the client singleton before publishing. The exact env API varies by framework; these examples show the data flow, not a requirement to use these file names.

Example Storefront API query for frameworks that do not already have the Shop GID in app config:

```ts
import { gql } from "@shopify/hydrogen";

const SHOP_ANALYTICS_QUERY = gql(`
  query ShopAnalytics {
    shop { id }
  }
`);
```

Do not query `localization.language` just to echo the language already passed to `@inContext`. If the app only knows country/language and does not have a market currency code, add `currencyCode` to the app's market config or query `localization { country { currency { isoCode } } }` as a fallback.

SvelteKit server load:

```ts
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { data } = await locals.storefront.graphql(SHOP_ANALYTICS_QUERY);

  return {
    analyticsShop: {
      shopId: data.shop.id,
      acceptedLanguage: locals.market.language,
      currency: locals.market.currencyCode,
      hydrogenSubchannelId: process.env.PUBLIC_STOREFRONT_ID ?? "0",
    },
  };
};
```

SvelteKit root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { configureAnalytics } from '$lib/analytics';

  let { data, children } = $props();
  configureAnalytics(data.analyticsShop);
</script>

{@render children()}
```

Next.js App Router server layout:

```tsx
// app/layout.tsx
import { Suspense } from "react";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

async function getAnalyticsShop() {
  const { data } = await storefrontClient.graphql(SHOP_ANALYTICS_QUERY);

  return {
    shopId: data.shop.id,
    acceptedLanguage: market.language,
    currency: market.currencyCode,
    hydrogenSubchannelId: process.env.PUBLIC_STOREFRONT_ID ?? "0",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const analyticsShop = await getAnalyticsShop();

  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AnalyticsTracker shop={analyticsShop} />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
```

Next.js client tracker configuration:

```tsx
// app/components/AnalyticsTracker.tsx
"use client";
import { useEffect } from "react";
import type { ShopAnalytics } from "@shopify/hydrogen";
import { configureAnalytics, getAnalytics, AnalyticsEvent } from "../lib/analytics";

export function AnalyticsTracker({ shop }: { shop: ShopAnalytics }) {
  useEffect(() => {
    configureAnalytics(shop);
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [shop]);

  return null;
}
```

Astro root layout:

```astro
---
// src/layouts/BaseLayout.astro
const { data } = await storefrontClient.graphql(SHOP_ANALYTICS_QUERY);
const analyticsShop = {
  shopId: data.shop.id,
  acceptedLanguage: market.language,
  currency: market.currencyCode,
  hydrogenSubchannelId: process.env.PUBLIC_STOREFRONT_ID ?? "0",
};
---

<html lang="en">
  <body>
    <slot />
    <div id="analytics-shop" data-shop={JSON.stringify(analyticsShop)} hidden></div>
    <script>
      import { configureAnalytics } from "../lib/analytics";
      const el = document.getElementById("analytics-shop");
      if (el instanceof HTMLElement && el.dataset.shop) {
        configureAnalytics(JSON.parse(el.dataset.shop));
      }
    </script>
  </body>
</html>
```

Per-page trackers can then call `getAnalytics()` / `getAnalyticsShop()` as shown below. If a page tracker may mount without the root tracker, pass the same `shop` object into that tracker and call `configureAnalytics(shop)` in the tracker before publishing.

---

## Per-route view events

The bus is consent- and consent-region-aware on its own. The framework adapter is responsible for **when** to publish events — namely, on every relevant page transition. View events infer `url` from `window.location.href`, and `shop` defaults from `createStorefrontAnalytics({ shop })`; pass either field only when a framework needs an explicit override.

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
  analytics.publish(AnalyticsEvent.CART_VIEWED, { cart, prevCart })

Whenever cart state resolves (any source — fetch, mutation, SPA nav):
  analytics.updateCart(cart) // bus emits cart_updated / product_added_to_cart / product_removed_from_cart
```

Required product fields for `product_viewed` and `product_added_to_cart` Monorail dispatch: `id`, `title`, `price`, `vendor`, `variantId`, `variantTitle`. `id` must be the Shopify Product GID and `variantId` must be the Shopify ProductVariant GID when one is available; handles are routing/display data, not analytics IDs. Missing fields cause the Shopify analytics subscriber to skip the Monorail event and log a field-specific error — the bus event still fires for your subscribers, only the Monorail leg drops.

`CART_VIEWED` requires `{ cart, prevCart }`. `cart` and `prevCart` are `AnalyticsCart | null`; when a compatible cart is available, include `id`, `updatedAt`, and connection-shaped `lines`, otherwise pass `cart: null` rather than a partial object.

## Framework-specific shapes

The patterns below cover the main shapes a framework will land in. They are illustrative — the universal singleton above is the load-bearing piece. For frameworks not listed, see "Adapting to a new framework" below.

### SvelteKit — single-hook (cleanest case)

SvelteKit's `afterNavigate` hook fires on every client-side navigation. Combined with `$app/environment.browser`, the entire wiring fits in the root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { configureAnalytics, getAnalytics, AnalyticsEvent } from '$lib/analytics';

  let { data, children } = $props();
  configureAnalytics(data.analyticsShop);

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
import type { ShopAnalytics } from "@shopify/hydrogen";
import { usePathname, useSearchParams } from "next/navigation";
import { configureAnalytics, getAnalytics, AnalyticsEvent } from "../lib/analytics";

export function AnalyticsTracker({ shop }: { shop: ShopAnalytics }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    configureAnalytics(shop);
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [key, shop]);

  return null;
}
```

Wrap the tracker in `<Suspense>` in the root layout. `useSearchParams()` opts the client tree out of static rendering; the Suspense boundary keeps that opt-out scoped to the tracker, not the whole layout:

```tsx
// app/layout.tsx
import { Suspense } from "react";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

async function getAnalyticsShop() {
  const { data } = await storefrontClient.graphql(SHOP_ANALYTICS_QUERY);

  return {
    shopId: data.shop.id,
    acceptedLanguage: market.language,
    currency: market.currencyCode,
    hydrogenSubchannelId: process.env.PUBLIC_STOREFRONT_ID ?? "0",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const analyticsShop = await getAnalyticsShop();

  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AnalyticsTracker shop={analyticsShop} />
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
import type { ShopAnalytics } from "@shopify/hydrogen";
import { configureAnalytics, getAnalytics, AnalyticsEvent } from "../lib/analytics";

type Props = {
  shop: ShopAnalytics;
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

export function ProductViewedTracker({ product, shop }: Props) {
  useEffect(() => {
    configureAnalytics(shop);
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
  }, [product.handle, shop]);
  return null;
}
```

Render it from the (server) page component:

```tsx
// app/products/[handle]/page.tsx
export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = await fetchProduct(handle);
  const analyticsShop = await getAnalyticsShop();
  return (
    <main>
      <ProductViewedTracker product={product} shop={analyticsShop} />
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
const { data } = await storefrontClient.graphql(SHOP_ANALYTICS_QUERY);
const analyticsShop = {
  shopId: data.shop.id,
  acceptedLanguage: market.language,
  currency: market.currencyCode,
  hydrogenSubchannelId: process.env.PUBLIC_STOREFRONT_ID ?? "0",
};
---
<html lang="en">
  <head><title>{title}</title></head>
  <body>
    <slot />
    <div id="analytics-shop" data-shop={JSON.stringify(analyticsShop)} hidden></div>
    <script>
      import { configureAnalytics, getAnalytics, AnalyticsEvent } from "../lib/analytics";
      const shopConfig = document.getElementById("analytics-shop");
      if (shopConfig instanceof HTMLElement && shopConfig.dataset.shop) {
        configureAnalytics(JSON.parse(shopConfig.dataset.shop));
      }
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

3. **Where is cart state resolved?** That is where you call `analytics.updateCart(cart)` — see Cart Tracking below. This must fire on every cart change from any source (initial fetch, mutation result, SPA navigation re-fetch, optimistic update settled). The cart tracker dedupes — extra calls are cheap, missed calls are silent data loss.

The singleton + lazy-init pattern from the previous section is universal. Every framework converges on the same shape: one shared analytics module, getter that no-ops on the server, and adapters that translate framework lifecycle into `publish()` / `updateCart()` calls.

---

## Cart Tracking

Cart events do not come from `publish()` — they come from `updateCart()`. The bus runs change detection internally:

- Compares the new cart's `updatedAt` against the previous in-memory cart, against `localStorage.cartLastUpdatedAt`, and against the last emitted event ID.
- Diffs lines: removed lines emit `product_removed_from_cart`, new lines or quantity increases emit `product_added_to_cart`, quantity decreases emit `product_removed_from_cart`.
- Emits `cart_updated` first, then any line-level events.

The cart payload type is intentionally lightweight (no Hydrogen cart-type dependency):

```ts
type AnalyticsCart = {
  id: string;
  updatedAt: string;                    // required for dedupe
  lines: { nodes?: AnalyticsCartLine[]; edges?: { node: AnalyticsCartLine }[] };
  [key: string]: unknown;
};
```

Both `lines.nodes` and `lines.edges` (GraphQL connection) shapes work. Call `updateCart(cart)` whenever your framework resolves cart state — initial load, after mutations, on SPA navigation. Carts without `updatedAt` are silently ignored (no error logged).

Application code should not manually publish `cart_updated`, `product_added_to_cart`, or `product_removed_from_cart`. Always go through `updateCart`.

---

## Wiring third-party destinations

The bus is the right integration point for GA4, Meta Pixel, Klaviyo, etc. Register third-party analytics with `addDestination()`. The bus gates destination callbacks with `canTrack()` and replays buffered events after analytics consent is granted:

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

Consent gating happens at the bus level (`canTrack`) before destination callbacks see the payload. Raw `analytics.subscribe()` is live-only and consent-agnostic; use it for logs or framework glue, not analytics destinations.

---

## Verify

After wiring, smoke-test each event in the browser dev tools:

1. **Subscriber log fires** — open the page with the dev console open. You should see `[analytics] page_viewed` (or whichever events you logged). If nothing logs, either `getAnalytics()` is no-op'ing on the server, the singleton is constructing too late, or `canTrack()` is false. Temporarily setting `canTrack: () => true` lets you isolate the consent gate from the wiring.
2. **Monorail request fires** — Network tab, filter for `monorail-edge.shopifysvc.com`. A `produce_batch` POST should land within ~1s of consent being granted (or immediately if the visitor is in a no-consent-required region). If it never fires, either consent has not been granted, the schemas are missing required fields (check console for warnings about missing `id`/`title`/`vendor`/etc.), or `hasUserConsent` is false on the payload.
3. **Per-route navigation fires page_viewed** — click around. Each navigation should produce a fresh `page_viewed` event. If only the initial page load fires, the route-change hook is wired wrong (e.g. effect dependency missing in React, reactive read missing in Solid).
4. **Cart events fire** — add an item to the cart. You should see `cart_updated` followed by `product_added_to_cart`. If you see `cart_updated` repeating with the same payload, the dedupe key (`updatedAt`) is stale — confirm your cart query selects `updatedAt`.
5. **Privacy banner renders for EU/UK visitors** — if `mode: "default-banner"`, simulate a GDPR-protected region with browser dev-tools location override or VPN. The banner should render. If it does not, check that `cdn.shopify.com` is not blocked by your CSP.

For production, re-verify against the production bundle. Several gotchas only appear once the SSR/CSR boundary stabilizes.

---

## Common gotchas

- **Replay is destination-only.** Raw `analytics.subscribe()` listeners only receive live events. `analytics.addDestination()` callbacks receive consent-gated live events plus buffered replay after analytics consent is granted. If the visitor explicitly denies analytics consent, the buffer is cleared and those pre-denial events are never replayed.
- **Unsupported events are ignored.** The bus only accepts the exported `AnalyticsEvent` values. Custom event names such as `custom_*` are temporarily unsupported and log a warning instead of dispatching.
- **The singleton must be lazy.** Constructing the bus at module top-level (`const bus = createStorefrontAnalytics(...)` instead of behind a getter) runs on the server during SSR and crashes on `window` access. Always wrap in a `typeof window === 'undefined'` guard.
- **Use the right shop shape for each API.** Analytics `shop.shopId` must be a Shopify Shop GID. `ShopifyScripts` expects a numeric `shopId` plus `storefrontId` for PerfKit.
- **`publicStorefrontAccessToken` must be public when provided.** The bus logs an error if the token starts with `shpat_` or is not 32 characters. Private tokens stay server-side.
- **`canTrack: () => true` is a development crutch.** It bypasses the Customer Privacy API for every visitor in every region. Never ship to production. The default — Customer Privacy API — is the only correct setting for a real merchant.
- **Customer Privacy script blocked by CSP.** If your CSP does not allow `cdn.shopify.com`, the consent script never loads, `analyticsProcessingAllowed()` stays `false`, and every event drops. Check Network tab for blocked requests; add `cdn.shopify.com` to `script-src`.
- **`mode: "no-banner"` is wrong for any storefront with EU/UK/CA visitors unless consent is handled elsewhere.** Without a hosted or custom banner, those visitors have no UI to grant consent — every event drops permanently. Default to `mode: "default-banner"` unless you have a custom consent UI that calls `setTrackingConsent()`.
- **Multiple bus instances on the same page conflict.** `window.Shopify.customerPrivacy.config` is global; the latest initialized config wins. Multi-store-per-page is not supported. Use one bus per active storefront shell.
- **Astro inline scripts cannot reference component scope.** Astro hoists `<script>` tags at build time. Bridge SSR data through hidden DOM (`data-*` attributes) and read it from the script. Trying to interpolate `{product.id}` directly into a script body silently fails — the script ships as a static string.
- **Astro page-view fires only on full loads.** Astro is MPA-by-default. If you adopt View Transitions, listen for `astro:after-swap` instead of relying on the inline-script-runs-on-load behavior — otherwise SPA-nav transitions skip `page_viewed`.
- **Required product fields silently drop the Monorail leg.** Missing `id`/`title`/`vendor`/`variantId`/`variantTitle`/`price` causes the Shopify analytics subscriber to skip Monorail dispatch and log a field-specific error. The bus event still fires for your subscribers — the loss is only in Shopify analytics. Watch the console.
- **`updatedAt` missing from cart query drops cart tracking.** The cart tracker keys dedupe on `updatedAt`. Without it, every `updateCart()` call is silently ignored.
- **`destroy()` is not called by any of the framework adapter sketches.** During HMR or React Strict Mode double-mount, this means duplicate event subscribers and possibly duplicate Monorail events in dev. For production this is rarely visible (one bus per page lifetime). If duplicate dev events bother you, wire `analytics.destroy()` into your framework's teardown (React effect cleanup, Svelte `onDestroy`, Solid `onCleanup`, or equivalent).
- **Lighthouse skip is silent.** Monorail dispatch is skipped for Chrome Lighthouse user-agents. If your synthetic monitoring runs Lighthouse, you will see no Monorail requests in those runs — this is intentional.

---

## Anti-patterns

- **Don't construct the bus on the server.** SSR has no `window`, no consent SDK, and no useful behavior. Constructing on the server initializes browser internals against undefined globals and crashes — or worse, no-ops silently and ships analytics-free.
- **Don't manually publish `cart_updated` / `product_added_to_cart` / `product_removed_from_cart`.** These events come from `updateCart()`'s diff. Manual publishing bypasses the dedupe and produces duplicate or contradictory cart history.
- **Don't ship `canTrack: () => true`.** It bypasses every consent rule. Only use it in dev, and remove it before production.
- **Don't reimplement consent.** Shopify's Customer Privacy SDK already implements region-aware gating. Wrapping `canTrack` to "fix" perceived consent issues almost always introduces regulatory exposure. If you genuinely need a custom rule, AND it on top of the default, never replace it.
- **Don't reimplement Monorail dispatch.** If you need a third-party destination, register it with `addDestination()` and forward from there — do not parallel-publish to Monorail yourself.
- **Don't put per-route view events in a global subscriber.** A single subscriber that watches `page_viewed` and synthesizes `product_viewed` from URL parsing is brittle and loses payload context. Publish each view event from the route that has the data.
- **Don't construct multiple buses for "different consent contexts" on the same page.** Customer Privacy config is global; the latest initialized config takes effect. If you need conditional behavior, branch inside subscribers, not at construction.
- **Don't skip the interceptor prerequisite.** Without the SFAPI proxy, modern same-origin Shopify cookies cannot be set. Analytics may appear to work via deprecated JS-visible cookies, but session continuity into checkout breaks. Treat analytics as incomplete until the proxy is live in production.
