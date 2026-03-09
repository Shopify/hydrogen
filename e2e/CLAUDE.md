# E2E Testing Guidelines

## Quick Reference

### The Golden Rules

1. **Use role-based locators** - Never CSS classes unless absolutely necessary
2. **Assert absence broadly, presence specifically** - Wide net for "not there", scoped for "is there"
3. **Never use timeouts or networkidle** - Wait for visible effects only
4. **Improve accessibility while testing** - Tests drive better markup
5. **Wait for user-visible changes** - Not implementation details like network requests

### Anti-Patterns to Avoid

❌ `page.waitForTimeout(1000)` - Arbitrary waits (flaky)
❌ `page.waitForLoadState('networkidle')` - Unreliable
❌ `page.waitForResponse(...)` - Implementation detail
❌ `page.locator('.css-class')` - Fragile selectors
❌ Adding test IDs when accessibility markup would work

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
  await storefront.goto('/'); // Repeated
  await storefront.navigateToFirstProduct(); // Repeated
  await storefront.addToCart(); // Repeated
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

### Accessibility Improvements During Test Writing

**Writing tests should drive better markup.** When you can't write a good locator, that's often a signal of missing accessibility features.

It is **encouraged and expected** to improve accessibility in the application code when:

1. It enables better test locators (role-based instead of test IDs or CSS)
2. It provides genuine accessibility benefits for users
3. The change is semantically correct

```typescript
// BEFORE: Missing ARIA label, forced to use CSS
getCartTotals() {
  return this.page.locator('div.cart-summary');  // Fragile
}

// AFTER: Add aria-label to markup, use role-based locator
// In application code:
<div role="region" aria-label="Totals">
  <dl>...</dl>
</div>

// In test:
getCartTotals() {
  return this.page.getByLabel('Totals');  // Resilient + accessible
}
```

**Examples of acceptable accessibility improvements:**

- Adding `aria-label` to landmark regions for disambiguation
- Adding `aria-labelledby` to associate labels with controls
- Improving semantic HTML (e.g., `<ul>` → `<ul role="list" aria-label="Line items">`)
- Adding accessible names to buttons (e.g., `aria-label="Remove gift card ending in 1234"`)

**Not acceptable:**

- Adding `aria-label` purely for test purposes when it provides no user benefit
- Over-labeling elements that are already accessible
- Using `data-testid` when role-based selectors would work with proper markup

### Presence vs Absence Assertions

Test **both presence and absence** to ensure complete validation of state.

**Granularity Rule**: Assert **absence broadly** and **presence specifically**.

```typescript
// GOOD: Assert absence broadly (element doesn't exist anywhere)
await expect(this.page.getByText('Applied Gift Card(s)')).toHaveCount(0);
await expect(this.page.getByText(`***${GIFT_CARD_1_LAST_4}`)).toHaveCount(0);

// GOOD: Assert presence specifically (within correct context)
const giftCards = this.page.getByRole('region', {name: 'Gift cards'});
await expect(
  giftCards.locator('dd').filter({hasText: `***${GIFT_CARD_1_LAST_4}`}),
).toBeVisible();

// WHY: Absence assertions cast a wide net (element shouldn't exist ANYWHERE).
// Presence assertions are scoped (element should exist in the RIGHT PLACE).
```

**Key Pattern**: After removing an item, assert both:

1. The specific item is gone (`.toHaveCount(0)`)
2. The empty state is displayed (`.toBeVisible()`)

**Real-world examples**:

```typescript
// GOOD: Remove item, assert it's gone AND empty state is shown
await removeGiftCardButton.click();
await expect(page.getByText(`***${GIFT_CARD_1_LAST_4}`)).toHaveCount(0);
await expect(page.getByText('No gift cards applied')).toBeVisible();

// AVOID: Only asserting the removal (could still have items if count changes to 1)
const initialCount = await page.getByRole('listitem').count();
await clearButton.click();
const newCount = await page.getByRole('listitem').count();
expect(newCount).not.toBe(initialCount); // ❌ Passes even if count=1

// GOOD: Assert absence broadly (no list items exist anywhere)
await clearButton.click();
await expect(page.getByRole('listitem')).toHaveCount(0);
await expect(page.getByText('Cart is empty')).toBeVisible();
```

### Wait for Visible Effects, Not Mechanisms

Wait for the **actual data change** the user sees, not intermediate states or implementation details.

**NEVER use**: `page.waitForTimeout()`, `page.waitForLoadState('networkidle')`, or arbitrary waits.

```typescript
// GOOD: Wait for actual data change (user-visible effect)
await increaseButton.click();
await expect.poll(() => getLineItemQuantity(item)).toBe(2);

// GOOD: Wait for element state change
await applyButton.click();
await expect(input).toHaveValue(''); // Input cleared
await expect(applyButton).toBeEnabled(); // Button ready

// AVOID: Waiting for network (implementation detail)
await increaseButton.click();
await page.waitForResponse((resp) => resp.url().includes('cart'));

// AVOID: Arbitrary timeouts (flaky and slow)
await increaseButton.click();
await page.waitForTimeout(1000);

// AVOID: Network idle (unreliable, slow)
await page.goto('/cart');
await page.waitForLoadState('networkidle');
```

**Why avoid timeouts and networkidle?**

- Timeouts are arbitrary (too short = flaky, too long = slow)
- Network idle is unreliable (analytics, polling, websockets)
- Visible effects are deterministic and match user experience

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
