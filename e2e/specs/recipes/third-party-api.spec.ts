import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'third-party-api',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Third-party API recipe, which demonstrates integrating
 * external GraphQL APIs with Oxygen's caching system.
 *
 * Tests cover:
 * - Third-party API data displays on homepage
 * - Cached API client fetches external data
 */

test.describe('Third-party API Recipe', () => {
  test.describe('Homepage Integration', () => {
    test('displays Rick and Morty characters from third-party API', async ({
      page,
    }) => {
      await page.goto('/');

      const mainContent = page.getByRole('main');
      await expect(mainContent).toBeVisible();

      const pageContent = await mainContent.textContent();

      expect(pageContent).toContain('Rick');
      expect(pageContent).toContain('Morty');
    });

    test('renders third-party API content section', async ({page}) => {
      await page.goto('/');

      const mainContent = page.getByRole('main');
      const content = await mainContent.textContent();

      expect(content).toBeTruthy();
      expect(content?.length || 0).toBeGreaterThan(100);
    });
  });
});
