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

## Product Test IDs

The contract defines four product IDs. The suite reads `product-title`, `product-variant-option`, and `product-add-to-cart` with Playwright `getByTestId`. `product-sibling-option` identifies cross-product values and is excluded from the variant journey:

| Test ID | Meaning |
| --- | --- |
| `product-title` | The product title |
| `product-variant-option` | An option value that selects another variant of this product, including a disabled value for a combination that does not exist |
| `product-sibling-option` | An option value that navigates to another product |
| `product-add-to-cart` | The add to cart control |

This is a locator change only. Add each ID to the existing element that has this meaning. Keep its markup, styles, interactions, and accessibility. The IDs do not add new behavior requirements. The other sections of this document still apply.

IDs can repeat. For example, a main and a sticky add to cart, a desktop and a mobile title, or one ID on each option value. The suite starts with `getByTestId`, then narrows to the visible, relevant element or value. When the journey needs one element, the suite chooses one. The suite proves buyer outcomes (URL, selected state, cart lines), not only the presence of an ID.

The suite finds other UI by role, label, and text, unless a section below lists a test ID for it. The storefront can have other test IDs for its own tests. The suite does not read them.

## Cart Test IDs

The cart group finds these cart elements with `data-testid` attributes. The locator policy in Product Test IDs applies: add each ID to the existing element with this meaning, IDs can repeat, and the suite narrows to the visible, relevant element.

| Test ID | Meaning |
| --- | --- |
| `cart-page` | The cart page content |
| `cart-drawer` | The cart drawer |
| `cart-trigger` | The control that opens the cart drawer |
| `cart-line` | A cart line |
| `cart-line-quantity` | The quantity input of a cart line |
| `cart-line-increase` | The increase quantity control of a cart line |
| `cart-line-decrease` | The decrease quantity control of a cart line |
| `cart-line-remove` | The remove control of a cart line |
| `cart-status` | The cart totals status region |
| `cart-checkout` | The checkout link of a cart view |

The suite finds a line by `cart-line` and its product title inside the visible cart page or the open cart drawer, never across both. It finds the quantity input and the line controls inside the chosen line, and reads the quantity from the native input value. It waits for the cart totals message in a `cart-status` region that also has `role="status"` (see Cart Line Items). Keep `cart-trigger` off links that only go to `/cart`. The checkout group reuses `cart-drawer`, `cart-page`, and `cart-line` to find the added line. It clicks the first visible `cart-checkout` inside the cart page.

## Product Results

Collection and search pages must expose product cards as links to product detail pages. The suite finds them with `data-testid` attributes (see the locator policy in Product Test IDs):

| Test ID | Meaning |
| --- | --- |
| `product-results` | The product results of a collection or search page |
| `product-card` | The product link of a result |

The suite uses the first visible `product-results` element and reads only the visible `product-card` links inside it. Recommendations outside the results and hidden responsive copies do not count. The collection group looks for the card whose `href` path ends with `/products/:handle` for a product from the Storefront API (a path prefix, such as a locale, is allowed) and whose accessible name contains the product title. A card for another product does not match, even when its title contains the requested title. The collection filter group counts the unique product URL paths of these cards.

## Collection Filters

At least one probed collection must expose a visible, enabled checkbox filter that changes the URL, returns products, and reduces the product card count when selected. Filters may auto-submit or use a visible Apply filters/Show results button.

The suite counts results as the unique product URL paths of the visible `product-card` links inside `product-results` (see Product Results).

The suite finds filter values with `data-testid` attributes:

| Test ID | Meaning |
| --- | --- |
| `collection-filter-value` | A filter value checkbox |
| `collection-filter-label` | The label of a filter value checkbox |

The suite reads up to 20 visible `collection-filter-label` elements in page order and finds the `collection-filter-value` inside each one. It skips disabled checkboxes. It clicks the label of the first usable filter and expects the native checkbox to be checked. If the page has no visible filter label, the test fails; it does not skip.

Filter labels must include a count like Red (4). The suite reads the label text, removes a trailing " - Sold out", and uses the first whole number in parentheses as the count. It does not read counts from `title`, `aria-label`, or text such as `4 products`, so such labels are not chosen; for example, the React Router template color swatches. A value name with a number in parentheses, such as `Pack (2)`, can give the wrong count. The suite uses the count to choose a filter that narrows the product card count, then asserts the filtered result count does not exceed the label count. Browser Back after a filter selection must restore the previous URL and show the same filter, found by the same label text, unchecked. If visible filter labels exist but none has a count that narrows the results, the test skips. Missing Storefront API filter data skips the collection filter group.

