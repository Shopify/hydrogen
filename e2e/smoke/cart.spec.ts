import {test, expect} from '@playwright/test';

test.describe('Cart Functionality', () => {
  test('should verify page has cart-related functionality', async ({page}) => {
    await page.goto('/');

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Wait a bit more for any dynamic content
    await page.waitForTimeout(2000);

    // Get the page content
    const pageContent = await page.content();

    // Verify the page loaded and has expected content
    // The skeleton template should have cart-related elements somewhere
    expect(pageContent).toBeTruthy();

    // Check for cart-related text in the page
    // The word "Cart" should appear somewhere (in header, overlay, etc.)
    const hasCartText = pageContent.toLowerCase().includes('cart');
    expect(hasCartText).toBeTruthy();

    // Verify the page has product-related content as a sanity check
    const hasProducts =
      pageContent.toLowerCase().includes('product') ||
      pageContent.toLowerCase().includes('collection');
    expect(hasProducts).toBeTruthy();

    // Basic smoke test passed - page loaded with expected e-commerce elements
  });
});
