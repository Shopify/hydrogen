import {test, expect, setTestStore} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

test.describe('Cart Line Items', () => {
  // Clear ALL cookies before AND after each test for isolation on shared store.
  // Cart state is stored in a cookie, and clearing all ensures complete isolation.
  test.beforeEach(async ({storefront}) => {
    await storefront.clearAllCookies();
  });

  test.afterEach(async ({storefront}) => {
    await storefront.clearAllCookies();
  });

  test.describe('Adding Items', () => {
    test('adds item to cart and opens aside drawer', async ({storefront}) => {
      await storefront.goto('/');
      await storefront.navigateToFirstProduct();
      await storefront.addToCart();

      await expect(storefront.getCartDrawer()).toBeVisible();

      const lineItems = storefront.getCartLineItems();
      await expect(lineItems).toHaveCount(1);

      const firstItem = storefront.getCartLineItemByIndex(0);
      expect(await storefront.getLineItemQuantity(firstItem)).toBe(1);

      await expect(firstItem.locator('strong')).toBeVisible();
    });

    test('updates cart badge count when adding items', async ({storefront}) => {
      await storefront.goto('/');
      const initialCount = await storefront.getCartBadgeCount();

      await storefront.navigateToFirstProduct();
      await storefront.addToCart();
      await storefront.closeCartAside();

      const newCount = await storefront.getCartBadgeCount();
      expect(newCount).toBe(initialCount + 1);
    });
  });

  test.describe('Quantity Management', () => {
    test.beforeEach(async ({storefront}) => {
      await storefront.goto('/');
      await storefront.navigateToFirstProduct();
      await storefront.addToCart();
    });

    test('increases quantity in cart aside', async ({storefront}) => {
      const firstItem = storefront.getCartLineItemByIndex(0);
      const initialSubtotal = await storefront.getSubtotalAmount();

      await storefront.increaseLineItemQuantity(firstItem);

      expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);
      // Wait for subtotal to update (network latency)
      await expect
        .poll(() => storefront.getSubtotalAmount(), {timeout: 10000})
        .toBeGreaterThan(initialSubtotal);
    });

    test('increases quantity on cart page', async ({storefront}) => {
      await storefront.closeCartAside();
      await storefront.goto('/cart');

      // Ensure cart line items are visible on cart page before proceeding
      await expect(storefront.getCartLineItems().first()).toBeVisible({
        timeout: 10000,
      });

      const firstItem = storefront.getCartLineItemByIndex(0);
      const initialSubtotal = await storefront.getSubtotalAmount();

      await storefront.increaseLineItemQuantity(firstItem);

      expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);
      await expect
        .poll(() => storefront.getSubtotalAmount(), {timeout: 10000})
        .toBeGreaterThan(initialSubtotal);
    });

    test('decreases quantity when above minimum', async ({storefront}) => {
      const firstItem = storefront.getCartLineItemByIndex(0);
      const subtotalAtOne = await storefront.getSubtotalAmount();

      await storefront.increaseLineItemQuantity(firstItem);
      expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);

      // Wait for subtotal to increase after adding quantity
      await expect
        .poll(() => storefront.getSubtotalAmount(), {timeout: 10000})
        .toBeGreaterThan(subtotalAtOne);
      const subtotalAtTwo = await storefront.getSubtotalAmount();

      await storefront.decreaseLineItemQuantity(firstItem);

      expect(await storefront.getLineItemQuantity(firstItem)).toBe(1);
      await expect
        .poll(() => storefront.getSubtotalAmount(), {timeout: 10000})
        .toBeLessThan(subtotalAtTwo);
    });

    test('disables decrease button at quantity 1', async ({storefront}) => {
      const firstItem = storefront.getCartLineItemByIndex(0);
      const decreaseButton = firstItem.getByRole('button', {
        name: 'Decrease quantity',
      });

      await expect(decreaseButton).toBeDisabled();
    });

    test('updates cart badge when quantity changes', async ({storefront}) => {
      const countAfterAdd = await storefront.getCartBadgeCount();

      const firstItem = storefront.getCartLineItemByIndex(0);
      await storefront.increaseLineItemQuantity(firstItem);
      await storefront.closeCartAside();

      expect(await storefront.getCartBadgeCount()).toBe(countAfterAdd + 1);
    });
  });

  test.describe('Removing Items', () => {
    test.beforeEach(async ({storefront}) => {
      await storefront.goto('/');
      await storefront.navigateToFirstProduct();
      await storefront.addToCart();
    });

    test('removes item from cart aside', async ({storefront}) => {
      const firstItem = storefront.getCartLineItemByIndex(0);

      await storefront.removeLineItem(firstItem);

      await expect(storefront.getCartEmptyMessage()).toBeVisible();
      await expect(storefront.getCartLineItems()).toHaveCount(0);
    });

    test('removes item from cart page', async ({storefront}) => {
      await storefront.closeCartAside();
      await storefront.goto('/cart');

      // Ensure cart line items are visible on cart page before proceeding
      await expect(storefront.getCartLineItems().first()).toBeVisible({
        timeout: 10000,
      });

      const firstItem = storefront.getCartLineItemByIndex(0);
      await storefront.removeLineItem(firstItem);

      await expect(storefront.getCartEmptyMessage()).toBeVisible();
    });

    test('updates cart badge to zero after removal', async ({storefront}) => {
      const firstItem = storefront.getCartLineItemByIndex(0);
      await storefront.removeLineItem(firstItem);

      await expect
        .poll(() => storefront.getCartBadgeCount(), {timeout: 5000})
        .toBe(0);
    });
  });

  test.describe('Cart Totals', () => {
    test.beforeEach(async ({storefront}) => {
      await storefront.goto('/');
      await storefront.navigateToFirstProduct();
      await storefront.addToCart();
    });

    test('displays subtotal in cart aside', async ({storefront}) => {
      const subtotal = await storefront.getSubtotalAmount();
      expect(subtotal).toBeGreaterThan(0);
    });

    test('displays subtotal on cart page', async ({storefront}) => {
      await storefront.closeCartAside();
      await storefront.goto('/cart');

      // Ensure cart line items are visible on cart page before proceeding
      await expect(storefront.getCartLineItems().first()).toBeVisible({
        timeout: 10000,
      });

      const subtotal = await storefront.getSubtotalAmount();
      expect(subtotal).toBeGreaterThan(0);
    });

    test('shows checkout button when cart has items', async ({storefront}) => {
      await expect(storefront.getCheckoutButton()).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('shows empty cart state on cart page', async ({storefront}) => {
      await storefront.goto('/cart');

      await expect(storefront.getCartEmptyMessage()).toBeVisible();
      await expect(
        storefront.page.getByRole('link', {name: /Continue shopping/i}),
      ).toBeVisible();
    });

    test('shows empty cart state in cart aside', async ({storefront}) => {
      await storefront.goto('/');
      await storefront.openCartAside();

      await expect(storefront.getCartEmptyMessage()).toBeVisible();
    });

    test('persists cart state after navigation', async ({storefront}) => {
      await storefront.goto('/');
      await storefront.navigateToFirstProduct();
      await storefront.addToCart();

      const firstItem = storefront.getCartLineItemByIndex(0);
      await storefront.increaseLineItemQuantity(firstItem);
      // Wait for quantity update to complete before navigation
      expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);

      await storefront.closeCartAside();
      // Navigate to a different page and back
      await storefront.goto('/collections');
      await storefront.goto('/');
      await storefront.openCartAside();

      const item = storefront.getCartLineItemByIndex(0);
      expect(await storefront.getLineItemQuantity(item)).toBe(2);
    });

    test('cart page displays correct heading', async ({storefront}) => {
      await storefront.goto('/cart');

      const heading = storefront.page.getByRole('heading', {
        level: 1,
        name: 'Cart',
      });
      await expect(heading).toBeVisible();
    });
  });
});
