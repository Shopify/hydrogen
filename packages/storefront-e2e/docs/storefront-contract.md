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

Collection and search pages must expose product cards with native links to product detail pages. The collection checks find card roots with the `product-card` signifier and the discovered product handle. The root can be the link itself or contain the link. Search discovery is unchanged by this collection migration.

## Collection Filters

At least one probed collection must expose an enabled native checkbox with the `collection-filter-value` signifier. Its `filterId` is the Storefront API filter **value** ID, not the parent filter ID. The checkbox needs its native accessible label and live checked state. A visible wrapping label can make a visually hidden checkbox usable. Filters may auto-submit or use the existing visible Apply filters/Show results button fallback.

Discovery uses API value IDs and counts, not English labels or counts in label text. Selecting a known narrowing value must change the URL, return non-empty product cards, and reduce the visible unique signified product-handle count. The rendered count must not exceed that value's API count; it does not have to equal an API total because results can be paginated. Browser Back must restore the URL, unchecked state of the same value ID, and the initial rendered count. Missing API filter data or no value that can narrow the rendered page is a prerequisite skip, not a pass. Missing or ambiguous signifiers fail the contract.

A storefront may render only some API filter values. The runner probes all known narrowing values for an enabled, unchecked native checkbox with a visible control or wrapping label. If none is usable, the contract error lists each candidate ID and its missing, misplaced, unsupported, hidden-only, disabled, selected, or duplicate-control reason. This is a contract failure, not a data skip.

## Search

The search page must expose a searchbox. A visible button with an accessible name containing Search is supported; otherwise the suite submits the searchbox with Enter.

The suite discovers a live product title, searches for it, and verifies that product appears in visible results.

## Variant Options

At least one probed product must expose a selectable per-value control with the `product-option-value` signifier. Discovery includes variant IDs and options so the selected add-to-cart variant can be checked against Storefront API data.

Discovery samples at most 20 products and 20 variants per product; full catalog coverage is not guaranteed. Product option metadata identifies single-value options that a picker can omit. Each editable option still needs a selected per-value control. The rendered selection, with omitted singleton values filled from option metadata, must match exactly one sampled variant. Missing or ambiguous matches fail rather than taking the expected variant ID from the add-to-cart control.

Supported controls:

- Same-product links whose href is a product URL with selected option query params. The selected link has `aria-current="true"`.
- Buttons with `aria-pressed`. The selected button has `aria-pressed="true"`. Buttons work only with JavaScript; the no-JavaScript check needs links.
- Radio or checkbox inputs with native checked state. Clipped, focusable inputs use keyboard activation, not forced clicks.

Select pickers are not supported in this phase. A signifier on `select` or `option` does not create a supported per-value control. See [ADR 0003](adr/0003-product-signifiers.md).

