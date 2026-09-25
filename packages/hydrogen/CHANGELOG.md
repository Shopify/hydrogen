# @shopify/hydrogen

## 2026.10.0-preview.4

### Minor Changes

- b202925: Add `getTrackingValues()` to analytics destination callback context. Destinations can read current `uniqueToken` and `visitToken` values from Shopify's consent API without accessing its internal globals. Each read requests fallback generation with the tag `hydrogen:<destination name>`; token generation is provided by the consent API when supported. Unavailable values are returned as empty strings, and the getter returns empty strings whenever analytics tracking is not currently allowed, even if a destination retained it and calls it after consent was revoked.
  
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
- d75a710: Require an asynchronous `setup()` callback for `consent.mode: "custom-banner"` to connect third-party consent providers. Setup must synchronize the provider's consent through `window.Shopify.customerPrivacy` before resolving. Hydrogen buffers destination events until then, replays them when analytics consent is allowed, and discards them when denied. Setup failures keep delivery blocked.
  
  Migration from earlier previews: replace `consent={{mode: "custom-banner"}}` with `consent={{mode: "custom-banner", setup}}`. The callback is now required by TypeScript. JavaScript integrations without it log a warning during browser initialization and keep analytics delivery blocked.
- e7df017: Fix `formatMoney().amount` dropping the minus sign for negative amounts, so `-19.99` no longer renders as `19.99`.
- 36902dd: **Breaking:** Remove the top-level `analytics.subscribe()` method. Register event consumers with `analytics.addDestination()` and use the `subscribe` function provided to its setup callback. All event consumers now receive consent-gated delivery and buffered replay.
  
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
  
  The function returned by `addDestination()` removes the destination; each setup subscription also returns an unsubscribe function. Removing and re-adding a destination, even with the same name, replays retained history again and can duplicate deliveries. Keep registration outside component mount/unmount cycles.
  
  Also remove `analytics.destroy()`. Hydrogen owns the shared bus for the page's lifetime. Use the cleanup function returned by `addDestination()` when intentionally removing a destination.
- c40b38e: `hydrogen setup` now works without a `package.json`. When run in a directory with no project, it prompts to either scaffold the React Router template from the `dist-preview` branch or install AI coding skills only. Existing behavior (install Hydrogen + sync skills) is preserved when a `package.json` is present.

### Patch Changes

- e695643: The built-in cart queries now select `Cart.updatedAt`, so cart analytics deduplication works without a custom `CartFragment`.
- b202925: Apply private, no-store cache directives to any response containing `Set-Cookie`, including application-owned cookies, instead of checking specific Shopify cookie names. Remove conflicting CDN cache directives from these responses.
- b2c7791: Fix product form store losing its cart subscription after React StrictMode effect replay in development. The store now exposes a `connect()` method that re-subscribes to the cart store, and `ProductProvider` calls it on every effect mount so the subscription survives StrictMode's mount → cleanup → remount cycle.
- f368205: Reject JSONP `callback` requests before forwarding them through any Shopify proxy.
- 56b37c7: **Breaking:** Remove the unused `EventPayloads` type export. To type a payload for any supported analytics event, use `AnalyticsEventMap[AnalyticsEventName]`. For a single event, use `PayloadFor<"product_viewed">`.
- b202925: Stop creating and refreshing the deprecated JavaScript-visible `_shopify_y` and `_shopify_s` cookies from `ShopifyScripts`. Shopify's consent API and Storefront API manage visitor tracking state through the backend cookies.
  
  Forward incoming cookies unchanged so Shopify can resolve tracking state and migrate legacy identifiers. Stop converting legacy cookies into tracking headers or inferring tracking state from the presence of specific analytics cookies. The SFAPI proxy continues forwarding explicit token headers directly from the incoming request, without storing tokens in the request context.
  
  Expire existing legacy cookies on successful HTTP responses to consent-management requests, after forwarding them upstream. Cleanup covers host-only and parent-domain cookies, including after consent denial or revocation.
- dd4a24c: **Breaking:** Remove the `locations`, `path`, and `extensions` fields from `StorefrontApiError` and its `toJSON()` output. `createStorefrontClient` never populated them. `StorefrontApiError` is only thrown for HTTP, network, timeout, and response-parsing failures. GraphQL errors, including `THROTTLED`, are returned in `result.errors`, so read `extensions.code` there:
  
  ```ts
  const result = await storefront.graphql(QUERY);
  if (result.errors?.some((error) => error.extensions?.code === "THROTTLED")) {
    // retry
  }
  ```
