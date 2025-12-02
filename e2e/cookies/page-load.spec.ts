import {test, expect} from '@playwright/test';

test.describe('Cookies', () => {
  test('should load the page successfully', async ({page}) => {
    await page.goto(process.env.E2E_BASE_URL ?? '/');

    // Verify the page loaded by checking the title
    const title = await page.title();
    expect(title).toContain('Hydrogen');
  });
});
