import {test, expect} from '@playwright/test';

test.describe('Cookies', () => {
  test('should load the page successfully', async ({page}) => {
    await page.goto('/');

    // Verify the page loaded by checking the title
    const title = await page.title();
    expect(title).toContain('Hydrogen');

    // Verify the page is in a ready state
    await expect(page).toHaveURL('/');
  });
});
