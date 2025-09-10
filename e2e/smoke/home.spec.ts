import {test, expect} from '@playwright/test';

test.describe('Home Page', () => {
  test('should display hero image, product grid, and no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    const heroImage = page
      .locator('[data-testid="hero-image"], img[alt*="hero" i], .hero img')
      .first();
    await expect(heroImage).toBeVisible();

    const productGrid = page
      .locator(
        '[data-testid="product-grid"], .product-grid, [class*="product"][class*="grid"]',
      )
      .first();
    await expect(productGrid).toBeVisible();

    const addToCartButtons = page.locator(
      'button:has-text("Add to cart"), button:has-text("Add to Cart"), [data-testid="add-to-cart"]',
    );
    await expect(addToCartButtons.first()).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});
