import {test, expect, setTestStore} from '../../fixtures';

setTestStore('mockShop');

test.describe('Home Page', () => {
  test('should display hero image, product grid, and no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    const heroImage = page
      .getByRole('link')
      .filter({
        has: page.getByRole('heading', {level: 1}),
      })
      .getByRole('img');

    const productGridImage = page
      .getByRole('region', {name: 'Recommended Products'})
      .getByRole('link', {name: "Women's T-shirt"})
      .getByRole('img');

    await expect(heroImage).toBeVisible();
    await expect(productGridImage).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});
