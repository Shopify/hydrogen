# @shopify/hydrogen

## 2026.10.0

### Minor Changes

- 661e015: Accept Liquid-style `?variant=<numeric id>` links on product pages.
  
  - `handleShopifyRoutes({routeTemplates})` now 302-redirects `?variant=` product URLs to the canonical option-params URL (`/products/x?variant=123` → `/products/x?Color=Red&Size=M`), resolving the variant through the Storefront API with `Cache.long()` when the client has a cache adapter, following combined-listing variants to their own product page, and stripping unknown or deleted variant ids. When both `variant` and option params are present, the variant wins.
  - `buildProductSelectionSearchParams({style?, selectedOptions, variant?, optionNames, base?})` builds selection link search params, scrubbing stale option and `variant` params while preserving unrelated ones. `style: "variant"` emits a shareable `?variant=<numeric id>` link, falling back to option params when no variant is resolved.
  - `getSelectedProductOptions` now treats the `variant` search param as reserved and never returns it as an option.
  - Registered route redirects can now set an explicit `status` restricted to `301 | 302 | 303 | 307 | 308`.
- 9051cba: Add an `account` option to `getShopifyScriptTags()` and the React/Vue `ShopifyScripts` components. When enabled, Hydrogen loads the Shopify customer account web component (`https://cdn.shopify.com/storefront/web-components/account.js`) with the same nonce and `crossorigin` handling as the other Shopify runtime scripts. Render `<shopify-account>` where you want the account UI to appear. The script URL is also exported as `SHOPIFY_ACCOUNT_SCRIPT`.
- c15c91f: Add `getTrackingValues()` to analytics destination callback context. Destinations can read current `uniqueToken` and `visitToken` values from Shopify's consent API without accessing its internal globals. Each read requests fallback generation with the tag `hydrogen:<destination name>`; token generation is provided by the consent API when supported. Unavailable values are returned as empty strings, and the getter returns empty strings whenever analytics tracking is not currently allowed, even if a destination retained it and calls it after consent was revoked.
  
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
- fc54f44: `ProductPayload.price` is now `{ amount, currencyCode }`, the Storefront API `MoneyV2` shape, instead of a bare amount string. The hosted Shopify analytics script reads `currencyCode` as the event's currency, so `product_viewed` events no longer depend on `window.Shopify.currency.active` being set. Pass the variant's `price` object where you used to pass `price.amount`:
  
  ```ts
  // before
  price: variant.price.amount,
  // after
  price: variant.price,
  ```
  
  This is a breaking type change for anyone publishing `product_viewed` with a string `price`. `price` is the generated `MoneyV2` type, so `currencyCode` is the Storefront API `CurrencyCode` union rather than any string. Import `MoneyV2` or `CurrencyCode` from `@shopify/hydrogen/storefront-api-types` when you type a payload by hand.
