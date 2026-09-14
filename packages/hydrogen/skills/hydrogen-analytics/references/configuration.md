# Analytics Configuration

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

Per-page trackers call `getAnalytics()` from the skill's core singleton. They do not need to configure the bus; ShopifyScripts already put it on `window.Shopify.analytics`.

