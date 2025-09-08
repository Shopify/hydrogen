import {test, expect, Page} from '@playwright/test';
import {startServer} from '../helpers/server';

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

test.describe('Product Flow', () => {
  test('should navigate to product, display correct title and price, and add to cart', async ({
    page,
  }) => {
    // Navigate to homepage first
    await page.goto(serverUrl);

    // Navigate to a specific product from the recommended products grid
    // Using the first product link in the recommended products section
    await page.click('.recommended-products-grid a.product-item:first-child');

    // Wait for product page to load
    await page.waitForLoadState('networkidle');

    // Assert product title is visible and not empty
    const productTitle = await page.locator('h1').textContent();
    expect(productTitle).toBeTruthy();
    expect(productTitle?.length).toBeGreaterThan(0);

    // Assert product price is visible and formatted correctly
    // The skeleton template shows prices in various formats - let's look for the main price display
    const productPrice = await page
      .locator('.product-price, .price, h4:has-text("$"), span:has-text("$")')
      .first();
    await expect(productPrice).toBeVisible();
    const priceText = await productPrice.textContent();
    expect(priceText).toMatch(/\$[\d,]+\.?\d*/); // Matches prices like $50, $50.00, $1,000.50

    // Click Add to Cart button
    const addToCartButton = page
      .locator('button[type="submit"]:has-text("Add to cart")')
      .first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Verify cart action succeeded (cart should open or show some indication)
    // The skeleton template typically opens a cart drawer or redirects to cart
    // We'll check for either behavior - cart drawer should open or cart count should update

    // Wait for cart to update
    await page.waitForTimeout(2000);

    // Check if cart drawer is visible or cart count has updated
    const cartDrawer = page
      .locator('aside:has-text("CART"), .cart-drawer')
      .first();
    const cartLink = page.locator('a[href="/cart"]');

    // Either cart drawer should be visible or cart count should show at least 1 item
    const isCartDrawerVisible = await cartDrawer.isVisible().catch(() => false);
    const cartLinkText = await cartLink.textContent();

    // Assert that either cart drawer opened or cart count updated
    if (!isCartDrawerVisible) {
      // If drawer didn't open, check that cart count updated
      expect(cartLinkText).toMatch(/Cart\s+[1-9]/); // Should show "Cart 1" or similar
    } else {
      // Cart drawer is open
      expect(isCartDrawerVisible).toBe(true);
    }
  });
});
