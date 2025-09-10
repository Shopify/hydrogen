import {test, expect} from '@playwright/test';

test.describe('Cart Functionality', () => {
  test('should open cart, add first product, and verify product handle appears', async ({
    page,
  }) => {
    await page.goto('/');

    const cartButton = page
      .locator(
        '[data-testid="cart-button"], button[aria-label*="cart" i], a[href="/cart"]',
      )
      .first();
    await cartButton.click();

    const emptyCartMessage = page
      .locator(
        'text=/your cart is empty/i, text=/no items in cart/i, [data-testid="empty-cart"]',
      )
      .first();
    await expect(emptyCartMessage).toBeVisible();

    await page.goto('/');

    const firstAddToCartButton = page
      .locator(
        'button:has-text("Add to cart"), button:has-text("Add to Cart"), [data-testid="add-to-cart"]',
      )
      .first();
    await firstAddToCartButton.click();

    await page.waitForTimeout(500);

    await cartButton.click();

    const cartItems = page.locator(
      '[data-testid="cart-item"], .cart-item, [class*="cart-item"]',
    );
    await expect(cartItems).toHaveCount(1);

    const productHandle = await cartItems
      .first()
      .locator('[data-testid="product-handle"], .product-title, h3, h4')
      .textContent();
    expect(productHandle).toBeTruthy();
    expect(productHandle?.length).toBeGreaterThan(0);
  });
});
