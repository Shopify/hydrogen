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

    const featuredCollection = page.locator('.featured-collection').first();
    await expect(featuredCollection).toBeVisible();

    const featuredImage = page
      .locator('.featured-collection-image img')
      .first();
    await expect(featuredImage).toBeVisible();

    const recommendedProducts = page
      .locator('.recommended-products-grid')
      .first();
    await expect(recommendedProducts).toBeVisible();

    const productItems = page.locator('.product-item');
    await expect(productItems.first()).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});
