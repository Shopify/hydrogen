import {test, expect} from '@playwright/test';

test.describe('Home Page', () => {
  test('should display hero image, product grid, and no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const allErrors: string[] = []; // Track all errors to detect x-pw-glass

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        allErrors.push(errorText);

        // Filter out Playwright debug mode specific errors:
        // 1. Hydration errors caused by x-pw-glass element injection
        // 2. Subsequent errors that are side effects of hydration failure
        const hasSeenPwGlass = allErrors.some((e) => e.includes('x-pw-glass'));

        const isPlaywrightDebugRelatedError =
          // Direct x-pw-glass errors
          errorText.includes('x-pw-glass') ||
          // Hydration errors after x-pw-glass was seen
          (hasSeenPwGlass && errorText.includes('Hydration failed')) ||
          (hasSeenPwGlass &&
            errorText.includes('error occurred during hydration')) ||
          // Favicon.ico 404 that occurs as side effect of hydration failure
          (hasSeenPwGlass &&
            errorText.includes('Failed to load resource') &&
            errorText.includes('favicon.ico'));

        if (!isPlaywrightDebugRelatedError) {
          consoleErrors.push(errorText);
        }
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
