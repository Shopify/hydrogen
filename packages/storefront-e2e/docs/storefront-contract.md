# Storefront E2E Contract

This package runs one Playwright suite against an already-running storefront. It uses live data only. It does not start a server, set environment variables, or mock Storefront API responses.

The runtime source of truth for test group prerequisites lives in specs/*/config.ts. Shared route and GraphQL validation lives in src/spec-config-validation.ts. Domain-specific setup and probes stay inline in the config or spec file that uses them. Error formatting lives in src/contract.ts; domain-specific messages live near the matcher or spec. This document explains the same contract for humans.

The suite uses a tokenless Hydrogen Storefront API client for read-only discovery. Discovery uses the Storefront API version bundled with Hydrogen. Storefront API failures stop the affected test group instead of falling back to DOM-only discovery. Cart and checkout discovery ignore subscription-only products and prefer variants that are available for sale.

Each test group validates its own prerequisites in config.ts before any test runs. Required product, cart, and checkout prerequisites fail their test group with an actionable message. Optional collection, collection filter, search, and product variant prerequisites skip their group when the storefront data or route is unavailable.

## Routes

The tested storefront must expose the routes required by each active test group. Route checks use a bounded fetch before the browser test runs so missing routes fail or skip with setup context instead of timing out deep in the test.

Default route expectations:

- /cart is required for default cart and checkout tests
- Product detail routes at /products/:handle are required for default product, cart, and checkout tests
- /collections/:handle is required for collection tests when a collection with products exists
- /search is required for search tests when in-stock products exist

Required groups fail on route HTTP failures; optional groups skip.

## Product Results

Collection and search pages must expose product cards as accessible links to product detail pages.

Current first-pass discovery assumes standard label strings and link paths. A future contract should add explicit storefront-owned signifiers so the suite can distinguish product results from unrelated product links without relying on labels alone.

## Collection Filters

At least one probed collection must expose a visible, enabled checkbox filter that changes the URL, returns products, and reduces the visible product-link count when selected. Filters may auto-submit or use a visible Apply filters/Show results button.

Filter labels must include a count like Color Red (4). The suite uses that count to choose a filter that narrows the visible product links, then asserts the filtered result count does not exceed the label count. Browser Back after a filter selection must restore the previous URL and show the same filter unchecked. Missing Storefront API filter data skips the collection filter group.

## Search

The search page must expose a searchbox. A visible button with an accessible name containing Search is supported; otherwise the suite submits the searchbox with Enter.

The suite discovers a live product title, searches for it, and verifies that product appears in visible results.

## Variant Options

At least one probed product must expose a selectable variant control.

Supported controls:

- Same-product links whose href is a product URL with selected option query params. The selected link has `aria-current="true"`.
- Buttons with `aria-pressed`. The selected button has `aria-pressed="true"`. Buttons work only with JavaScript; the no-JavaScript check needs links.

With JavaScript, selecting a value must put the selection in the URL (for a link, the link's href) and mark the value as selected. Loading that URL directly must render the product heading and show the same value as selected. Selection must keep unrelated non-option query params (the suite uses `storefront_e2e_ref=variant-check`).

Without JavaScript, the product heading must render, and at least one probed product must expose a same-product variant link for an unselected value. A native click on that link must load its href, keep unrelated query params, and the server-rendered page must mark that value as selected.

Selected values should also be visibly indicated (styling or text). The suite does not check this. It also does not check that hydration is complete before it clicks, how many navigations or document loads a selection makes, or the visible appearance, price, or merchandise of the selected variant.

Set STOREFRONT_SKIP_NO_JS_VARIANTS=true to skip the no-JavaScript check for a storefront that cannot render the product page without JavaScript or does not render variant links. A skip is an expected opt-out, not a pass. The Next.js template sets it in CI because its product content streams behind a Suspense fallback.

## Cart Line Items

Cart lines must be visible list items containing the product title.

After Add to cart, the suite must be able to inspect the added line in a cart drawer dialog before navigating to the cart page. Either open the drawer immediately with the optimistic line, or expose a visible page-level button whose accessible name begins with Cart, Open cart, or View cart so the suite can open the drawer while the update is pending.

Each line must expose:

- Variant text when the product has a non-default variant
- A quantity input
- A visible increase control named Increase or +
- A visible decrease control named Decrease or -
- A visible remove control named Remove

Cart totals must expose a `role="status"` region that says `Updating cart totals` while cart totals are stale, then `Cart totals updated` after mutation settlement. Do not announce `Cart totals updated` on initial idle render before a mutation cycle. The region may be visually hidden if it remains available to assistive technology.

Accessible labels are preferred. Broad data-testid attributes should only be used when a semantic role or label cannot express the user-facing concept.

## Signifiers

Some controls use a standard signifier: a `data-h3` attribute with the signifier name, plus `data-h3-*` state attributes. Signifiers are present in production too. Use `signifier()` or a Hydrogen form binding to write them. Do not write them by hand. See [ADR 0001](adr/0001-standard-signifiers.md) for the design.

The suite finds a signifier like this:

- One visible match among several attached matches wins.
- If no match is visible, exactly one attached match wins. A visually hidden control is usable.
- More than one visible match, or more than one hidden match with no visible match, fails as ambiguous.

The minimum Hydrogen version with signifiers is not released yet.

### product-add-to-cart

The add-to-cart submit control on product detail pages.

State: `variantId` (string) and `available` (boolean). Both are required. When no variant is selected, the state is `variantId: ''` and `available: false` (boolean). The DOM then has `data-h3-variant-id=""` and `data-h3-available="false"` (string).

Fix a missing or ambiguous signifier:

- With Hydrogen form bindings: spread `register('addToCart', {})` on the control. It adds live attributes.
- Without bindings: spread `signifier('product-add-to-cart', { variantId, available })` from `@shopify/hydrogen` on the control.
- If a wrapper component renders the control, make sure it forwards props to the rendered element.
- Keep only one visible add-to-cart control per product page.

## Checkout Handoff

The checkout test verifies only the storefront-owned side of the checkout handoff.

It verifies the added product and variant in the storefront cart, clicks the visible checkout link, and waits for a checkout URL. It does not depend on the external checkout document loading, enter customer data, payment data, or perform any irreversible checkout step.

If the storefront does not start checkout navigation, the test fails as a contract issue. External checkout availability is outside this suite's boundary.

## Operations

Run with:

STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront

Set STOREFRONT_E2E_WORKERS to override the default parallel worker count.
The worker override must be an integer from 1 to 12.

Operational expectations:

- Use a development or example storefront, not a production merchant storefront unless explicitly accepted.
- The owner of STOREFRONT_BASE_URL is responsible for health, live data, cart, and checkout availability.
- Playwright runs headless and fully parallel by default.
- Artifacts are failure-only.
- If CI wiring is added, artifact upload must set explicit retention-days.
- Unit tests intentionally do not enforce coverage thresholds because this package's behavioral coverage is the live storefront contract suite. Add thresholds if non-e2e unit coverage becomes a quality signal for package code.

## Contract Migration

When the storefront contract changes, update the relevant spec matcher, shared helper, and this document together.

The suite consumes the `product-add-to-cart` signifier. Other areas still use label strings and semantic roles. Generated examples should migrate toward explicit storefront-owned signifiers for product results, variant options, cart lines, and checkout summaries. Add a signifier only when a spec consumes it, and update the [Signifiers](#signifiers) section in the same change.
