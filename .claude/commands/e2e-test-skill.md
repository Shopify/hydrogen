---
name: e2e-test-skill
description: >
  Guide for writing high-quality Playwright E2E tests for Hydrogen. Use when the user asks to
  "write e2e tests", "add playwright tests", "test this feature end-to-end", "write recipe tests",
  "add integration tests", or mentions Playwright, E2E testing, or test coverage for user-facing features.
  Covers strong locators (role-based selectors), assertion patterns (presence vs absence),
  fixture design following deep module principles, test organization with beforeEach hooks,
  and Hydrogen-specific patterns like recipe testing and context-aware utilities.
---

# E2E Test Writing for Hydrogen

This skill provides comprehensive guidance for writing maintainable, user-centric E2E tests in the Hydrogen monorepo using Playwright.

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

## Core Principles

### 1. User-Centric Testing

Tests should reflect **how a user perceives and interacts** with the application, not implementation details.

**Why**: Tests written from the user's perspective are more resilient to refactoring and better validate actual user experience.

```typescript
// GOOD: Wait for user-visible state change
await giftCard.applyCode('GIFT123');
await expect(giftCardInput).toHaveValue(''); // Input cleared = success
await expect(applyButton).toBeEnabled(); // Button enabled = ready

// AVOID: Waiting for network requests (implementation detail)
await giftCard.applyCode('GIFT123');
await page.waitForResponse((resp) => resp.url().includes('cart'));
```

### 2. Strong Locators (Role-Based)

Always prefer semantic, accessibility-based selectors that reflect the DOM structure, NOT CSS classes or styles.

**Priority order for selectors:**

