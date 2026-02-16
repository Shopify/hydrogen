# E2E Testing Guidelines

## Test Isolation

Playwright automatically provides test isolation - each test runs in its own browser context with isolated storage, cookies, and state. You generally don't need to manually clear cookies or storage between tests.

**Exception:** If you need to clear state within a single test (e.g., testing empty cart after clearing), do so explicitly in that test.

## Test Organization

### Test Setup Strategy

Per [Playwright best practices](https://playwright.dev/docs/best-practices#make-tests-as-isolated-as-possible): Use `beforeEach` hooks to eliminate repetitive setup steps while maintaining test isolation.

```typescript
// GOOD: Use beforeEach for shared setup
test.describe('Quantity Management', () => {
  test.beforeEach(async ({storefront}) => {
    await storefront.goto('/');
    await storefront.navigateToFirstProduct();
    await storefront.addToCart();
  });

  test('increases quantity', async ({storefront}) => {
    const firstItem = storefront.getCartLineItemByIndex(0);
    await storefront.increaseLineItemQuantity(firstItem);
    expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);
  });
});

// ACCEPTABLE: Duplicate simple 1-2 line setups when it improves clarity
test('adds item to empty cart', async ({storefront}) => {
  await storefront.goto('/');
  await storefront.navigateToFirstProduct();
  await storefront.addToCart();

  await expect(storefront.getCartLineItems()).toHaveCount(1);
});

// AVOID: Repeating 3+ lines in every test
test('increases quantity', async ({storefront}) => {
  await storefront.goto('/');  // Repeated
  await storefront.navigateToFirstProduct();  // Repeated
  await storefront.addToCart();  // Repeated
  // Use beforeEach instead
});
```

## Selector Strategy

### DOM Elements over CSS
Always choose selectors based on **DOM elements and semantic structure**, NOT CSS classes or styles. Tests should reflect how a user perceives and interacts with the page.

**Priority order for selectors:**
1. **Role + accessible name** (preferred): `getByRole('button', {name: 'Add to cart'})`
2. **Role + landmark**: `getByRole('banner').getByRole('link', {name: /cart/i})`
3. **Text content**: `getByText('Continue to Checkout')`
4. **Test IDs** (when semantic selectors aren't possible): `getByTestId('cart-drawer')`
5. **CSS classes** (last resort only): Only when semantic selectors are impractical

**Always try role-based selectors first.** Only use CSS classes when:
- The element has no semantic role
- Multiple similar elements need disambiguation
- Role-based selectors would be overly complex

### Write Tests from User Perspective
Write tests based on how a user would perceive events, not implementation details.

```typescript
// GOOD: Wait for user-visible state change
await storefront.addGiftCard('GIFT123');
await expect(giftCardInput).toHaveValue('');  // Input cleared = success
await expect(applyButton).toBeEnabled();  // Button enabled = ready

// AVOID: Waiting for network requests (implementation detail)
await storefront.addGiftCard('GIFT123');
await page.waitForResponse(resp => resp.url().includes('cart'));
```

### Waiting for State Changes
Wait for the **visible effect** rather than the underlying mechanism:

```typescript
// GOOD: Wait for actual data change
await increaseButton.click();
await expect.poll(() => getLineItemQuantity(item)).toBe(2);

// AVOID: Waiting for button state (re-enables before data updates)
await increaseButton.click();
await expect(increaseButton).toBeEnabled();
```

## Running Tests

### Always Use Headless Mode
Tests should ALWAYS be run in headless mode, both in development and in CI. This:
- Prevents browser windows from interfering with other work
- Ensures consistent behavior across environments
- Is faster than headed mode

The Playwright config does not specify a headed mode by default, so tests run headless automatically. Never add `headless: false` to the config or pass `--headed` flag:

```bash
# CORRECT: Run tests (headless by default)
npx playwright test --project=skeleton

# AVOID: Running with headed browser
npx playwright test --project=skeleton --headed  # Don't do this
```

If you need to debug visually, use Playwright's trace viewer or UI mode temporarily, but never commit headed configuration.

## Fixture Design Principles

### Deep Modules
Following John Ousterhout's principles, fixtures should expose **entity locators** but hide **implementation details**:

```typescript
// GOOD: Entity locators are public
getCartLineItems()  // Returns the domain entities
getCartDrawer()     // Returns the cart drawer element

// GOOD: Button locators hidden inside action methods
async increaseLineItemQuantity(lineItem) {
  const button = lineItem.getByRole('button', {name: 'Increase quantity'});  // Hidden
  await button.click();
  // ... wait for effect
}
```

### Visibility-Aware Locators
The skeleton template has both a cart drawer (aside) and a cart page. Both contain similar elements but only one is visible at a time.

```typescript
// GOOD: Role-based selectors with chaining for specificity
getCartLineItems() {
  return this.page.getByRole('list', {name: /cart|line items/i}).getByRole('listitem');
}

getCheckoutButton() {
  return this.page.getByRole('button', {name: /checkout/i});
}

// ACCEPTABLE: Test IDs when semantic selectors need disambiguation
getCartLineItems() {
  return this.page.getByTestId('cart-line-items').getByRole('listitem');
}

// AVOID: CSS selectors (DOM can change, leading to flaky tests)
getCartLineItems() {
  return this.page.locator('li.cart-line:visible');  // Not resilient
}
```

**Why avoid CSS?** Per [Playwright docs](https://playwright.dev/docs/locators), CSS selectors are "not recommended as the DOM can often change leading to non resilient tests." Use role-based selectors that reflect how users perceive the page.
