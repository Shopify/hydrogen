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

Add the attribute to the existing heading:

```html
<h1 class="product-title" data-testid="product-title">Classic Tee</h1>
```

The suite starts with `getByTestId`, then narrows to visible elements:

```ts
const title = page.getByTestId('product-title').filter({visible: true}).first();
await expect(title).toContainText('Classic Tee');
```

These are locator examples, not a complete buyer journey. Assert the real result, such as the URL or the selected option.