- b202925: Visitor tokens are now read through Shopify's consent API instead of the `Server-Timing` header.
- e48c0c3: Remove incorrect skill guidance about `StorefrontApiError` carrying GraphQL error details, and clarify that analytics `customData` isn't added to published events.
- 38b8576: Fix `@shopify/hydrogen/ts-plugin` not loading in editors. tsserver resolves `compilerOptions.plugins` with TypeScript's legacy JS resolver, which ignores package `exports`, so the plugin was silently skipped and GraphQL hover docs and completions inside `gql()` documents were missing. The package now ships a `ts-plugin/package.json` that the legacy resolver can find. Type errors for invalid fields were unaffected since those come from `gql()` types, not the plugin.
- 167a514: **Breaking:** Remove the standalone `CartProvider`, `useCart`, `useCartActions`, and `useCartForm` exports from `@shopify/hydrogen/react`. They dropped custom `CartFragment` types. Use the typed versions from `createCartComponents()` instead:
  
  ```ts
  import { createCartComponents } from "@shopify/hydrogen/react";
  
  import type { cartHandlers } from "./cart-handlers";
  
  export const { CartProvider, useCart, useCartActions, useCartForm } =
    createCartComponents<typeof cartHandlers>();
  ```
  
  `useCartAnalytics` is still exported.
- 33e3de7: Vue `useCollectionForm().formProps()` now passes a `SubmitEvent` to `beforeSubmit` and `afterSubmit`, matching the React binding. You can read `e.submitter` without casting. Existing callbacks typed as `(e: Event) => void` still work.
  
  `CollectionActions` is now also exported from `@shopify/hydrogen` for custom framework bindings. The React and Vue entries still export the same type.
- 4107db8: Vue `useCartForm().formProps()` and `useProductForm().formProps()` now pass a `SubmitEvent` to `beforeSubmit` and `afterSubmit`, matching the React bindings. You can read `e.submitter` without casting. Existing callbacks typed as `(e: Event) => void` still work.
  
  `CartActions` and `PredictiveSearchActions` are now also exported from `@shopify/hydrogen` for custom framework bindings. The React and Vue entries still export the same types.

## 2026.10.0-preview.3

### Minor Changes

- 8827904: Add an `account` option to `getShopifyScriptTags()` and the React/Vue `ShopifyScripts` components. When enabled, Hydrogen loads the Shopify customer account web component (`https://cdn.shopify.com/storefront/web-components/account.js`) with the same nonce and `crossorigin` handling as the other Shopify runtime scripts. Render `<shopify-account>` where you want the account UI to appear. The script URL is also exported as `SHOPIFY_ACCOUNT_SCRIPT`.
- 96f9d2d: Add `register("attributeValue", { key, value })` to `ProductFormRegister` for attaching line-item attributes (engraving text, gift messages, custom options) through the form-based add-to-cart path. Both client-side (`getAddPayload`) and server-side (`parseAddIntent`) now extract `attributes.*` entries from FormData. Exports two new types: `ProductAttributeValueProps` and `ProductAttributeDefaultValueProps`.
- d92f398: Add `hydrogen skills check`, which exits non-zero when the project's synced skills do not match the installed `@shopify/hydrogen`, or were never synced. It prints the summary `skills sync` would act on and writes nothing. The default `--mode=error` gates CI; `--mode=warn` prints the same message and exits zero for dev scripts.
- 05e43e6: Add `hydrogen skills sync` to keep packaged agent skills aligned with the installed `@shopify/hydrogen` version. Skills are always written to both `.claude/skills` and `.agents/skills`, covering Claude Code, Codex, Cursor, and OpenCode without configuration. Each copied `SKILL.md` records the package version and a content hash under frontmatter `metadata`. Rerunning the command after an upgrade overwrites unmodified skills, adds new ones, removes skills the package no longer ships, and leaves locally modified skills alone unless `--force` is passed. If you edited a skill the package no longer ships, you are asked before it is removed; without a terminal (for example in CI) it is kept and a warning is printed. `hydrogen setup` runs the same sync after installing the package and accepts the same `--force`, so rerunning it over previously synced skills now updates them instead of failing. Preview templates ship their skills with the same metadata, so `skills sync` works on deployed templates too.
  
  Projects that ran `hydrogen setup` before this version have skills without the metadata block. Run `npx @shopify/hydrogen skills sync --force` once to adopt them; later syncs then manage them normally. Skills from those earlier copies whose names are no longer shipped are not recognised and should be deleted by hand.
- 54a1e7e: Proxy caller-authenticated UCP MCP requests from `/api/ucp/mcp` to the configured Shopify store.

### Patch Changes

- d8f8476: Add the `hydrogen-cart-metafields` skill: a behavioral guide for reading and writing cart metafields (custom cart data such as delivery instructions) through a custom `CartFragment`, an app-owned mutation route, and `useCartActions().refresh()`.
- a6e3a71: Cart permalinks now hand off to the mock.shop demo store for every mock.shop host, not only `mock.shop` itself, so a storefront built against a per-store host such as `pets.mock.shop` behaves the same in mock mode. The `hydrogen-storefront-client` and `hydrogen-setup` skills now explain that mock.shop is a catalog of stores and how to pick one from https://mock.shop/llms.txt.
- c35ee9d: Prevent superseded cart mutations from producing unhandled `AbortError` console errors.

