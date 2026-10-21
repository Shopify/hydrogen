---
name: hydrogen-storefront-testing
description: >
  Guide for agents preparing a custom storefront to run the portable
  storefront-e2e suite. Explains the supported test IDs, where to add them to
  existing storefront UI, and how the tests use them.
---

# Storefront Test IDs

Use this skill when you prepare a custom storefront, in any framework, so that the portable storefront-e2e suite in this repository can test it. The canonical reference is `packages/storefront-e2e/docs/storefront-contract.md`. It also lists the routes, live store data, and other conditions that each test group needs. If this skill and the contract differ, the contract is correct.

## How the test IDs work

- A test ID is a locator, not a behavior. Add `data-testid` to an element that the storefront already renders. Keep its HTML, styles, interactions, and accessibility. Do not add wrappers or business logic for the tests.
- IDs can repeat, for example a main and a sticky add to cart, or a desktop and a mobile copy. The suite narrows to the visible, relevant element and chooses one when it needs one.
- An ID only finds an element. The suite still proves the buyer outcome, such as the URL, the selected option, or the cart line. Adding IDs alone does not make a test pass.
- The suite finds UI without an ID in this skill by role, label, and text, as the contract describes. Other `data-*` attributes that your app uses can stay.

## Test IDs

### Product page

| Test ID | Put it on |
| --- | --- |
| `product-title` | The existing product title heading |
| `product-variant-option` | Each option value link or button that selects another variant of this product, including a disabled value for a combination that does not exist |
| `product-sibling-option` | Each option value link that navigates to another product |
| `product-add-to-cart` | The existing add to cart control |

The relationship decides the ID, not availability: `product-variant-option` selects another variant of the same product, and `product-sibling-option` navigates to another product. The suite supports variant option links and buttons only, not radio inputs or selects. It skips current values and values with the native `disabled` attribute or `aria-disabled="true"`, such as a combination that does not exist. Sold out does not change the ID: a sold-out value of this product is still a `product-variant-option`. Keep your existing availability behavior. A link can use any URL shape: the suite follows its real `href`, then checks the selected state (`aria-current="true"` on the link, or `aria-pressed="true"` on a button), a direct load of that URL, and that unrelated query params stay. The no-JavaScript check needs links. `STOREFRONT_SKIP_NO_JS_VARIANTS=true` skips only that check. The current variant journey ignores `product-sibling-option`, so it does not test navigation to another product. See Variant Options in the contract.

### Cart

| Test ID | Put it on |
| --- | --- |
| `cart-page` | The element that holds the cart page content |
| `cart-drawer` | The cart drawer element |
| `cart-trigger` | The control that opens the cart drawer. Not a plain link to `/cart` |
| `cart-line` | The element that holds one cart line: its title, variant text, quantity, and controls |
| `cart-line-quantity` | The quantity input of a cart line |
| `cart-line-increase` | The increase quantity control of a cart line |
| `cart-line-decrease` | The decrease quantity control of a cart line |
| `cart-line-remove` | The remove control of a cart line |
| `cart-status` | The existing cart totals status region, the element with `role="status"` |
| `cart-checkout` | The checkout link of a cart view |

After Add to cart, the drawer must open by itself. The suite uses `cart-trigger` only to open a closed drawer in one test. It finds a line inside the visible cart page or the open drawer, never across both, then the controls inside that line. It reads the quantity from the native input value. Checkout tests reuse `cart-drawer`, `cart-page`, and `cart-line` to find the added line, then click the first visible `cart-checkout` inside the cart page and expect a checkout URL.

Give each `cart-status` region a `data-cart-state` attribute, derived from the same cart state as its message: `updating` while a change or a cart reload is pending, `error` after an unresolved network failure, `updated` after a pending cycle finished without a network failure, and `idle` before the first cycle. It is the one state attribute in the contract. The suite only waits for it: `updated` needs one updated region and none updating or failed. Then it checks the real result.

### Collection and search results

| Test ID | Put it on |
| --- | --- |
| `product-results` | The element that holds the main results of a collection or search page. Not recommendations or featured products |
| `product-card` | The product link of each result |

The suite reads only visible cards inside the first visible `product-results`, matches a product by the handle in the card link and the title in its name, and counts results by unique product URL.

### Collection filters

| Test ID | Put it on |
| --- | --- |
| `collection-filter-label` | The visible label of a filter value |
| `collection-filter-value` | The checkbox inside that label |

Keep the checkbox inside its marked label. The suite clicks the label, expects the checkbox to be checked, and reads the count from the label text, such as `Red (4)`.

### Search

| Test ID | Put it on |
| --- | --- |
| `search-input` | The query input of the full search page. Not a header or predictive search input |
| `search-submit` | Optional. The submit control of that search form |

The suite fills `search-input`, clicks `search-submit` when it exists or presses Enter, and expects the URL to change. Then it looks for the searched product's card in `product-results`.

## How to adopt

1. Find the existing elements in the tables above in your storefront.
2. Add the `data-testid` attributes to those elements. Do not add new wrappers, elements, or business logic.
3. Keep the real buyer journeys working, because the suite checks their outcomes.
4. Start your storefront. The suite tests a storefront that is already running.
5. From a checkout of the Hydrogen repository, run the suite against it:

   ```sh
   STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront
   ```

   The suite lives in this repository. It is not a package that you install in your storefront.
6. For failures and skips, read the contract and `packages/storefront-e2e/README.md`. Some test groups need specific routes or store data.

## Example

Add the attribute to the existing control:

```html
<button type="submit" class="add" data-testid="product-add-to-cart">Add to cart</button>
```

The suite starts with `getByTestId`, then narrows to visible elements:

```ts
const title = page.getByTestId('product-title').filter({visible: true}).first();
await expect(title).toContainText('Classic Tee');

const medium = page
  .getByTestId('product-variant-option')
  .filter({visible: true, hasText: 'Medium'})
  .first();
await medium.click();

await page.getByTestId('product-add-to-cart').filter({visible: true}).first().click();

const line = page
  .getByTestId('cart-page')
  .filter({visible: true})
  .first()
  .getByTestId('cart-line')
  .filter({visible: true, hasText: 'Classic Tee'})
  .first();
const quantity = line.getByTestId('cart-line-quantity').filter({visible: true}).first();
await line.getByTestId('cart-line-increase').filter({visible: true}).first().click();
await expect(quantity).toHaveValue('2');
```

These are locator examples, not a complete cart journey. Wait for settlement between cart changes and assert the real result.
