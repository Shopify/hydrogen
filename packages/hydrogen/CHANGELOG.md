# @shopify/hydrogen

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
