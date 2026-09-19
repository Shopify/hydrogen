# Analytics Troubleshooting

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
- **Duplicate dev events come from duplicate registrations, not from the bus.** During HMR or React Strict Mode double-mount, destinations and cart trackers can register twice and emit twice. Clean up with the functions those registrations return — `addDestination()`'s cleanup, `subscribe()`'s unsubscribe, `trackCartAnalytics()`'s stop function — in the framework's teardown hook. Do not call `analytics.destroy()` for component teardown: it tears down the page-lifetime singleton and deletes `window.Shopify.analytics`, while a cached `getAnalytics()` reference keeps pointing at the dead bus, so later publishes silently do nothing.
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