1. **Role + accessible name** (preferred): `getByRole('button', {name: 'Add to cart'})`
2. **Role + landmark**: `getByRole('banner').getByRole('link', {name: /cart/i})`
3. **Text content**: `getByText('Continue to Checkout')`
4. **Test IDs** (when semantic selectors aren't possible): `getByTestId('cart-drawer')`
5. **CSS classes** (last resort only): Only when semantic selectors are impractical

**Why avoid CSS?** Per [Playwright docs](https://playwright.dev/docs/locators), CSS selectors are "not recommended as the DOM can often change leading to non resilient tests."

```typescript
// GOOD: Role-based selectors
getCartLineItems() {
  return this.page
    .getByRole('list', {name: /cart|line items/i})
    .getByRole('listitem');
}

getCheckoutButton() {
  return this.page.getByRole('button', {name: /checkout/i});
}

// ACCEPTABLE: Test IDs when disambiguation needed
getCartLineItems() {
  return this.page.getByTestId('cart-line-items').getByRole('listitem');
}

// AVOID: CSS selectors (fragile, DOM-dependent)
getCartLineItems() {
  return this.page.locator('li.cart-line:visible');  // Not resilient
}
```

#### Accessibility Improvements During Test Writing

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

### 3. Presence vs Absence Assertions

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

```typescript
test('removes item from cart aside', async ({page}) => {
  const cart = new CartUtil(page);
  const removeButton = cart.getRemoveButton(cart.getLineItems().first());
  const emptyCartMessage = page
    .getByRole('dialog', {name: 'Cart'})
    .getByText(/Looks like you haven.t added anything yet/);

  await removeButton.click();

  // Assert specific removal (broad - item gone from page)
  await cart.assertProductCount(0);
  // Assert empty state displayed (specific - in cart drawer)
  await expect(emptyCartMessage).toBeVisible();
});
```

### 4. Wait for Visible Effects, Not Mechanisms

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

## Test Organization

### Test Structure

Use `test.describe` blocks to group related tests by feature area, creating a clear hierarchy:

```typescript
test.describe('Cart', () => {
  test.describe('Line Items', () => {
    test.describe('Adding Items', () => {
      test('adds item to cart and opens aside drawer', async ({page}) => {
        // ...
      });
    });

    test.describe('Quantity Management', () => {
      test.beforeEach(async ({page}) => {
        // Shared setup for quantity tests
      });

      test('increases quantity in cart aside', async ({page}) => {
        // ...
      });

      test('decreases quantity when above minimum', async ({page}) => {
        // ...
      });
    });

    test.describe('Removing Items', () => {
      // ...
    });
  });

  test.describe('Edge Cases', () => {
    // ...
  });
});
```

### Setup Strategy

Per [Playwright best practices](https://playwright.dev/docs/best-practices#make-tests-as-isolated-as-possible): Use `beforeEach` hooks to eliminate repetitive setup steps while maintaining test isolation.

```typescript
// GOOD: Use beforeEach for shared setup (3+ lines repeated)
test.describe('Quantity Management', () => {
  test.beforeEach(async ({page}) => {
    const cart = new CartUtil(page);
    await page.goto(`/products/${PRODUCT_HANDLE}`);
    await cart.addItem(PRODUCT_NAME);
    await cart.assertTotalItems(1);
  });

  test('increases quantity in cart aside', async ({page}) => {
    const cart = new CartUtil(page);
    const increaseButton = cart.getIncreaseButton(cart.getLineItems().first());
    await increaseButton.click();
    await cart.assertTotalItems(2);
  });
});

// ACCEPTABLE: Duplicate simple 1-2 line setups when it improves clarity
test('adds item to empty cart', async ({page}) => {
  await page.goto(`/products/${PRODUCT_HANDLE}`);
  const cart = new CartUtil(page);
  await cart.addItem(PRODUCT_NAME);
  await cart.assertProductCount(1);
});

// AVOID: Repeating 3+ lines in every test
test('increases quantity', async ({page}) => {
  await page.goto(`/products/${PRODUCT_HANDLE}`); // Repeated
  await cart.addItem(PRODUCT_NAME); // Repeated
  await cart.assertTotalItems(1); // Repeated
  // Use beforeEach instead!
});
```

### Test Naming

Tests should clearly describe **what** is being tested and the **expected outcome**:

```typescript
// GOOD: Clear, descriptive names
test('adds item to cart and opens aside drawer', async ({page}) => {});
test('increases quantity in cart aside', async ({page}) => {});
test('removes item from cart page', async ({page}) => {});
test('persists discount after page reload', async ({page}) => {});

// AVOID: Vague names
test('cart test', async ({page}) => {});
test('it works', async ({page}) => {});
```

## Fixture Design Principles

### Deep Modules Pattern

Following John Ousterhout's "A Philosophy of Software Design", fixtures should expose **entity locators** but hide **implementation details**.

```typescript
// GOOD: Entity locators are public
getCartLineItems()  // Returns the domain entities
getCartDrawer()     // Returns the cart drawer element

// GOOD: Button locators and waiting logic hidden inside action methods
async increaseLineItemQuantity(lineItem) {
  const button = lineItem.getByRole('button', {name: 'Increase quantity'});  // Hidden
  await button.click();
  await expect
    .poll(async () => this.getLineItemQuantity(lineItem))
    .toBeGreaterThan(previousQty);  // Wait for visible effect
}

// AVOID: Exposing implementation details
getIncreaseButton(lineItem)  // Forces test to know about button details
getDecreaseButton(lineItem)  // Leaks abstraction
```

**However**: In Hydrogen's current fixtures, we DO expose button getters for flexibility. This is acceptable when:

- Tests need fine-grained control (e.g., checking disabled state)
- Action methods would be too opinionated
- Button getters return role-based locators (not CSS)

```typescript
// Current Hydrogen pattern (ACCEPTABLE)
getIncreaseButton(lineItem: Locator) {
  return lineItem.getByRole('button', {name: 'Increase quantity'});
}

getDecreaseButton(lineItem: Locator) {
  return lineItem.getByRole('button', {name: 'Decrease quantity'});
}
```

### Context-Aware Locators

When the same elements appear in multiple contexts (e.g., cart drawer vs cart page), detect the active context automatically:

```typescript
/**
 * The skeleton template renders both cart page and drawer simultaneously,
 * with the drawer hidden via CSS. Auto-detection ensures we select from the
 * correct context to avoid matching duplicate line items.
 */
getLineItems() {
  const {scope} = this.getActiveCartContext();
  const lineItemsList = scope.getByLabel('Line items');
  return lineItemsList.locator('> li');
}

private getActiveCartContext() {
  const isCartPage = this.page.url().includes('/cart');
  const scope = isCartPage
    ? this.page.getByLabel('Cart page')
    : this.page.getByRole('dialog', {name: 'Cart'});

  return {isCartPage, scope};
}
```

### Assertion Helper Methods

Create assertion methods that encapsulate complex checks and provide clear intent:

```typescript
// GOOD: Expressive assertion methods
async assertAppliedCard(lastFourChars: string) {
  const giftCards = this.page.getByRole('region', {name: 'Gift cards'});
  await expect(
    giftCards.locator('dd').filter({hasText: `***${lastFourChars}`})
  ).toBeVisible();
}

async assertNoGiftCards() {
  await expect(this.page.getByText('Applied Gift Card(s)')).toHaveCount(0);
}

async assertCardCodeNotPresent(lastFourChars: string) {
  await expect(this.page.getByText(`***${lastFourChars}`)).toHaveCount(0);
}

// AVOID: Tests directly writing complex assertions
// (This couples tests to implementation and reduces reusability)
```

### Action Helper Methods

Action methods should:

1. Perform the action
2. Wait for the visible effect to complete
3. Return void (assertions happen separately)

```typescript
async applyCode(code: string) {
  const input = this.page.getByRole('textbox', {name: 'Gift card code'});
  await input.fill(code);
  const applyButton = this.page.getByRole('button', {
    name: 'Apply gift card code',
  });
  await applyButton.click();

  // Wait for visible effect (user-centric)
  await expect(applyButton).toBeEnabled();
  await expect(input).toHaveValue('');
}

async removeCard(lastFourChars: string) {
  const giftCards = this.page.getByRole('region', {name: 'Gift cards'});
  const cardElement = giftCards
    .locator('dd')
    .filter({hasText: `***${lastFourChars}`});
  await cardElement
    .getByRole('button', {
      name: `Remove gift card ending in ${lastFourChars}`,
    })
    .click();
}
```

## Recipe Testing Setup

When testing recipes (from the Hydrogen cookbook), use `setRecipeFixture` to automatically scaffold and run the recipe:

```typescript
import {test, expect, setRecipeFixture} from '../../fixtures';
import {MarketsUtil} from '../../fixtures/markets-utils';

setRecipeFixture({
  recipeName: 'markets',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Markets recipe, which provides URL-based localization via path
 * prefixes (e.g. /FR-CA/). Tests cover routing, API-driven currency formatting,
 * and the country selector UI.
 *
 * NOTE: The recipe doesn't include a UI string translation system — hardcoded
 * text like "Add to cart" stays in English. Localization is routing- and
 * API-driven, not client-side string substitution.
 */

const KNOWN_PRODUCT = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;

test.describe('Markets Recipe', () => {
  test('home page navigation links include locale prefix', async ({page}) => {
    const recipe = new MarketsUtil(page);
    await page.goto('/FR-CA');
    await recipe.assertLocaleInUrl('/FR-CA');
    await recipe.assertNavigationLinksHaveLocalePrefix('/FR-CA');
  });
});
```

## Test Documentation

### File-Level Comments

Each test file should have a JSDoc comment describing:

1. What feature/recipe is being tested
2. Key implementation details relevant to testing
3. Known limitations or UX gaps

```typescript
/**
 * Validates the Infinite Scroll recipe, which implements automatic pagination
 * on collection pages using the Intersection Observer API.
 *
 * Tests cover:
 * - Initial product loading
 * - "Load more" button visibility and interaction
 * - Automatic loading when scrolling into view
 * - URL state management with replace mode (no history clutter)
 * - Scroll position preservation
 */
```

## Edge Cases to Test

Always include edge case tests for:

1. **Empty states**: Empty cart, no discounts, no gift cards
2. **Persistence**: State after page reload, navigation
3. **Duplicates**: Same item added twice, duplicate codes
4. **Invalid input**: Invalid codes, empty submissions
5. **Case sensitivity**: Uppercase/lowercase handling
6. **Graceful degradation**: Collections with no pagination, missing data

## Common Patterns

### Testing with Constants

Define test data as constants at the top of the file for maintainability:

```typescript
const PRODUCT_NAME = 'The Element';
const PRODUCT_HANDLE = 'the-element';
const UNIT_PRICE = '$749.95';
const TWO_ITEMS_PRICE = '$1,499.90';

const ACTIVE_DISCOUNT_CODE = getRequiredSecret(
  'discount_code_active',
).toUpperCase();
```

### Testing URL Changes

Wait for URL changes using `page.waitForURL()` with regex patterns:

```typescript
await page.goto('/FR-CA/cart');
await page.waitForURL(/\/FR-CA\/cart$/);
```

### Polling for Dynamic Changes

Use `expect.poll()` for values that change asynchronously:

```typescript
await expect
  .poll(async () => this.getProducts().count())
  .toBeGreaterThan(initialCount);
```

## Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [Hydrogen E2E Testing Guidelines](/e2e/CLAUDE.md)