## 2026.10.0-preview.2

### Minor Changes

- 78b94c5: Accept Liquid-style `?variant=<numeric id>` links on product pages.
  
  - `handleShopifyRoutes({routeTemplates})` now 302-redirects `?variant=` product URLs to the canonical option-params URL (`/products/x?variant=123` → `/products/x?Color=Red&Size=M`), resolving the variant through the Storefront API with `Cache.long()` when the client has a cache adapter, following combined-listing variants to their own product page, and stripping unknown or deleted variant ids. When both `variant` and option params are present, the variant wins.
  - `buildProductSelectionSearchParams({style?, selectedOptions, variant?, optionNames, base?})` builds selection link search params, scrubbing stale option and `variant` params while preserving unrelated ones. `style: "variant"` emits a shareable `?variant=<numeric id>` link, falling back to option params when no variant is resolved.
  - `getSelectedProductOptions` now treats the `variant` search param as reserved and never returns it as an option.
  - Registered route redirects can now set an explicit `status` restricted to `301 | 302 | 303 | 307 | 308`.
- 4767139: Add `CartStore.refresh()` and React/Vue `useCartActions()` APIs for reconciling the current cart after an out-of-band mutation. Refreshes use the configured cart transport, wait for active optimistic mutations, update custom cart fragment fields, and report progress and failures through cart state. When the store has no cart yet, refresh loads one so a cart created server-side (e.g. via `cartCreate`) is picked up.

### Patch Changes

- 1d2f7d9: Storefront Agent requests now route through the generic `/__shopify/*` Shopify API proxy. Unprefixed `/agent/buyer-claims` and `/agent/handoff` requests are no longer intercepted and fall through to app routing, where they may return a 404 or catch-all HTML response.
- 4ea228e: Reset `before` and `after` pagination cursors when collection filters or sorting change.
- 84f818e: Clarify collection filter guidance and examples for price ranges.
- 0289d74: Allowlist the Frontend Event Collector ingress path (`/.well-known/shopify/fec/produce`) in the well-known proxy. This forwards the first-party path to the Online Store origin so WebMCP analytics reach the collector on headless storefronts, matching how Online Store storefronts route it through the myshopify.com edge.
- 95ab890: Rename local HTTPS development scripts from `https:dev` to `dev:https` and rely on the Vite plugin to provision certificates automatically.

## 2026.10.0-preview.1

### Minor Changes

- c46f056: Return the standard pathname and the standard and custom route templates from `Shopify.routes.match()`.
- 2948455: Synchronize cart buyer identity with Customer Account sessions. Pass `customerSession` to `createCartServerHandlers` to create new carts with the current customer's buyer identity when the session has a usable access token or successfully refreshed access token, and mark checkout URLs in authenticated cart reads with `logged_in=true`. Pass those cart handlers as `cartServerHandlers` to `createCustomerAccountServerHandlers` to keep existing carts in step: authorization and refresh attach the customer to the browser cart, a definitive refresh rejection and logout detach it. Sync is best-effort and never blocks the route's redirect; a failed detach during logout or definitive refresh rejection expires the cart cookie instead.
- cc362b7: Return `null` synchronously from `handleShopifyRoutes()` when no Shopify route matches, allowing framework routing to continue without an unnecessary async hop. Matched routes continue to return a `Promise<Response>`.
- b70a016: Emit `shopify:page:view` from `ShopifyScripts` on the initial page and SPA navigations, and synchronize the page template with PerfKit.
  
  Optionally load the standard events inspector in development builds.
- 9771020: Add `configureLogging` / `HydrogenLogger` logging contract.
  
  Default console log prefixes are standardized to `[hydrogen:<level>:<scope>]` via a central logging module; ad-hoc `console.*` call sites are migrated to scoped loggers. Apps can configure a `HydrogenLogger`-compatible sink once with `configureLogging({logger, level})`; the logger receives `(message, context?)` for `trace`, `debug`, `info`, `warn`, `error`, and `fatal`. The built-in console sink remains the default, and serialized inline-script import chains continue to write to the console because they run outside the app bundle. `no-console` lint now enforces the policy across `packages/hydrogen/src`.
- cc67c25: Add `localHttps()` under `@shopify/hydrogen/vite` for portable local HTTPS development with Customer Account API flows. Frameworks that terminate HTTPS outside Vite can use `localHttps(...).api.getDevServerConfig()`.
- e21f9f4: Add standard route templates for cart, search, policy, and collection-listing pages so custom storefront routes can be matched, resolved, and redirected consistently.
  
  Predictive search query suggestions now honor the configured `search` route.