When a probed collection exposes a Storefront API PRICE_RANGE filter, the page must render the price bounds as spinbuttons whose accessible names start with Minimum price and Maximum price. Typing a decimal bound such as 12.5 must put that exact value in the filter.v.price.gte or filter.v.price.lte URL param and keep it in the input. A storefront with no price range filter skips this check.

## Search

The search page must expose a searchbox. A visible button with an accessible name containing Search is supported; otherwise the suite submits the searchbox with Enter.

The suite discovers a live product title, searches for it, and verifies that product appears in visible results.

## Variant Options

At least one probed product must expose a selectable variant control. The suite finds same-product option values with `product-variant-option` and the title with `product-title` (see Product Test IDs). It ignores `product-sibling-option`, so this journey does not cover navigation to another product.

Supported controls:

- Links to another variant of the same product. The URL shape is free: a selected-options query, a path such as `/products/shirt/medium`, or another format. The suite follows the link's real `href`. The selected link has `aria-current="true"`.
- Buttons with `aria-pressed`. The selected button has `aria-pressed="true"`. Buttons work only with JavaScript; the no-JavaScript check needs links.
- Values for combinations that do not exist can have the native `disabled` attribute, or `aria-disabled="true"` on a link. The suite skips disabled values. Sold out does not change the ID: a sold-out value of this product is still a `product-variant-option`. Keep existing availability behavior.

With JavaScript, selecting a value must put the selection in the URL (for a link, the link's href) and mark the value as selected. Loading that URL directly must render the product title and show the same value as selected. Selection must keep unrelated non-option query params (the suite uses `storefront_e2e_ref=variant-check`).

Without JavaScript, the product title must render, and at least one probed product must expose an unselected `product-variant-option` link. A native click on that link must load its href, keep unrelated query params, and the server-rendered page must mark that value as selected.

Selected values should also be visibly indicated (styling or text). The suite does not check this. It also does not check that hydration is complete before it clicks, how many navigations or document loads a selection makes, or the visible appearance, price, or merchandise of the selected variant.

Set STOREFRONT_SKIP_NO_JS_VARIANTS=true to skip the no-JavaScript check for a storefront that cannot render the product page without JavaScript or does not render variant links. A skip is an expected opt-out, not a pass. The Next.js template sets it in CI because its product content streams behind a Suspense fallback.

## Cart Line Items

Each cart line contains the product title. The suite finds lines with `cart-line` inside the cart page or the cart drawer (see Cart Test IDs).

The cart and checkout groups find the add to cart control with `product-add-to-cart` (see Product Test IDs). It must be enabled for the discovered variant.

After ordinary Add to cart, the drawer must open by itself and show the added line before the suite navigates to the cart page. Only the stock-limit rollback test clicks `cart-trigger` when the drawer is closed while its cart request is held. Keep the closed drawer rendered before that click; its lines can render after it opens.

Each line must expose:

- Variant text when the product has a non-default variant
- A quantity input, an increase control, a decrease control, and a remove control (see Cart Test IDs)

The suite reads the quantity from the native input value. After remove, it waits for the line to go away.

Cart totals must expose a `role="status"` region that says `Updating cart totals` while cart totals are stale, then `Cart totals updated` after mutation settlement. Do not announce `Cart totals updated` on initial idle render before a mutation cycle. The region may be visually hidden if it remains available to assistive technology.

The suite finds this region with `cart-status` and `role="status"`, then matches the English text. The English text is a known dependency.

Cart UI without a test ID in Cart Test IDs is found by role, label, and text.

## Checkout Handoff

The checkout test verifies only the storefront-owned side of the checkout handoff.

It verifies the added product and variant in the storefront cart, clicks the visible checkout link, and waits for a checkout URL. It finds the added line in the drawer and on the cart page with `cart-drawer`, `cart-page`, and `cart-line` (see Cart Test IDs). It finds the checkout link with `cart-checkout` inside the cart page, and checks that its `href` is a checkout URL before it clicks. It does not depend on the external checkout document loading, enter customer data, payment data, or perform any irreversible checkout step.

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

When test locators change, update the affected specs and this document together.

The suite reads test IDs for the product title, same-product option values (`product-variant-option`), and add to cart control (see Product Test IDs; `product-sibling-option` is defined but not read), for the cart elements in Cart Test IDs, for product results (see Product Results), and for collection filter values (see Collection Filters). It finds all other UI by semantic roles and label strings, including the English cart totals status text inside `cart-status`.
