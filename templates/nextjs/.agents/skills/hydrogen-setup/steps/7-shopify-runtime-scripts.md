# Shopify Runtime Scripts

## Install Shopify Runtime Scripts

Render Shopify runtime scripts once in the root document.

- Use the `ShopifyScripts` component from your framework binding if it exports one. Frameworks without a binding should render `getShopifyScriptTags()` / `renderShopifyScriptTags()` during SSR and call `initializeShopifyScripts()` during browser hydration.
- Invoke the `hydrogen-routing` skill for the required script routing options; reuse the shared route template manifest from the scaffold step.

### The `shop` and `i18n` props

Build both in a server-only module, annotated with the types exported from `@shopify/hydrogen`, so TypeScript rejects wrong or missing fields at the declaration — not at the distant `ShopifyScripts` call site:

```ts
import type { ShopifyScriptsI18n, ShopifyScriptsShop } from "@shopify/hydrogen";

const shop: ShopifyScriptsShop = {
  shopId: env.SHOP_ID,
  storefrontId: env.PUBLIC_STOREFRONT_ID || "0",
  myshopifyDomain: env.PUBLIC_STORE_DOMAIN,
};

const i18n: ShopifyScriptsI18n = {
  country, // resolved market country, e.g. "US"
  language, // resolved market language, e.g. "EN"
};
```

All three `shop` fields are required and identify different things:

- `shopId` — the **shop** itself: the numeric Shopify shop ID (or Shop GID `gid://shopify/Shop/{id}`). Same shop as the Customer Account API `SHOP_ID`. Shopify analytics attributes events to it.
- `storefrontId` — the specific **headless/Hydrogen storefront instance** attached to the shop. A shop can have several storefronts; analytics and PerfKit use this ID to attribute traffic to this one. Use `"0"` when the app has no provisioned storefront ID.
- `myshopifyDomain` — the shop's permanent `*.myshopify.com` domain, exposed as `window.Shopify.shop`.

`i18n` is the same resolved market used by Storefront API requests (`country` + `language`, optional `currency`) — not a locale string, and not the analytics consent config.

For vanilla browser code that does not use SSR or a framework head API, render the HTML from core and include it in the document shell. If your app renders tags through core helpers instead of a framework binding, call `initializeShopifyScripts()` from bundled client code:

```ts
import { initializeShopifyScripts, renderShopifyScriptTags } from "@shopify/hydrogen";
import { routeTemplates } from "./route-templates";

const tags = renderShopifyScriptTags({ i18n, shop });
initializeShopifyScripts({ routes: routeTemplates });
```

### Continue when

- [ ] The Shopify script tags appear exactly once in the server-rendered document (check view-source, not just the hydrated DOM)
- [ ] `window.Shopify.actions` is defined in the browser console after page load
- [ ] `shop` values (`shopId`, `storefrontId`, `myshopifyDomain`) are resolved server-side and serialized; no client module reads `process.env`, `import.meta.env`, or framework env modules

## Configure Shopify Navigation

When Shopify or Hydrogen browser utilities need to navigate through the framework router, set the top-level navigation hook. WebMCP is one consumer of this hook. Pass `navigate={navigate}` to the framework `ShopifyScripts` component when the router hook is available there, or call `initializeShopifyScripts()` from client code when scripts are rendered through core helpers or a framework head API:

```ts
import { initializeShopifyScripts } from "@shopify/hydrogen";
import { routeTemplates } from "./route-templates";

initializeShopifyScripts({ routes: routeTemplates, navigate: (url) => router.push(url) });
```

Use the framework's normal client lifecycle primitive when the app is already bundling frontend code, such as a mounted hook, client-only effect, or processed browser script.

### Continue when

- [ ] The navigation hook is wired through the framework router (`navigate` prop on `ShopifyScripts`, or the `navigate` option of `initializeShopifyScripts()`)
- [ ] Navigation triggered through the hook performs client-side routing without a full page reload
