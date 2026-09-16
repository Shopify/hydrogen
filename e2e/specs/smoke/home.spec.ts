import {test, expect, setTestStore} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

test.describe('Home Page', () => {
  test('should display featured collection, product grid, and no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    const featuredCollectionHeading = page.getByRole('heading', {level: 1});

    const productGridImage = page
      .getByRole('region', {name: 'Recommended Products'})
      .getByRole('link')
      .first()
      .getByRole('img');

    await expect(featuredCollectionHeading).toBeVisible();
    await expect(productGridImage).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});
