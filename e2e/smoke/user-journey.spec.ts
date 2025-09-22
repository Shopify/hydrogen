import {test, expect, type Page} from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('should navigate from homepage through to checkout', async ({page}) => {
    // Track console errors (excluding Playwright debug-related ones)
    const consoleErrors: string[] = [];
    const allErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        allErrors.push(errorText);

        // Filter out Playwright debug mode artifacts (see home.spec.ts for details)
        const hasSeenPwGlass = allErrors.some((e) => e.includes('x-pw-glass'));
        const isPlaywrightDebugRelatedError =
          errorText.includes('x-pw-glass') ||
          (hasSeenPwGlass && errorText.includes('Hydration failed')) ||
          (hasSeenPwGlass &&
            errorText.includes('error occurred during hydration')) ||
          (hasSeenPwGlass &&
            errorText.includes('Failed to load resource') &&
            errorText.includes('favicon.ico'));

        if (!isPlaywrightDebugRelatedError) {
          consoleErrors.push(errorText);
        }
      }
    });

    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify homepage loads without errors
    expect(await page.title()).toContain('Hydrogen');

    // Verify key homepage elements are present
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

    // Capture initial cart state
    await page.locator('button[aria-label*="cart"]').click();
    await page.waitForTimeout(500); // Wait for cart to open
    const initialCartCount =
      (await page.locator('.cart-count').textContent()) || '0';
    const initialCartTotal =
      (await page.locator('.cart-total').textContent()) || '$0.00';

    // Close cart
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Navigate to collections page
    await page.goto('/collections');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.collections-grid')).toBeVisible();
    await expect(page.locator('.collection-item').first()).toBeVisible();

    // Click on first product in collection
    const firstProduct = page.locator('.product-item').first();
    const productName = await firstProduct
      .locator('.product-title')
      .textContent();
    await firstProduct.click();

    // Verify navigation to product detail page
    await page.waitForURL('**/products/**');
    await expect(page.locator('.product-details')).toBeVisible();
    await expect(page.locator('h1')).toContainText(productName!);

    // Add item to cart
    const productPrice = await page.locator('.product-price').textContent();
    await page.locator('button[data-action="add-to-cart"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for cart update

    // Open cart and verify item was added
    await page.locator('button[aria-label*="cart"]').click();
    await page.waitForTimeout(500);

    // Verify cart quantity increased
    const updatedCartCount =
      (await page.locator('.cart-count').textContent()) || '0';
    expect(parseInt(updatedCartCount)).toBeGreaterThan(
      parseInt(initialCartCount),
    );

    // Verify price updated correctly
    const updatedCartTotal =
      (await page.locator('.cart-total').textContent()) || '$0.00';
    expect(
      parseFloat(updatedCartTotal.replace(/[^0-9.]/g, '')),
    ).toBeGreaterThan(parseFloat(initialCartTotal.replace(/[^0-9.]/g, '')));

    // Verify product is in cart
    await expect(page.locator('.cart-item')).toContainText(productName!);
    await expect(page.locator('.cart-item')).toContainText(productPrice!);

    // Click checkout button
    const checkoutButton = page.locator('button[data-action="checkout"]');
    await expect(checkoutButton).toBeVisible();
    await expect(checkoutButton).toBeEnabled();
    await checkoutButton.click();

    // Wait for navigation to checkout page
    await page.waitForURL('**/checkouts/**', {timeout: 10000});

    // Verify checkout page loaded
    await expect(page.locator('.checkout-form')).toBeVisible();
    await expect(page.locator('[data-step="shipping"]')).toBeVisible();
    await expect(page.locator('[data-step="payment"]')).toBeVisible();

    // Verify order summary is present
    await expect(page.locator('.order-summary')).toBeVisible();
    await expect(page.locator('.order-summary')).toContainText(productName!);

    // Ensure no console errors during entire flow
    expect(consoleErrors).toHaveLength(0);
  });
});
