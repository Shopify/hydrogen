import {test, expect} from '@playwright/test';

test.describe('Cart Functionality', () => {
  test('should open cart drawer when clicking cart link', async ({page}) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify cart link is visible
    const cartLink = page.locator('a[href="/cart"]').first();
    await expect(cartLink).toBeVisible();

    // Get initial cart count
    const cartText = await cartLink.textContent();
    expect(cartText).toContain('Cart');

    // Click the cart link to open the drawer
    await cartLink.click();

    // Wait a moment for animation
    await page.waitForTimeout(500);

    // Verify the cart overlay is now visible
    // The skeleton template renders the cart as an overlay with aria-modal
    const cartOverlay = page.locator('[aria-modal="true"]').first();

    // Check if overlay has the expected class after opening
    const overlayClass = await cartOverlay.getAttribute('class');
    expect(overlayClass).toContain('overlay');

    // Verify cart heading exists in the overlay
    const cartHeading = page.locator('[aria-modal="true"] h3').first();
    const headingText = await cartHeading.textContent();
    expect(headingText).toBe('CART');

    // Basic smoke test passed - cart drawer opens
  });
});