With JavaScript, selecting a value must put the selection in the URL (for a link, the link's href) and mark the value as selected. Loading that URL directly must render the product heading and show the same value as selected. Selection must keep unrelated non-option query params (the suite uses `storefront_e2e_ref=variant-check`).

Without JavaScript, the product heading must render, and at least one probed product must expose a same-product variant link for an unselected value. A native click on that link must load its href, keep unrelated query params, and the server-rendered page must mark that value as selected.

Selected values should also be visibly indicated (styling or text). The suite does not check this. It also does not check that hydration is complete before it clicks, how many navigations or document loads a selection makes, or the visible appearance or price of the selected variant. It checks that the add-to-cart signifier's variant ID and availability agree with the discovered selected variant.

Set STOREFRONT_SKIP_NO_JS_VARIANTS=true to skip the no-JavaScript check for a storefront that cannot render the product page without JavaScript or does not render variant links. A skip is an expected opt-out, not a pass. The Next.js example sets it in CI because its product content streams behind a Suspense fallback.

## Cart Line Items

Each cart line must have a visible `cart-line` container with its merchandise ID, quantity, and pending state. Keep product information, native controls, accessible names, and line errors in the UI. The runner matches merchandise identity, not product or variant text.

Checkout checks still need the [checkout-only semantic markup](#checkout-handoff). Cart signifiers do not replace those requirements.

After Add to cart, the suite must be able to inspect the added line in a cart drawer dialog before navigating to the cart page. Either open the drawer immediately with the optimistic line, or expose a visible page-level button whose accessible name begins with Cart, Open cart, or View cart so the suite can open the drawer while the update is pending.

Each line must expose:

- A native quantity input with `cart-line-quantity`
- A visible increase control with `cart-line-increase`
- A visible decrease control with `cart-line-decrease`
- A visible remove control with `cart-line-remove`

All four controls must be descendants of their `cart-line` container. A separate remove form is supported inside the container. Keep accessible labels; signifiers do not replace them. A control outside the container is reported as missing for that line.

Cart totals must expose a `role="status"` region that says `Updating cart totals` while cart totals are stale, then `Cart totals updated` after mutation settlement. Do not announce `Cart totals updated` on initial idle render before a mutation cycle. The region may be visually hidden if it remains available to assistive technology.

Accessible labels are preferred. Broad data-testid attributes should only be used when a semantic role or label cannot express the user-facing concept.

The suite still checks rendered quantity, removal, and stock-limit rollback, plus settlement status. `pending=false` alone does not prove success. Without a finite-stock discovery fixture, the rollback check is skipped and remains unverified. Setup uses buyer UI, not injected cookies or storage.

## Signifiers

Some controls use a standard signifier: a `data-shopify-testid` attribute with the signifier name, plus its `data-shopify-` state attributes. Signifiers are present in production too. Use a Hydrogen getter, form binding, or `signifier()` to write them. Do not write them by hand. See [ADR 0001](adr/0001-standard-signifiers.md) for the design.

The suite finds a signifier like this:

- One visible match among several attached matches wins.
- If no match is visible, exactly one attached match wins. A visually hidden control is usable.
- More than one visible match, or more than one hidden match with no visible match, fails as ambiguous.

The minimum Hydrogen version with signifiers is not released yet.

### product-add-to-cart

The add-to-cart submit control on product detail pages.

State: `variantId` (string) and `available` (boolean). Both are required. When no variant is selected, the state is `variantId: ''` and `available: false` (boolean). The DOM then has `data-shopify-variant-id=""` and `data-shopify-available="false"` (string).

Fix a missing or ambiguous signifier:

- With Hydrogen form bindings: spread `register('addToCart', {})` on the control. It adds live attributes.
- Without bindings: spread `signifier('product-add-to-cart', { variantId, available })` from `@shopify/hydrogen` on the control.
- If a wrapper component renders the control, make sure it forwards props to the rendered element.
- Keep only one visible add-to-cart control per product page.
- If a query finds no matching signifier, check that existing attributes match its state filters, such as `available: true`.

### product-option-value

State: `{ optionName: string; optionValue: string; selected: boolean }`. All three fields are required. They become `data-shopify-option-name`, `data-shopify-option-value`, and `data-shopify-selected`. Keep native checked state, `aria-current`, or `aria-pressed` on the control as applicable.

- With bindings: spread `register('optionValue', { optionName, value })` on buttons or inputs, never on links.
- For all option links, including hydrated same-product and combined-listing links: spread `getProductOptionValueAttributes(optionName, value)` from `@shopify/hydrogen`. It returns only signifier attributes. Keep the URL, native/ARIA state, and guarded same-product selection handler. A registered handler can be called from that guard without spreading registration props onto the link.
- Without bindings: buttons or inputs can use `signifier('product-option-value', { optionName, optionValue, selected })`.
- Core register callers must pass `state.selectedOptions` from `store.getState()` as the optional third argument for unresolved selections and recreate the register function after state changes. Without that argument, a null selected variant marks all values unselected. React and Vue pass current selected options automatically.
- Keep one visible control for each option name/value in the searched scope. Make wrappers forward attributes.

### product-quantity

State: `{}`. Put this signifier on a visible, buyer-editable product quantity input, not a hidden quantity field, stepper wrapper, or button.

- With bindings: spread `register('quantity', { value })` or `register('quantity', { defaultValue })`.
- Without bindings: spread `signifier('product-quantity', {})` and keep native input props yourself.

The product-page check edits this input to `2`, with an idempotent fill/value retry if hydration restores the initial value. Editing the input alone does not prove cart settlement. The cart suite fills this input with `2`, adds the product through the UI, waits for the cart totals status to settle, and checks that the matching `cart-line` has quantity `2`, `pending: false`, and a native quantity input value of `2`.

### cart-line

State: `{ merchandiseId: string, quantity: number, pending: boolean }`. All fields are required. Use the product variant ID as `merchandiseId`, not the cart line ID. State attributes are `data-shopify-merchandise-id`, `data-shopify-quantity`, and `data-shopify-pending`.

- With React or Vue cart bindings: spread `lineProps(line)` from `useCartForm()` on the line container. It follows live pending state.
- With the core cart store: spread `getCartLineAttributes(line, cartState)` from `@shopify/hydrogen`. Call it again with the current line and state after updates.
- Without the cart store: spread `signifier('cart-line', { merchandiseId, quantity, pending })` and manage pending accessibility yourself.
- The core getter needs only `{ id, quantity, merchandise?: { id } | null }` and `Pick<CartState, 'pending'>`. Missing merchandise metadata produces an empty ID. The getter adds `aria-busy="true"` while that line is pending and omits it otherwise.
- Keep only one visible line for the requested merchandise. Hidden cart drawer copies are supported; multiple visible matches fail as ambiguous.

### cart-line-controls

The `cart-line-quantity`, `cart-line-increase`, `cart-line-decrease`, and `cart-line-remove` signifiers each take `{}` state.

`register('quantity', { value: line.quantity })` adds the quantity signifier. The `interactive: true` and `defaultValue` overloads also add it. `register('increase')`, `register('decrease')`, and `register('remove')` add their respective signifiers. Without bindings, use `signifier('cart-line-quantity', {})` and the matching control names.

Put the attributes on the native input or actionable control, not a wrapper. All controls must be nested inside their `cart-line` container. For missing controls, check placement and prop forwarding. For ambiguous controls, keep only one visible match of that control inside the line. Keep optimistic controls interactive, existing form submission behavior, inline errors, and pending visuals. See [ADR 0004](adr/0004-cart-line-signifiers.md).

### product-card

The product card root. State: `{ productHandle: string }`, written as `data-shopify-product-handle`. Keep the native product link and its accessible name.

- Spread `getProductCardAttributes(product)` from `@shopify/hydrogen`, `@shopify/hydrogen/react`, or `@shopify/hydrogen/vue` on the card root.
- Without the getter, use `signifier('product-card', { productHandle: product.handle })`.
- Use the handle, not the product ID. Forward attributes through wrappers. Keep one visible matching card per handle in the searched scope.
- An empty or missing handle fails with `product-results` remediation at this anchor. Load `product.handle` and forward `data-shopify-product-handle` to the root.

### collection-filter-value

The actual checkbox for one Storefront API filter value. State: `{ filterId: string }`, written as `data-shopify-filter-id`.

- Spread `getFilterValueAttributes(value)` from the core, React, or Vue entry point on the checkbox, not its label.
- Without the getter, use `signifier('collection-filter-value', { filterId: value.id })`.
- Pass the full API value to the getter. Do not pass its parent filter or substitute its parent ID.
- Keep native checked state, name, value, change handler, and accessible label. The getter does not supply them.
- Keep one visible matching checkbox per value ID. Hidden responsive copies follow the shared match rules.
- For a placement or non-checkbox error, move the getter from the label or button onto the native checkbox. For a hidden-only error, show the control or its wrapping label. Keep at least one narrowing value enabled and unchecked so a buyer can select it.

See [ADR 0005](adr/0005-collection-filter-signifiers.md). No apply-button signifier is added in this migration.

## Checkout Handoff

The checkout test verifies only the storefront-owned side of the checkout handoff.

**Checkout-only semantic requirements:** Checkout has not migrated to cart-line signifiers. Its existing checks still need visible list items containing the product title in the cart drawer dialog and within the cart page's main landmark. The cart-page line must also show the discovered variant text when its label is non-empty and not `Default Title`. These list-item/title/variant-text requirements apply to checkout checks only; cart tests use the signifiers described above. Checkout also needs a visible checkout link with an accessible name containing Checkout or Continue to checkout.

It verifies the added product and variant in the storefront cart, clicks the visible checkout link, and waits for a checkout URL. It does not depend on the external checkout document loading, enter customer data, payment data, or perform any irreversible checkout step.

If the storefront does not start checkout navigation, the test fails as a contract issue. External checkout availability is outside this suite's boundary.

## Operations

Run with:

```sh
STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront
```

Set STOREFRONT_E2E_WORKERS to override the default parallel worker count.
The worker override must be an integer from 1 to 12.

The root `pnpm test:e2e:storefront` command uses Turbo. `turbo.json` forwards these variables in strict environment mode:

| Variable | Use |
| --- | --- |
| `STOREFRONT_BASE_URL` | Required HTTP or HTTPS URL of the running storefront |
| `STOREFRONT_E2E_WORKERS` | Optional worker count; defaults to 4 locally and 2 when `CI=true` |
| `PLAYWRIGHT_BROWSER_CHANNEL` | Optional installed browser channel, such as `chrome` |
| `STOREFRONT_SKIP_NO_JS_VARIANTS` | Set to `true` only for the explicit no-JavaScript variant opt-out |

See the [README](../README.md) for the runner command. Start and configure the storefront separately.

Operational expectations:

- Use a development or example storefront, not a production merchant storefront unless explicitly accepted.
- The owner of STOREFRONT_BASE_URL is responsible for health, live data, cart, and checkout availability.
- Playwright runs headless and fully parallel by default.
- Artifacts are failure-only.
- If CI wiring is added, artifact upload must set explicit retention-days.
- Unit tests intentionally do not enforce coverage thresholds because this package's behavioral coverage is the live storefront contract suite. Add thresholds if non-e2e unit coverage becomes a quality signal for package code.

## Contract Migration

When the storefront contract changes, update the relevant spec matcher, shared helper, and this document together.

The suite consumes `product-add-to-cart`, `product-option-value`, `product-quantity`, `cart-line`, the four cart-line control signifiers, `product-card`, and `collection-filter-value`. Other areas still use label strings and semantic roles. Generated examples should migrate toward explicit storefront-owned signifiers for checkout summaries. Add a signifier only when a spec consumes it, and update the [Signifiers](#signifiers) section in the same change.