- f03a6f8: Forward UCP `/buy/{items}` permalinks to the configured Shopify store from `handleShopifyRoutes`, alongside the existing `/cart/{items}` handoff. The forward keeps the path and query untouched and uses the UCP redirect-resolution shape (303 with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`). In-app navigation to a buy permalink through `Shopify.routes.navigate` becomes a document navigation so the forward can run.
- 5afc3b1: Add `CartStore.refresh()` and React/Vue `useCartActions()` APIs for reconciling the current cart after an out-of-band mutation. Refreshes use the configured cart transport, wait for active optimistic mutations, update custom cart fragment fields, and report progress and failures through cart state. When the store has no cart yet, refresh loads one so a cart created server-side (e.g. via `cartCreate`) is picked up.
- 0c5888b: Return the standard pathname and the standard and custom route templates from `Shopify.routes.match()`.
- 769cbb8: Synchronize cart buyer identity with Customer Account sessions. Pass `customerSession` to `createCartServerHandlers` to create new carts with the current customer's buyer identity when the session has a usable access token or successfully refreshed access token, and mark checkout URLs in authenticated cart reads with `logged_in=true`. Pass those cart handlers as `cartServerHandlers` to `createCustomerAccountServerHandlers` to keep existing carts in step: authorization and refresh attach the customer to the browser cart, a definitive refresh rejection and logout detach it. Sync is best-effort and never blocks the route's redirect; a failed detach during logout or definitive refresh rejection expires the cart cookie instead.
- cbef4bc: Require an asynchronous `setup()` callback for `consent.mode: "custom-banner"` to connect third-party consent providers. Setup must synchronize the provider's consent through `window.Shopify.customerPrivacy` before resolving. Hydrogen buffers destination events until then, replays them when analytics consent is allowed, and discards them when denied. Setup failures keep delivery blocked.
  
  Migration from earlier previews: replace `consent={{mode: "custom-banner"}}` with `consent={{mode: "custom-banner", setup}}`. The callback is now required by TypeScript. JavaScript integrations without it log a warning during browser initialization and keep analytics delivery blocked.
- 75916f8: Return `null` synchronously from `handleShopifyRoutes()` when no Shopify route matches, allowing framework routing to continue without an unnecessary async hop. Matched routes continue to return a `Promise<Response>`.
- 05f1ae8: Emit `shopify:page:view` from `ShopifyScripts` on the initial page and SPA navigations, and synchronize the page template with PerfKit.
  
  Optionally load the standard events inspector in development builds.
- e37a425: Add `configureLogging` / `HydrogenLogger` logging contract.
  
  Default console log prefixes are standardized to `[hydrogen:<level>:<scope>]` via a central logging module; ad-hoc `console.*` call sites are migrated to scoped loggers. Apps can configure a `HydrogenLogger`-compatible sink once with `configureLogging({logger, level})`; the logger receives `(message, context?)` for `trace`, `debug`, `info`, `warn`, `error`, and `fatal`. The built-in console sink remains the default, and serialized inline-script import chains continue to write to the console because they run outside the app bundle. `no-console` lint now enforces the policy across `packages/hydrogen/src`.
- b5e3264: Add `localHttps()` under `@shopify/hydrogen/vite` for portable local HTTPS development with Customer Account API flows. Frameworks that terminate HTTPS outside Vite can use `localHttps(...).api.getDevServerConfig()`.
  
  Certificates can be provisioned by the plugin (after confirmation on `vite dev`), the `provisionLocalHttps()` helper, or the `hydrogen certs install` CLI command. Each path downloads a pinned, checksum-verified mkcert release for macOS, Linux, or Windows, installs the local certificate authority, and generates the certificate files. The plugin skips automatic provisioning in CI environments; the explicit paths remain available there. The paired `hydrogen certs uninstall` command removes Hydrogen's files and can remove the shared mkcert CA when passed `--remove-ca`.
  
  When a local HTTPS server starts outside CI, the plugin uses Shopify CLI to link an unlinked project and push the callback, portless JavaScript origin, and logout URLs to the Customer Account API configuration. Shopify CLI must include `@shopify/cli-hydrogen` 13.0.4 or later. CI, missing CLI support, cancelled linking, and push failures fall back to printing the values for manual configuration without stopping the development server.
  
  Framework templates and examples expose local HTTPS through the `dev:https` package script, which the Vite configuration detects through `npm_lifecycle_event`.
- 4e5b4a2: Fix `formatMoney().amount` dropping the minus sign for negative amounts, so `-19.99` no longer renders as `19.99`.
- 5824ade: Add standard route templates for cart, search, policy, and collection-listing pages so custom storefront routes can be matched, resolved, and redirected consistently.
  
  Predictive search query suggestions now honor the configured `search` route.
- a9c4cc5: Add `register("attributeValue", { key, value })` to `ProductFormRegister` for attaching line-item attributes (engraving text, gift messages, custom options) through the form-based add-to-cart path. Both client-side (`getAddPayload`) and server-side (`parseAddIntent`) now extract `attributes.*` entries from FormData. Exports two new types: `ProductAttributeValueProps` and `ProductAttributeDefaultValueProps`.
- 3eddd29: **Breaking:** Remove the top-level `analytics.subscribe()` method. Register event consumers with `analytics.addDestination()` and use the `subscribe` function provided to its setup callback. All event consumers now receive consent-gated delivery and buffered replay.
  
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
- 43c0ee8: `hydrogen setup` now works without a `package.json`. When run in a directory with no project, it prompts to either scaffold the React Router template from the `dist-preview` branch or install AI coding skills only. Existing behavior (install Hydrogen + sync skills) is preserved when a `package.json` is present.
- fb35e5d: Add `hydrogen skills check`, which exits non-zero when the project's synced skills do not match the installed `@shopify/hydrogen`, or were never synced. It prints the summary `skills sync` would act on and writes nothing. The default `--mode=error` gates CI; `--mode=warn` prints the same message and exits zero for dev scripts.
- c06735e: Add `hydrogen skills sync` to keep packaged agent skills aligned with the installed `@shopify/hydrogen` version. Skills are always written to both `.claude/skills` and `.agents/skills`, covering Claude Code, Codex, Cursor, and OpenCode without configuration. Each copied `SKILL.md` records the package version and a content hash under frontmatter `metadata`. Rerunning the command after an upgrade overwrites unmodified skills, adds new ones, removes skills the package no longer ships, and leaves locally modified skills alone unless `--force` is passed. If you edited a skill the package no longer ships, you are asked before it is removed; without a terminal (for example in CI) it is kept and a warning is printed. `hydrogen setup` runs the same sync after installing the package and accepts the same `--force`, so rerunning it over previously synced skills now updates them instead of failing. Preview templates ship their skills with the same metadata, so `skills sync` works on deployed templates too.
  
  Projects that ran `hydrogen setup` before this version have skills without the metadata block. Run `npx @shopify/hydrogen skills sync --force` once to adopt them; later syncs then manage them normally. Skills from those earlier copies whose names are no longer shipped are not recognised and should be deleted by hand.
- fe72d05: Storefront API stale-while-revalidate refreshes are no longer cancelled when the request or caller aborts, and are bounded by `defaultTimeoutInMs` instead (30 seconds when it is `0`). Custom `createFetchWithCache` runners can call `run({ background: true })` to use the new `backgroundSignal` cache option, and runners that call `run()` keep working.
  
  The `hydrogen-storefront-client` and `hydrogen-customer-account` skills now note that the Next.js edge sandbox lacks `AbortSignal.any`, so edge routes and middleware that call those clients need a polyfill. The `hydrogen-cart-ui` skill notes that Safari 16.0 through 17.3 lacks it too, so the browser cart store needs the polyfill there.
- 6d03781: Add an optional `storefrontId` to `createStorefrontClient` so direct and proxied Storefront API requests include the trusted `Shopify-Storefront-Id` header for cart analytics attribution.
- 1c5de10: Proxy caller-authenticated UCP MCP requests from `/api/ucp/mcp` to the configured Shopify store.

### Patch Changes

- dcbf46a: `hydrogen setup` now installs `@shopify/hydrogen` from the `latest` dist-tag instead of `preview`, and the `hydrogen-setup` skill asks for `@shopify/hydrogen` 2026.10.0 or later instead of the `preview` tag. If you synced skills from a preview release, run `npx @shopify/hydrogen skills sync` after upgrading to pick up the updated skill.
- a9bf729: **Breaking:** Use version `2026-10` of the Storefront API and Customer Account API, up from `2026-04`. Changes from both the [2026-07](https://shopify.dev/changelog/release-notes/2026-07) and [2026-10](https://shopify.dev/changelog/release-notes/2026-10) releases apply. The ones most likely to affect your code:
  
  - Customer Account API: `CustomerAddress.territoryCode` and `CustomerAddressInput.territoryCode` are deprecated in favor of `countryCode`, which takes an upper-case, two-letter `CountryCode` such as `US` (not `USA` or `840`). The API still accepts `territoryCode`, but it no longer appears in Hydrogen's generated `CustomerAddressInput` type because the Customer Account schema omits deprecated input fields, so typed address mutations must send `countryCode`. An unknown `countryCode` fails the whole request with a GraphQL error before the mutation runs.
  - Customer Account API: `Order.shippingTitle` is removed. `Order.shippingLine` still has a `title`.
  - Customer Account API: `Customer.lastIncompleteCheckout` and the `Checkout` types are removed.
  - Storefront API: the replacements for the deprecated `Cart.discountAllocations` and `CartDiscountAllocation.discountApplication` are now available: `Cart.discountApplications`, `CartDeliveryGroup.discountAllocations`, `CartDiscountAllocation.sourceDiscountApplication`, and a `lineLevelOnly` argument on cart line `discountAllocations`. `lineLevelOnly` defaults to `true`, so existing queries are unaffected; pass `false` to include order-level discounts.
  - Storefront API: `ShopPayPaymentRequestSession.paymentRequest` is deprecated and can now be `null`. The `paymentRequest` argument of the `shopPayPaymentRequestSessionCreate` mutation is deprecated too, and is now optional (`MutationShopPayPaymentRequestSessionCreateArgs.paymentRequest` is `InputMaybe<ShopPayPaymentRequestInput>`).
  - `hydrogen gql check --fail-on-warn` fails when a query selects a deprecated field, and Hydrogen's schemas now mark more fields as deprecated, including `CustomerAddress.territoryCode`, `CustomerPhoneNumber.marketingState`, and the Shop Pay payment request `deliveryMethods`.
- fc18689: Fix editor autocomplete on `createStorefrontClient`: the `type` discriminant now suggests all client types and `config` completions narrow to the selected type, instead of resolving against the first overload only.
- 5a02ecb: Storefront Agent requests now route through the generic `/__shopify/*` Shopify API proxy. Unprefixed `/agent/buyer-claims` and `/agent/handoff` requests are no longer intercepted and fall through to app routing, where they may return a 404 or catch-all HTML response.
- 81747de: Source private Storefront API buyer IP exclusively from `requestContext`. Remove `buyerIp` from private client config and require a buyer-bearing context created with `createShopifyRequestContext({buyerIp})`.
- 8e84ade: Stop manually forwarding analytics events to PerfKit's SPA navigation methods. PerfKit will consume the standard `shopify:page:view` event directly.
- 02b2df2: Enable Shopify runtime modules initialized by `ShopifyScripts` to send same-origin API requests through `handleShopifyRoutes`, forwarding them to the Shopify's backend while filtering hop-by-hop request headers.
- d3b8639: Redirect cart form submissions to `/` when the same-origin `Referer` path starts with `//`, instead of returning a path that resolves to another host.
- 009d77f: The built-in cart queries now select `Cart.updatedAt`, so cart analytics deduplication works without a custom `CartFragment`.
- 55ba5b9: The cart route now keeps `merchandiseId` on line updates, so `{ id, merchandiseId, quantity }` swaps an existing line to another variant, as the Storefront API allows. `CartLineUpdateInput` has the new optional `merchandiseId` field, and the store shows the swapped variant once Shopify responds, without keeping fields from the old variant. When Shopify returns the line under a new line ID while other changes are in flight, the swapped line appears after the cart refresh that follows them.
- 46be6e2: Add the `hydrogen-cart-metafields` skill: a behavioral guide for reading and writing cart metafields (custom cart data such as delivery instructions) through a custom `CartFragment`, an app-owned mutation route, and `useCartActions().refresh()`.
- 55ba5b9: A settled cart mutation now replaces every non-line field its response returns, including discount codes and fields a custom `CartFragment` selects, such as `appliedGiftCards` or `buyerIdentity`. Before, the store only took the id, checkout URL, totals and cost, so other fields stayed stale and a cart created by the first add had none of them until a refresh.
- 55ba5b9: The cart route now rejects a JSON body that combines `lines`, `discountCodes`, `attributes` or `note` with an `invalid_cart_request` error, instead of running one of them and silently dropping the rest. Send one kind of change per request, for example one `Shopify.actions.updateCart` call per kind; the store rolls back the projections of a rejected call.
- d37b900: Replace cart optimistic update internals with keyed transaction and error projections, including reliable cancellation, request settlement, pending state updates, accurate partial-connection quantities, and coalesced authoritative reconciliation after overlapping mutations. Add `CartState.revalidating`, `CartState.pending.cost`, and default cart line identity fields for selling plans and attributes so totals, analytics, and optimistic add reconciliation remain accurate while cost-affecting mutations settle.
- 55ba5b9: The `hydrogen-cart-ui` skill now lists the Standard Actions runtime as a prerequisite and explains how to change the cart from code with `Shopify.actions.updateCart`.
- e1e80c2: Reset `before` and `after` pagination cursors when collection filters or sorting change.
- 0fc3dda: Prevent the Shopify API proxy from forwarding Cloudflare's client IP header to Shopify.
- c15c91f: Apply private, no-store cache directives to any response containing `Set-Cookie`, including application-owned cookies, instead of checking specific Shopify cookie names. Remove conflicting CDN cache directives from these responses.
- 8aba49b: Clarify collection filter guidance and examples for price ranges.
- 66a34c0: Allowlist the Frontend Event Collector ingress path (`/.well-known/shopify/fec/produce`) in the well-known proxy. This forwards the first-party path to the Online Store origin so WebMCP analytics reach the collector on headless storefronts, matching how Online Store storefronts route it through the myshopify.com edge.
- a95fc6f: Finalize responses returned by `handleShopifyRoutes` and `handleShopifyRedirects` with the storefront headers required by Hydrogen, including the `powered-by` response identity. Framework integrations can now return these responses directly without applying storefront headers again.
- 99ff202: Render the Shop Pay button locally instead of loading Shopify's hosted shop-js web component. `createShopPayButton` now creates a self-contained `<hydrogen-shop-pay-button>` with protected shadow-root styles; add `renderShopPayButton` for server HTML, `defineShopPayButton` for custom-element registration, and `getShopPayButtonUrl` for checkout URL construction. The button works before JavaScript runs, supports `accessibilityLabel`, accepts a `nonce` for the shadow-root stylesheet, preserves optional explicit channel attribution, and limits styling to `width` and `borderRadius`. Strict Content Security Policies must still allow inline style attributes for custom width and border radius values. Remove `loadShopJs`, `getShopPayButtonAttributes`, the React and Vue `loadScript` prop, and the dev-only click interception.
- 8af213c: Expose package metadata listing the Hydrogen classic CLI commands disabled for this package.
- 9d523ee: Declare all library GraphQL documents with `gql()` so the gql.tada plugin validates them, and add a `gql(document, fragments)` overload that composes additional fragments onto an already-declared document while preserving inferred types.
- b48d2d2: Use document navigation for Shopify checkout, cart permalink, and Customer Account handoff routes so Hydrogen can complete its server redirects.
- d849c53: Cart permalinks now hand off to the mock.shop demo store for every mock.shop host, not only `mock.shop` itself, so a storefront built against a per-store host such as `pets.mock.shop` behaves the same in mock mode. The `hydrogen-storefront-client` and `hydrogen-setup` skills now explain that mock.shop is a catalog of stores and how to pick one from https://mock.shop/llms.txt.
- 3bf3959: Fix `formatMoney().amount` keeping the space that separates the number from the currency symbol, so `19,99 €` in `fr-FR` yields `19,99` instead of `19,99 `. Right-to-left locales such as `he-IL` and `ar-EG` keep the marks that bind the minus sign to the digits and lose the trailing space and mark.
- 3bf3959: Fix `formatMoney([min, max], { withoutTrailingZeros: true })` rounding the maximum when only the minimum is a whole number, so `$10.00` to `$19.99` renders as `$10.00 – $19.99` instead of `$10 – $20`. Whole-number detection now looks only at the rendered minimum and maximum, so values in between no longer affect the output.
- cf85673: Reduce reordering when optimistic cart additions resolve, and include selected options and product handles in pending product form additions.
- c8d75a8: `makePredictiveSearchQueries()` and `createPredictiveSearchServerHandlers({ fragments })` now reject custom fragments that target a type whose name only starts with the expected one, such as `fragment PredictiveSearchProductFragment on ProductVariant`. These previously passed the local check and only failed once the Storefront API rejected the query.
- c8d75a8: Fix `createPredictiveSearchServerHandlers()` ignoring its configured `limit` when a request sends an empty, whitespace-only, or non-numeric `limit` query parameter. Previously `?limit=` searched with a limit of 1 and `?limit=abc` used Hydrogen's default of 5.
- c8d75a8: Fix React `usePredictiveSearchActions()` returning `search` and `clear` functions that silently stopped working after a `PredictiveSearchProvider` prop change recreated the store. The actions now keep a stable identity and always target the provider's current store, matching the Vue bindings. Handlers returned by `usePredictiveSearchForm()`'s `register` and `formProps` also keep searching the current store when captured before a provider prop change.
- 50b846f: Update the collection browser skill with currency-aware price inputs that use narrow currency symbols and accessible currency labels, and submit price inputs on change with a 350 ms debounce instead of on blur. Filter controls stay mounted and enabled while results load, checked and selected values bind to browse state instead of remounting on filter state, and native keyboard behavior is kept.
- a4f48b9: Fix product form store losing its cart subscription after React StrictMode effect replay in development. The store now exposes a `connect()` method that re-subscribes to the cart store, and `ProductProvider` calls it on every effect mount so the subscription survives StrictMode's mount → cleanup → remount cycle.
- a6be4b6: Rename local HTTPS development scripts from `https:dev` to `dev:https` and rely on the Vite plugin to provision certificates automatically.
- 01d1dc6: Prevent superseded cart mutations from producing unhandled `AbortError` console errors.
- db3efd5: Remove unused header passed to SFAPI.
- b7f2dfd: Log Storefront API errors from the URL redirect lookup in `handleShopifyRedirects`, such as `THROTTLED`, through the Hydrogen logger, as network failures already are. Before, these errors were dropped silently and the request fell through to the 404 as if no redirect existed.
- d3b8639: Redirect `return_to` and `redirect` query params in `handleShopifyRedirects` to the normalized same-origin path instead of the raw value, so values like `https:other.example/p` or paths that normalize to `//other.example` no longer send shoppers to another host. Values without a leading `/` or a scheme are now ignored.
- 0154e56: `handleShopifyRedirects` now accepts any Storefront client instead of requiring a private one. The redirect lookup only queries `urlRedirects`, which needs no token, so public — including tokenless — clients work. A token-backed client is still recommended for real stores.
- 0847f9b: Reject JSONP `callback` requests before forwarding them through any Shopify proxy.
- 9f490a7: **Breaking:** Remove the unused `EventPayloads` type export. To type a payload for any supported analytics event, use `AnalyticsEventMap[AnalyticsEventName]`. For a single event, use `PayloadFor<"product_viewed">`.
- c15c91f: Stop creating and refreshing the deprecated JavaScript-visible `_shopify_y` and `_shopify_s` cookies from `ShopifyScripts`. Shopify's consent API and Storefront API manage visitor tracking state through the backend cookies.
  
  Forward incoming cookies unchanged so Shopify can resolve tracking state and migrate legacy identifiers. Stop converting legacy cookies into tracking headers or inferring tracking state from the presence of specific analytics cookies. The SFAPI proxy continues forwarding explicit token headers directly from the incoming request, without storing tokens in the request context.
  
  Expire existing legacy cookies on successful HTTP responses to consent-management requests, after forwarding them upstream. Cleanup covers host-only and parent-domain cookies, including after consent denial or revocation.
- f9ff975: **Breaking:** Remove the `locations`, `path`, and `extensions` fields from `StorefrontApiError` and its `toJSON()` output. `createStorefrontClient` never populated them. `StorefrontApiError` is only thrown for HTTP, network, timeout, and response-parsing failures. GraphQL errors, including `THROTTLED`, are returned in `result.errors`, so read `extensions.code` there:
  
  ```ts
  const result = await storefront.graphql(QUERY);
  if (result.errors?.some((error) => error.extensions?.code === "THROTTLED")) {
    // retry
  }
  ```
- c15c91f: Visitor tokens are now read through Shopify's consent API instead of the `Server-Timing` header.
- d3b8639: Reject Customer Account redirect targets whose normalized path starts with `//`, which resolved to another host. This covers `return_to` on the login, refresh, and logout handlers, `prepareLoginUrl({returnTo})`, and the `defaultPostLoginRedirectPathname` and `loginFailedRedirectPath` options. Same-origin paths and absolute URLs still work. Values without a leading `/` or a scheme, such as `account/orders`, now fall back to the default redirect.
- bfc1a6a: Preserve the incoming `Sec-GPC` header on Storefront API requests and Shopify storefront proxies, independently of consent cookies.
- b4b49f4: The skills now describe where Shopify analytics reads the event currency. Product events take it from the event price's `currencyCode` and fall back to `window.Shopify.currency.active`, which `ShopifyScripts` `i18n.currency` sets. Page, collection, and search views take only the global. When it is unset, Shopify analytics sends them without a currency.
- dc0bef3: Remove incorrect skill guidance about `StorefrontApiError` carrying GraphQL error details, and clarify that analytics `customData` isn't added to published events.
- 1500b70: Update the Next.js markets skill to explain how `proxy.ts` forwards Hydrogen request context to Server Components.
- 9f8a7c5: Fix malformed URLs when a locale path prefix has surrounding whitespace.
  
  Before: a prefix like `" /fr-ca/ "` leaked into resolved paths, producing `/ /fr-ca/ /products`.
  After: the prefix normalizes to `/fr-ca`, producing `/fr-ca/products`.
  
  Also removes internal dead code; no public API changes.
- 111b0ea: Fix `@shopify/hydrogen/ts-plugin` not loading in editors. tsserver resolves `compilerOptions.plugins` with TypeScript's legacy JS resolver, which ignores package `exports`, so the plugin was silently skipped and GraphQL hover docs and completions inside `gql()` documents were missing. The package now ships a `ts-plugin/package.json` that the legacy resolver can find. Type errors for invalid fields were unaffected since those come from `gql()` types, not the plugin.
- dd40f3d: Serve Shopify's managed UCP business profile from headless storefront origins through `handleShopifyRoutes`.
- 6d58203: **Breaking:** Remove the standalone `CartProvider`, `useCart`, `useCartActions`, and `useCartForm` exports from `@shopify/hydrogen/react`. They dropped custom `CartFragment` types. Use the typed versions from `createCartComponents()` instead:
  
  ```ts
  import { createCartComponents } from "@shopify/hydrogen/react";
  
  import type { cartHandlers } from "./cart-handlers";
  
  export const { CartProvider, useCart, useCartActions, useCartForm } =
    createCartComponents<typeof cartHandlers>();
  ```
  
  `useCartAnalytics` is still exported.
- cebd16d: **Breaking:** Remove the standalone `useCartActions` export from `@shopify/hydrogen/vue`, matching the React entry after #4056. It dropped custom `CartFragment` types. Use the typed version from `createCartComponents()` instead:
  
  ```ts
  import { createCartComponents } from "@shopify/hydrogen/vue";
  
  import type { cartHandlers } from "./cart-handlers";
  
  export const { CartProvider, useCart, useCartActions, useCartForm } =
    createCartComponents<typeof cartHandlers>();
  ```
  
  `useCartAnalytics` is still exported.
- daca404: Correct the `hydrogen-variant-form` skill's guidance for same-product option links. The skill said a hydrated click could run the registered handler and the link's own navigation together, and that the second navigation was a harmless no-op. It is not: the link's navigation refetches the loader that a resolved selection skipped, and a modifier click (new tab) also changes the current page. The skill and its React and Next.js references now run the registered handler only for a plain click and cancel the link's own navigation, so the provider's `onSelect` performs the only navigation. The skill also now requires focus to stay on the activated value across a combined-listing switch, and the React and Next.js references show how each framework keeps it.
- dfb3e95: Update the `hydrogen-variant-form` skill so that progressive option links make one client navigation after hydration. Option links keep a real `href` for no-JS shoppers. A guarded click handler calls the registered handler, and the provider `onSelect` is the only navigation. Modifier-key and new-tab clicks stay native. The link `href` and `onSelect` use the same current-query base. The skill now shows the React Router, Next.js (`onNavigate`), and Nuxt (`NuxtLink` `custom`) patterns, and the same guarded-anchor pattern for SolidStart and SvelteKit apps that use the core store directly. The `hydrogen-setup` product detail page step now follows the same guidance.
- 7762af6: Vue `useCollectionForm().formProps()` now passes a `SubmitEvent` to `beforeSubmit` and `afterSubmit`, matching the React binding. You can read `e.submitter` without casting. Existing callbacks typed as `(e: Event) => void` still work.
  
  `CollectionActions` is now also exported from `@shopify/hydrogen` for custom framework bindings. The React and Vue entries still export the same type.
- 14fd56a: Vue `useCartForm().formProps()` and `useProductForm().formProps()` now pass a `SubmitEvent` to `beforeSubmit` and `afterSubmit`, matching the React bindings. You can read `e.submitter` without casting. Existing callbacks typed as `(e: Event) => void` still work.
  
  `CartActions` and `PredictiveSearchActions` are now also exported from `@shopify/hydrogen` for custom framework bindings. The React and Vue entries still export the same types.
- 31125f8: Fix the Vue `ShopifyScripts` component to match core and the React binding: the `routes` prop is now optional at runtime (previously Vue logged a missing-prop warning when it was omitted) and is included in the exported `ShopifyScriptsProps` type.
- c5293e9: Fix the Vue `ShopifyScripts` component to declare and forward all core script options, including `shopifyAnalytics`, and align Inbox runtime prop validation with its boolean API.
- 31125f8: Add a `useCartAnalytics()` composable to the Vue binding (`@shopify/hydrogen/vue`), mirroring the React binding's hook. Call it in a component inside `CartProvider` to subscribe the cart store to analytics tracking on mount and unsubscribe on dispose.
- 251c428: Update WebMCP CDN script URL to `shopifycloud/storefront/webmcp/webmcp.js`.
- 53af176: Proxy allowlisted Shopify well-known resources through `handleShopifyRoutes`.

## 2026.10.0-preview.5

### Minor Changes

- 1891913: `ProductPayload.price` is now `{ amount, currencyCode }`, the Storefront API `MoneyV2` shape, instead of a bare amount string. The hosted Shopify analytics script reads `currencyCode` as the event's currency, so `product_viewed` events no longer depend on `window.Shopify.currency.active` being set. Pass the variant's `price` object where you used to pass `price.amount`:
  
  ```ts
  // before
  price: variant.price.amount,
  // after
  price: variant.price,
  ```
  
  This is a breaking type change for anyone publishing `product_viewed` with a string `price`. `price` is the generated `MoneyV2` type, so `currencyCode` is the Storefront API `CurrencyCode` union rather than any string. Import `MoneyV2` or `CurrencyCode` from `@shopify/hydrogen/storefront-api-types` when you type a payload by hand.
- 94159a8: Storefront API stale-while-revalidate refreshes are no longer cancelled when the request or caller aborts, and are bounded by `defaultTimeoutInMs` instead (30 seconds when it is `0`). Custom `createFetchWithCache` runners can call `run({ background: true })` to use the new `backgroundSignal` cache option, and runners that call `run()` keep working.
  
  The `hydrogen-storefront-client` and `hydrogen-customer-account` skills now note that the Next.js edge sandbox lacks `AbortSignal.any`, so edge routes and middleware that call those clients need a polyfill. The `hydrogen-cart-ui` skill notes that Safari 16.0 through 17.3 lacks it too, so the browser cart store needs the polyfill there.

### Patch Changes

- 7094944: The cart route now keeps `merchandiseId` on line updates, so `{ id, merchandiseId, quantity }` swaps an existing line to another variant, as the Storefront API allows. `CartLineUpdateInput` has the new optional `merchandiseId` field, and the store shows the swapped variant once Shopify responds, without keeping fields from the old variant. When Shopify returns the line under a new line ID while other changes are in flight, the swapped line appears after the cart refresh that follows them.
- 7094944: A settled cart mutation now replaces every non-line field its response returns, including discount codes and fields a custom `CartFragment` selects, such as `appliedGiftCards` or `buyerIdentity`. Before, the store only took the id, checkout URL, totals and cost, so other fields stayed stale and a cart created by the first add had none of them until a refresh.
- 7094944: The cart route now rejects a JSON body that combines `lines`, `discountCodes`, `attributes` or `note` with an `invalid_cart_request` error, instead of running one of them and silently dropping the rest. Send one kind of change per request, for example one `Shopify.actions.updateCart` call per kind; the store rolls back the projections of a rejected call.
- 7094944: The `hydrogen-cart-ui` skill now lists the Standard Actions runtime as a prerequisite and explains how to change the cart from code with `Shopify.actions.updateCart`.
- e1cbafd: Fix `formatMoney().amount` keeping the space that separates the number from the currency symbol, so `19,99 €` in `fr-FR` yields `19,99` instead of `19,99 `. Right-to-left locales such as `he-IL` and `ar-EG` keep the marks that bind the minus sign to the digits and lose the trailing space and mark.
- e1cbafd: Fix `formatMoney([min, max], { withoutTrailingZeros: true })` rounding the maximum when only the minimum is a whole number, so `$10.00` to `$19.99` renders as `$10.00 – $19.99` instead of `$10 – $20`. Whole-number detection now looks only at the rendered minimum and maximum, so values in between no longer affect the output.
- 53c405f: Update the collection browser skill with currency-aware price inputs that use narrow currency symbols and accessible currency labels, and submit price inputs on change with a 350 ms debounce instead of on blur. Filter controls stay mounted and enabled while results load, checked and selected values bind to browse state instead of remounting on filter state, and native keyboard behavior is kept.
- 980f4a4: Log Storefront API errors from the URL redirect lookup in `handleShopifyRedirects`, such as `THROTTLED`, through the Hydrogen logger, as network failures already are. Before, these errors were dropped silently and the request fell through to the 404 as if no redirect existed.
- 8d2bfd1: The skills now describe where Shopify analytics reads the event currency. Product events take it from the event price's `currencyCode` and fall back to `window.Shopify.currency.active`, which `ShopifyScripts` `i18n.currency` sets. Page, collection, and search views take only the global. When it is unset, Shopify analytics sends them without a currency.
- c0f7dbd: Serve Shopify's managed UCP business profile from headless storefront origins through `handleShopifyRoutes`.
- bf16509: **Breaking:** Remove the standalone `useCartActions` export from `@shopify/hydrogen/vue`, matching the React entry after #4056. It dropped custom `CartFragment` types. Use the typed version from `createCartComponents()` instead:
  
  ```ts
  import { createCartComponents } from "@shopify/hydrogen/vue";
  
  import type { cartHandlers } from "./cart-handlers";
  
  export const { CartProvider, useCart, useCartActions, useCartForm } =
    createCartComponents<typeof cartHandlers>();
  ```
  
  `useCartAnalytics` is still exported.
- f43dace: Correct the `hydrogen-variant-form` skill's guidance for same-product option links. The skill said a hydrated click could run the registered handler and the link's own navigation together, and that the second navigation was a harmless no-op. It is not: the link's navigation refetches the loader that a resolved selection skipped, and a modifier click (new tab) also changes the current page. The skill and its React and Next.js references now run the registered handler only for a plain click and cancel the link's own navigation, so the provider's `onSelect` performs the only navigation. The skill also now requires focus to stay on the activated value across a combined-listing switch, and the React and Next.js references show how each framework keeps it.
- b826e25: Update the `hydrogen-variant-form` skill so that progressive option links make one client navigation after hydration. Option links keep a real `href` for no-JS shoppers. A guarded click handler calls the registered handler, and the provider `onSelect` is the only navigation. Modifier-key and new-tab clicks stay native. The link `href` and `onSelect` use the same current-query base. The skill now shows the React Router, Next.js (`onNavigate`), and Nuxt (`NuxtLink` `custom`) patterns, and the same guarded-anchor pattern for SolidStart and SvelteKit apps that use the core store directly. The `hydrogen-setup` product detail page step now follows the same guidance.

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
- d81ff58: Forward UCP `/buy/{items}` permalinks to the configured Shopify store from `handleShopifyRoutes`, alongside the existing `/cart/{items}` handoff. The forward keeps the path and query untouched and uses the UCP redirect-resolution shape (303 with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`). In-app navigation to a buy permalink through `Shopify.routes.navigate` becomes a document navigation so the forward can run.
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

- 928cd61: **Breaking:** Use version `2026-10` of the Storefront API and Customer Account API, up from `2026-04`. Changes from both the [2026-07](https://shopify.dev/changelog/release-notes/2026-07) and [2026-10](https://shopify.dev/changelog/release-notes/2026-10) releases apply. The ones most likely to affect your code:
  
  - Customer Account API: `CustomerAddress.territoryCode` and `CustomerAddressInput.territoryCode` are deprecated in favor of `countryCode`, which takes an upper-case, two-letter `CountryCode` such as `US` (not `USA` or `840`). The API still accepts `territoryCode`, but it no longer appears in Hydrogen's generated `CustomerAddressInput` type because the Customer Account schema omits deprecated input fields, so typed address mutations must send `countryCode`. An unknown `countryCode` fails the whole request with a GraphQL error before the mutation runs.
  - Customer Account API: `Order.shippingTitle` is removed. `Order.shippingLine` still has a `title`.
  - Customer Account API: `Customer.lastIncompleteCheckout` and the `Checkout` types are removed.
  - Storefront API: the replacements for the deprecated `Cart.discountAllocations` and `CartDiscountAllocation.discountApplication` are now available: `Cart.discountApplications`, `CartDeliveryGroup.discountAllocations`, `CartDiscountAllocation.sourceDiscountApplication`, and a `lineLevelOnly` argument on cart line `discountAllocations`. `lineLevelOnly` defaults to `true`, so existing queries are unaffected; pass `false` to include order-level discounts.
  - Storefront API: `ShopPayPaymentRequestSession.paymentRequest` is deprecated and can now be `null`. The `paymentRequest` argument of the `shopPayPaymentRequestSessionCreate` mutation is deprecated too, and is now optional (`MutationShopPayPaymentRequestSessionCreateArgs.paymentRequest` is `InputMaybe<ShopPayPaymentRequestInput>`).
  - `hydrogen gql check --fail-on-warn` fails when a query selects a deprecated field, and Hydrogen's schemas now mark more fields as deprecated, including `CustomerAddress.territoryCode`, `CustomerPhoneNumber.marketingState`, and the Shop Pay payment request `deliveryMethods`.
- f047611: Redirect cart form submissions to `/` when the same-origin `Referer` path starts with `//`, instead of returning a path that resolves to another host.
- e695643: The built-in cart queries now select `Cart.updatedAt`, so cart analytics deduplication works without a custom `CartFragment`.
- b202925: Apply private, no-store cache directives to any response containing `Set-Cookie`, including application-owned cookies, instead of checking specific Shopify cookie names. Remove conflicting CDN cache directives from these responses.
- ecefec2: `makePredictiveSearchQueries()` and `createPredictiveSearchServerHandlers({ fragments })` now reject custom fragments that target a type whose name only starts with the expected one, such as `fragment PredictiveSearchProductFragment on ProductVariant`. These previously passed the local check and only failed once the Storefront API rejected the query.
- ecefec2: Fix `createPredictiveSearchServerHandlers()` ignoring its configured `limit` when a request sends an empty, whitespace-only, or non-numeric `limit` query parameter. Previously `?limit=` searched with a limit of 1 and `?limit=abc` used Hydrogen's default of 5.
- ecefec2: Fix React `usePredictiveSearchActions()` returning `search` and `clear` functions that silently stopped working after a `PredictiveSearchProvider` prop change recreated the store. The actions now keep a stable identity and always target the provider's current store, matching the Vue bindings. Handlers returned by `usePredictiveSearchForm()`'s `register` and `formProps` also keep searching the current store when captured before a provider prop change.
- b2c7791: Fix product form store losing its cart subscription after React StrictMode effect replay in development. The store now exposes a `connect()` method that re-subscribes to the cart store, and `ProductProvider` calls it on every effect mount so the subscription survives StrictMode's mount → cleanup → remount cycle.
- f047611: Redirect `return_to` and `redirect` query params in `handleShopifyRedirects` to the normalized same-origin path instead of the raw value, so values like `https:other.example/p` or paths that normalize to `//other.example` no longer send shoppers to another host. Values without a leading `/` or a scheme are now ignored.
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
- f047611: Reject Customer Account redirect targets whose normalized path starts with `//`, which resolved to another host. This covers `return_to` on the login, refresh, and logout handlers, `prepareLoginUrl({returnTo})`, and the `defaultPostLoginRedirectPathname` and `loginFailedRedirectPath` options. Same-origin paths and absolute URLs still work. Values without a leading `/` or a scheme, such as `account/orders`, now fall back to the default redirect.
- e02d5be: Preserve the incoming `Sec-GPC` header on Storefront API requests and Shopify storefront proxies, independently of consent cookies.
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
- af36916: Update WebMCP CDN script URL to `shopifycloud/storefront/webmcp/webmcp.js`.

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
