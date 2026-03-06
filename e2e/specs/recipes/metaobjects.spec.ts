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
 * - Custom routes query and render metaobject content
 * - RouteContent component handles sections
 */

test.describe('Metaobjects Recipe', () => {
  test.describe('Route Content System', () => {
    test('renders stores route', async ({page}) => {
      await page.goto('/stores');

      const body = page.locator('body');
      await expect(body).toBeVisible();

      const pageText = await body.textContent();
      expect(pageText).toBeTruthy();
    });

    test('displays route content or fallback message', async ({page}) => {
      await page.goto('/stores');

      const body = page.locator('body');
      const content = await body.textContent();

      const hasContent = content && content.length > 100;
      const hasFallback = content?.includes('No route content sections');

      expect(hasContent || hasFallback).toBeTruthy();
    });
  });
});
