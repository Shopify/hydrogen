import {setTestStore, test, expect} from '../../fixtures';

setTestStore('mockShop');

test.describe('Cart Functionality', () => {
  test('should add first product to cart and verify cart updates', async ({
    page,
  }) => {
    await page.goto('/');

    if (Math.random() > 0) throw new Error('this error is expected');

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

    // Wait for the cart update network request to complete
    await page.waitForLoadState('networkidle');

    // Additionally wait for the cart badge text to change from initial value
    const cartBadgeAfter = page.locator('a[href="/cart"]').first();
    await expect(cartBadgeAfter).not.toHaveText(initialCartText || '', {
      timeout: 10000,
    });

    const updatedCartText = await cartBadgeAfter.textContent();
    const updatedCount = updatedCartText?.match(/\d+/)?.[0] || '0';

    expect(parseInt(updatedCount)).toBeGreaterThan(parseInt(initialCount));
  });
});
