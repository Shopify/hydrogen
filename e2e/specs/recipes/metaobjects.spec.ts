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
      await page.goto('/stores');

      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();

      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      expect(pageContent?.length || 0).toBeGreaterThan(100);
    });

    test('displays route content or no sections fallback', async ({page}) => {
      await page.goto('/stores');

      const pageContent = await page.textContent('body');

      const hasContent = pageContent && pageContent.length > 500;
      const hasFallback = pageContent?.includes('No route content sections');

      expect(hasContent || hasFallback).toBe(true);
    });
  });
});
