# E2E Testing Guidelines

## Test Isolation

### Cart State Management
To clear cart state between tests, **clear ALL cookies**. Cart state is stored in a cookie, so there's no need to individually remove line items, discounts, etc. Clearing all cookies provides complete test isolation.

```typescript
test.afterEach(async ({storefront}) => {
  await storefront.clearAllCookies();
});
```

For maximum isolation, consider clearing cookies in both `beforeEach` and `afterEach`:
```typescript
test.beforeEach(async ({storefront}) => {
  await storefront.clearAllCookies();
});

test.afterEach(async ({storefront}) => {
  await storefront.clearAllCookies();
});
```

## Test Organization

### Shared Setup in beforeEach
Prefer putting statements shared at the start of ALL tests in a file into a `beforeEach` hook rather than repeating them in each test:

```typescript
// GOOD: Shared setup in beforeEach
test.describe('Cart Operations', () => {
  test.beforeEach(async ({storefront}) => {
    await storefront.goto('/');
    await storefront.navigateToFirstProduct();
    await storefront.addToCart();
  });

  test('increases quantity', async ({storefront}) => {
    // Test starts with item already in cart
  });
});

// AVOID: Repeating setup in each test
test.describe('Cart Operations', () => {
  test('increases quantity', async ({storefront}) => {
    await storefront.goto('/');  // Repeated
    await storefront.navigateToFirstProduct();  // Repeated
    await storefront.addToCart();  // Repeated
    // ...
  });
});
```

## Selector Strategy

### DOM Elements over CSS
Always choose selectors based on **DOM elements and semantic structure**, NOT CSS classes or styles. Tests should reflect how a user perceives and interacts with the page.

**Priority order for selectors:**
1. Role + accessible name: `getByRole('button', {name: 'Add to cart'})`
2. Role + landmark: `getByRole('banner').getByRole('link', {name: /cart/i})`
3. Text content: `getByText('Continue to Checkout')`
4. Test IDs (when necessary): `getByTestId('cart-drawer')`
5. CSS classes (last resort, for entities only): `locator('li.cart-line:visible')`

### Write Tests from User Perspective
Write tests based on how a user would perceive events happening, not based on technical implementation details.

```typescript
// GOOD: Wait for user-visible state change
await storefront.addGiftCard('GIFT123');
await expect(giftCardInput).toHaveValue('');  // Input cleared means success
await expect(applyButton).toBeEnabled();  // Button re-enabled means ready

// AVOID: Waiting for network requests
await storefront.addGiftCard('GIFT123');
await page.waitForResponse(resp => resp.url().includes('cart'));  // Implementation detail
```

### Waiting for State Changes
When an action triggers a state change, wait for the **visible effect** rather than the underlying mechanism:

```typescript
// GOOD: Wait for quantity text to change
await increaseButton.click();
await expect.poll(() => getLineItemQuantity(item)).toBe(2);

// AVOID: Just waiting for button to be re-enabled
await increaseButton.click();
await expect(increaseButton).toBeEnabled();  // Button might re-enable before quantity updates
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
The skeleton template has both a cart drawer (aside) and a cart page. Both contain similar elements but only one is visible at a time. Use `:visible` pseudo-selector to match only the current context:

```typescript
// GOOD: Only matches visible elements
getCartLineItems() {
  return this.page.locator('li.cart-line:visible');
}

// AVOID: May match hidden elements in drawer when on cart page
getCartLineItems() {
  return this.page.locator('li.cart-line');
}
```
