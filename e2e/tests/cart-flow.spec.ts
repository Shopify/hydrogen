import {test, expect} from '@playwright/test';
import {startServer} from '../helpers/server';
import {createPageObjects} from '../page-objects/storefront';

let serverUrl: string;
let stopServer: () => Promise<void>;

test.beforeAll(async () => {
  const server = await startServer();
  serverUrl = `http://localhost:${server.port}`;
  stopServer = server.stop;
}, 90000);

test.afterAll(async () => {
  if (stopServer) {
    await stopServer();
  }
});

test.describe('Cart Flow', () => {
  test('should manage cart operations: add item, update quantity, verify subtotal, remove item', async ({
    page,
  }) => {
    const {product, cart} = createPageObjects(page, serverUrl);

    // Step 1: Add a product to cart
    await product.navigateToFirstProduct();
    // Wait to ensure we're on the product page
    await product.page.waitForURL(/\/products\//);
    const productTitle = await product.getProductTitle();
    const productPrice = await product.getProductPrice();
    await product.addToCart();

    // Step 2: Cart drawer should already be open, but if not, open it
    // First check if cart drawer is already visible
    const isDrawerOpen = await cart.cartDrawer.isVisible();
    if (!isDrawerOpen) {
      // If drawer is not open, navigate directly to cart page instead of clicking cart link
      await cart.navigateToCart();
    }

    // Assert cart has 1 item
    const itemCount = await cart.getItemCount();
    expect(itemCount).toBe(1);

    // Assert item has correct title
    const cartItemTitle = await cart.cartItemTitle.first().textContent();
    expect(cartItemTitle).toContain(productTitle);

    // Assert quantity is 1
    const quantityText = await cart.page
      .locator('.cart-line-quantity small')
      .first()
      .textContent();
    expect(quantityText).toContain('Quantity: 1');

    // Get initial subtotal
    await cart.page.waitForTimeout(1000); // Wait for cart to fully load
    const initialSubtotal = await cart.getSubtotal();
    expect(initialSubtotal).toMatch(/\$[\d,]+\.?\d*/);

    // Step 3: Update quantity to 2
    await cart.increaseQuantity(0);

    // Assert quantity updated to 2
    const updatedQuantityText = await cart.page
      .locator('.cart-line-quantity small')
      .first()
      .textContent();
    expect(updatedQuantityText).toContain('Quantity: 2');

    // Step 4: Assert subtotal changed (should be doubled)
    const updatedSubtotal = await cart.getSubtotal();
    expect(updatedSubtotal).toMatch(/\$[\d,]+\.?\d*/);

    // Extract numeric values to compare
    const initialAmount = parseFloat(initialSubtotal.replace(/[^0-9.]/g, ''));
    const updatedAmount = parseFloat(updatedSubtotal.replace(/[^0-9.]/g, ''));
    expect(updatedAmount).toBeCloseTo(initialAmount * 2, 2);

    // Step 5: Remove item from cart
    await cart.removeItem(0);

    // Wait for cart to update after removal
    await cart.page.waitForTimeout(2000);

    // Step 6: Assert empty cart UI
    // Check if cart drawer is still open, if not, open it to check empty state
    const isDrawerStillOpen = await cart.cartDrawer.isVisible();
    if (!isDrawerStillOpen) {
      await cart.openCart();
    }

    // Verify empty cart message is visible
    const cartText = await cart.cartDrawer.textContent();
    expect(cartText).toContain('added anything yet');

    const finalItemCount = await cart.getItemCount();
    expect(finalItemCount).toBe(0);
  });

  test('should clear cart state between tests', async ({page}) => {
    const {product, cart} = createPageObjects(page, serverUrl);

    // Navigate to homepage
    await product.goto('/');

    // Verify cart is empty at the start
    const cartCount = await cart.getCartCount();
    expect(cartCount).toBe(0);
  });
});
