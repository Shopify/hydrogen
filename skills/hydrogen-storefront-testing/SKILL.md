---
name: hydrogen-storefront-testing
description: >
  Guide for agents preparing a custom storefront to run the portable
  storefront-e2e suite. Explains the supported test IDs, where to add them to
  existing storefront UI, and how the tests use them.
---

# Storefront Test IDs

Use this skill when you prepare a custom storefront, in any framework, so that the portable storefront-e2e suite in this repository can test it. This skill is the only list of the test IDs that the suite reads. `packages/storefront-e2e/docs/storefront-contract.md` describes the routes, live store data, buyer journeys, and other conditions that each test group needs.

## How the test IDs work

- A test ID is a locator. It goes on an element that the storefront already renders, and that element keeps its HTML, styles, interactions, and accessibility.
- IDs can repeat, for example a main and a sticky add to cart, or a desktop and a mobile copy. The suite narrows each ID to visible elements and uses the first match, or the first match with the expected text.
- An ID finds an element. Each test then checks a buyer journey that the contract describes, such as variant selection, cart changes, filtering, search, and checkout handoff.
- The suite finds UI without an ID in this skill by role, label, and text, as the contract describes.
- The storefront can have other test IDs for its own tests. The suite does not read them.

## Test IDs

### Product page

| Test ID | Put it on |
| --- | --- |
| `product-variant-option` | Each option value link or button that selects another variant of the same product, including sold-out values and disabled values for combinations that do not exist |
| `product-add-to-cart` | The add to cart button. It must have the button role, such as a native `<button>`, and a non-empty accessible name. The label can be any text; an icon-only button needs `aria-label` or visually hidden text |

`product-variant-option` marks option values that select another variant of the same product, including sold-out values and disabled values for combinations that do not exist. The suite tries unselected links first, then buttons, and skips current and disabled values. It follows a link's real `href`, so any URL format works. The no-JavaScript check needs links; `STOREFRONT_SKIP_NO_JS_VARIANTS=true` skips only that check.

The cart and checkout tests click the first visible `product-add-to-cart` button.

The product title needs no test ID. The suite requires it to be the page's `<h1>`.

### Cart

| Test ID | Put it on |
| --- | --- |
| `cart-page` | The element that holds the cart page content |
| `cart-drawer` | The cart drawer |
| `cart-trigger` | The control that opens the cart drawer |
| `cart-line` | The element that holds one cart line |
| `cart-line-quantity` | The quantity input of a cart line. It must be a text or number input |
| `cart-line-increase` | The increase quantity button of a cart line |
| `cart-line-decrease` | The decrease quantity button of a cart line |
| `cart-line-remove` | The remove button of a cart line |
| `cart-checkout` | The checkout link of the cart page |

The suite finds a cart line by its product title inside the visible `cart-page` or the visible `cart-drawer`. After Add to cart, it clicks `cart-trigger` only when it needs the drawer and the added line is not visible. It finds the quantity input and the line buttons inside that line, and fails if the buttons do not have the button role, such as a native `<button>`. The checkout test reuses `cart-drawer`, `cart-page`, and `cart-line` to find the added line. Then it clicks the first visible `cart-checkout` on the cart page and expects a checkout URL.

### Collection and search results

| Test ID | Put it on |
| --- | --- |
| `product-results` | The element that holds the product results of a collection or search page |
| `product-card` | The product link of each result |

The suite reads only visible `product-card` links inside the first visible `product-results`. The collection test matches a product by the card's accessible name, and the collection filter test counts results by unique product URL path.

## How to adopt

1. Find the existing elements in the tables above in your storefront.
2. Add the `data-testid` attributes to those elements.
3. Make sure the buyer journeys work in the running storefront, because the suite checks them.
4. Start your storefront. The suite tests a storefront that is already running.
5. From a checkout of the Hydrogen repository, run the suite against it:

   ```sh
   STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront
   ```

   The suite lives in this repository. It is not a package that you install in your storefront.
6. For failures and skips, read the contract and `packages/storefront-e2e/README.md`. Some test groups need specific routes or store data.

## Example

Add the attribute to the existing element:

```html
<button type="submit" class="add" data-testid="product-add-to-cart">Add to cart</button>
```

The suite starts with `getByTestId`, requires the button role and a non-empty accessible name, then narrows to visible elements:

```ts
await page
  .getByTestId('product-add-to-cart')
  .and(page.getByRole('button', {name: /\S/}))
  .filter({visible: true})
  .first()
  .click();
```
