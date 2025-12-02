import {test, expect} from '@playwright/test';

test('launches dev server and displays Hydrogen in title', async ({page}) => {
  await page.goto('/');

  const title = await page.title();
  expect(title).toContain('Hydrogen');
});
