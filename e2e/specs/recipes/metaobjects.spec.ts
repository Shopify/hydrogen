import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'metaobjects',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Metaobjects recipe, which creates a content management system
 * using Shopify metaobjects for dynamic route-based content rendering.
 *
 * Tests cover:
 * - Custom stores routes render
 * - RouteContent component displays sections or fallback
 */

test.describe('Metaobjects Recipe', () => {
  test.describe('Stores Index Route', () => {
    test('renders stores index page', async ({page}) => {
      const response = await page.goto('/stores');
      expect(response?.ok()).toBeTruthy();

      await expect(page).toHaveURL(/\/stores$/);

      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });

    test('shows fallback content for unknown route handle', async ({page}) => {
      const response = await page.goto('/stores/does-not-exist');
      expect(response?.ok()).toBeTruthy();

      await expect(page).toHaveURL(/\/stores\/does-not-exist$/);

      await expect(page.getByText('No route content sections')).toBeVisible();
    });
  });
});
