import {test, expect} from '@playwright/test';
import {startServer} from '../helpers/server';

let serverConfig: {port: number; stop: () => Promise<void>} | null = null;

test.describe('Smoke tests', () => {
  test.beforeAll(async () => {
    serverConfig = await startServer();
  }, 90000);

  test.afterAll(async () => {
    if (serverConfig) {
      await serverConfig.stop();
    }
  });

  test('homepage loads with no console errors @smoke', async ({page}) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    const response = await page.goto(`http://localhost:${serverConfig!.port}/`);

    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Hydrogen/);

    expect(consoleErrors).toHaveLength(0);

    // Check for hero image (featured collection image)
    const heroImage = page.locator('.featured-collection-image img').first();
    await expect(heroImage).toBeVisible();

    // Check for login link
    const loginLink = page.locator('a[href="/account"]').first();
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText('Sign in');

    // Check for cart icon
    const cartLink = page.locator('a[href="/cart"]').first();
    await expect(cartLink).toBeVisible();
    await expect(cartLink).toContainText('Cart');

    // Navigate to a product page to check for Add to cart button
    await page.goto(
      `http://localhost:${serverConfig!.port}/products/sweatpants`,
    );
    const addToCartButton = page.locator(
      'button[type="submit"]:has-text("Add to cart")',
    );
    await expect(addToCartButton).toBeVisible();
  });
});
