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

        /**
         * Filter out Playwright debug mode specific errors
         *
         * When running with --debug flag, Playwright injects an <x-pw-glass> element
         * for its debugging UI. This causes a cascade of errors:
         *
         * 1. React hydration fails because server HTML doesn't match client HTML
         *    (server doesn't have the x-pw-glass element)
         * 2. When hydration fails, React replaces the entire document
         * 3. During document replacement, browser makes a default favicon.ico request
         * 4. Since skeleton uses favicon.svg (not .ico), this results in a 404
         *
         * Evidence this is safe to filter:
         * - No actual 404 network request is captured by Playwright monitoring
         * - These errors ONLY appear alongside x-pw-glass hydration errors
         * - In normal mode (without --debug), no such errors occur
         * - The application works correctly; it's purely a debug mode artifact
         *
         * We filter these specific debug-related errors while still catching all
         * real application errors, ensuring test reliability in both modes.
         */
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