- 3a9b3de: Add an optional `storefrontId` to `createStorefrontClient` so direct and proxied Storefront API requests include the trusted `Shopify-Storefront-Id` header for cart analytics attribution.

### Patch Changes

- 45a9463: Fix editor autocomplete on `createStorefrontClient`: the `type` discriminant now suggests all client types and `config` completions narrow to the selected type, instead of resolving against the first overload only.
- 629abfa: Source private Storefront API buyer IP exclusively from `requestContext`. Remove `buyerIp` from private client config and require a buyer-bearing context created with `createShopifyRequestContext({buyerIp})`.
- 972b6df: Stop manually forwarding analytics events to PerfKit's SPA navigation methods. PerfKit will consume the standard `shopify:page:view` event directly.
- ec9ea1a: Enable Shopify runtime modules initialized by `ShopifyScripts` to send same-origin API requests through `handleShopifyRoutes`, forwarding them to the Shopify's backend while filtering hop-by-hop request headers.
- 94c4df5: Replace cart optimistic update internals with keyed transaction and error projections, including reliable cancellation, request settlement, pending state updates, accurate partial-connection quantities, and coalesced authoritative reconciliation after overlapping mutations. Add `CartState.revalidating`, `CartState.pending.cost`, and default cart line identity fields for selling plans and attributes so totals, analytics, and optimistic add reconciliation remain accurate while cost-affecting mutations settle.
- f5d1d8e: Prevent the Shopify API proxy from forwarding Cloudflare's client IP header to Shopify.
- b774b7c: Finalize responses returned by `handleShopifyRoutes` and `handleShopifyRedirects` with the storefront headers required by Hydrogen, including the `powered-by` response identity. Framework integrations can now return these responses directly without applying storefront headers again.
- 4b82db9: Render the Shop Pay button locally instead of loading Shopify's hosted shop-js web component. `createShopPayButton` now creates a self-contained `<hydrogen-shop-pay-button>` with protected shadow-root styles; add `renderShopPayButton` for server HTML, `defineShopPayButton` for custom-element registration, and `getShopPayButtonUrl` for checkout URL construction. The button works before JavaScript runs, supports `accessibilityLabel`, accepts a `nonce` for the shadow-root stylesheet, preserves optional explicit channel attribution, and limits styling to `width` and `borderRadius`. Strict Content Security Policies must still allow inline style attributes for custom width and border radius values. Remove `loadShopJs`, `getShopPayButtonAttributes`, the React and Vue `loadScript` prop, and the dev-only click interception.
- f216581: Expose package metadata listing the Hydrogen classic CLI commands disabled for this package.
- e959af3: Declare all library GraphQL documents with `gql()` so the gql.tada plugin validates them, and add a `gql(document, fragments)` overload that composes additional fragments onto an already-declared document while preserving inferred types.
- 401fc56: Use document navigation for Shopify checkout, cart permalink, and Customer Account handoff routes so Hydrogen can complete its server redirects.
- 50b7874: Reduce reordering when optimistic cart additions resolve, and include selected options and product handles in pending product form additions.
- d87f000: Remove unused header passed to SFAPI.
- c55c930: `handleShopifyRedirects` now accepts any Storefront client instead of requiring a private one. The redirect lookup only queries `urlRedirects`, which needs no token, so public — including tokenless — clients work. A token-backed client is still recommended for real stores.
- dcb87dd: Update the Next.js markets skill to explain how `proxy.ts` forwards Hydrogen request context to Server Components.
- bb16b24: Fix malformed URLs when a locale path prefix has surrounding whitespace.
  
  Before: a prefix like `" /fr-ca/ "` leaked into resolved paths, producing `/ /fr-ca/ /products`.
  After: the prefix normalizes to `/fr-ca`, producing `/fr-ca/products`.
  
  Also removes internal dead code; no public API changes.
- 08e935d: Fix the Vue `ShopifyScripts` component to match core and the React binding: the `routes` prop is now optional at runtime (previously Vue logged a missing-prop warning when it was omitted) and is included in the exported `ShopifyScriptsProps` type.
- 543b3bf: Fix the Vue `ShopifyScripts` component to declare and forward all core script options, including `shopifyAnalytics`, and align Inbox runtime prop validation with its boolean API.
- 08e935d: Add a `useCartAnalytics()` composable to the Vue binding (`@shopify/hydrogen/vue`), mirroring the React binding's hook. Call it in a component inside `CartProvider` to subscribe the cart store to analytics tracking on mount and unsubscribe on dispose.
- 146720a: Proxy allowlisted Shopify well-known resources through `handleShopifyRoutes`.

## 0.0.1

### Patch Changes

- 2bf291d: Prepare the package for dev-preview publishing under the Hydrogen package name.
  Includes the `npx @shopify/hydrogen setup` CLI flow.
