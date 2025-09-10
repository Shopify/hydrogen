import {test, expect} from '@playwright/test';

test.describe('Cart Functionality', () => {
  test('should add first product to cart and verify cart updates', async ({
    page,
  }) => {
    await page.goto('/');

    const cartBadgeBefore = page.locator('a[href="/cart"]').first();
    const initialCartText = await cartBadgeBefore.textContent();
    const initialCount = initialCartText?.match(/\d+/)?.[0] || '0';

    const firstProduct = page.locator('.product-item').first();
    await firstProduct.click();

    await page.waitForLoadState('networkidle');

    const addToCartButton = page
      .locator('button:has-text("Add to cart")')
      .first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    await page.waitForTimeout(1500);

    const cartBadgeAfter = page.locator('a[href="/cart"]').first();
    const updatedCartText = await cartBadgeAfter.textContent();
    const updatedCount = updatedCartText?.match(/\d+/)?.[0] || '0';

    expect(parseInt(updatedCount)).toBeGreaterThan(parseInt(initialCount));
  });
});
