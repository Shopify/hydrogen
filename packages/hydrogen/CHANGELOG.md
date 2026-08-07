# @shopify/hydrogen

## 2026.10.0-preview.1

### Minor Changes

- cc362b7: Return `null` synchronously from `handleShopifyRoutes()` when no Shopify route matches, allowing framework routing to continue without an unnecessary async hop. Matched routes continue to return a `Promise<Response>`.
- b70a016: Emit `shopify:page:view` from `ShopifyScripts` on the initial page and SPA navigations, and synchronize the page template with PerfKit.
  
  Optionally load the standard events inspector in development builds.
- 9771020: Add `configureLogging` / `HydrogenLogger` logging contract.
  
  Default console log prefixes are standardized to `[hydrogen:<level>:<scope>]` via a central logging module; ad-hoc `console.*` call sites are migrated to scoped loggers. Apps can configure a `HydrogenLogger`-compatible sink once with `configureLogging({logger, level})`; the logger receives `(message, context?)` for `trace`, `debug`, `info`, `warn`, `error`, and `fatal`. The built-in console sink remains the default, and serialized inline-script import chains continue to write to the console because they run outside the app bundle. `no-console` lint now enforces the policy across `packages/hydrogen/src`.

### Patch Changes

- 45a9463: Fix editor autocomplete on `createStorefrontClient`: the `type` discriminant now suggests all client types and `config` completions narrow to the selected type, instead of resolving against the first overload only.
- 629abfa: Source private Storefront API buyer IP exclusively from `requestContext`. Remove `buyerIp` from private client config and require a buyer-bearing context created with `createShopifyRequestContext({buyerIp})`.
- ec9ea1a: Enable Shopify runtime modules initialized by `ShopifyScripts` to send same-origin API requests through `handleShopifyRoutes`, forwarding them to the Shopify's backend while filtering hop-by-hop request headers.
- 94c4df5: Replace cart optimistic update internals with keyed transaction and error projections, including reliable cancellation, request settlement, pending state updates, accurate partial-connection quantities, and coalesced authoritative reconciliation after overlapping mutations. Add `CartState.revalidating`, `CartState.pending.cost`, and default cart line identity fields for selling plans and attributes so totals, analytics, and optimistic add reconciliation remain accurate while cost-affecting mutations settle.
- f216581: Expose package metadata listing the Hydrogen classic CLI commands disabled for this package.
- dcb87dd: Update the Next.js markets skill to explain how `proxy.ts` forwards Hydrogen request context to Server Components.
- 08e935d: Fix the Vue `ShopifyScripts` component to match core and the React binding: the `routes` prop is now optional at runtime (previously Vue logged a missing-prop warning when it was omitted) and is included in the exported `ShopifyScriptsProps` type.
- 543b3bf: Fix the Vue `ShopifyScripts` component to declare and forward all core script options, including `shopifyAnalytics`, and align Inbox runtime prop validation with its boolean API.
- 08e935d: Add a `useCartAnalytics()` composable to the Vue binding (`@shopify/hydrogen/vue`), mirroring the React binding's hook. Call it in a component inside `CartProvider` to subscribe the cart store to analytics tracking on mount and unsubscribe on dispose.

## 0.0.1

### Patch Changes

- 2bf291d: Prepare the package for dev-preview publishing under the Hydrogen package name.
  Includes the `npx @shopify/hydrogen setup` CLI flow.
