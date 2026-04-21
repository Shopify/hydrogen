import {test, expect, setTestStore} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

// A broad search term that reliably returns products in the preview store.
const SEARCH_TERM = 'snowboard';

test.describe('Search', () => {
  test.describe('Basic Search', () => {
    test('displays search heading and form', async ({page}) => {
      await page.goto('/search');

      await expect(
        page.getByRole('heading', {level: 1, name: 'Search'}),
      ).toBeVisible();
      await expect(page.getByPlaceholder('Search…')).toBeVisible();
      await expect(
        page.getByRole('main').getByRole('button', {name: 'Search'}),
      ).toBeVisible();
    });

    test('returns results for a valid search term', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      // Should show product results
      await expect(
        page.getByRole('heading', {level: 2, name: 'Products'}),
      ).toBeVisible();
    });

    test('shows empty state for no results', async ({page}) => {
      await page.goto('/search?q=xyznonexistentproduct123');

      await expect(
        page.getByText('No results, try a different search.'),
      ).toBeVisible();
    });
  });

  test.describe('Search Sorting', () => {
    test('displays sort dropdown when results exist', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      const sortSelect = page.getByRole('combobox', {name: 'Sort by:'});
      await expect(sortSelect).toBeVisible();
    });

    test('does not display sort dropdown with no results', async ({page}) => {
      await page.goto('/search?q=xyznonexistentproduct123');

      const sortSelect = page.getByRole('combobox', {name: 'Sort by:'});
      await expect(sortSelect).not.toBeVisible();
    });

    test('changes sort order and updates URL', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      const sortSelect = page.getByRole('combobox', {name: 'Sort by:'});
      await sortSelect.selectOption('PRICE_LOW_TO_HIGH');

      // Wait for navigation to complete after sort change
      await page.waitForURL(/sort_by=PRICE_LOW_TO_HIGH/);
      // Search term should be preserved
      await expect(page).toHaveURL(new RegExp(`q=${SEARCH_TERM}`));
    });
  });

  test.describe('Search Filtering', () => {
    test('displays product filters when results exist', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      const filterGroup = page.getByRole('heading', {level: 3});
      await expect(filterGroup.first()).toBeVisible();
    });

    test('applies a filter and updates the URL', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      const filterButton = page
        .getByRole('button', {name: /products$/i})
        .first();
      await expect(filterButton).toBeVisible();
      await filterButton.click();

      await expect(page).toHaveURL(/filter\./);
      // Search term should be preserved
      await expect(page).toHaveURL(new RegExp(`q=${SEARCH_TERM}`));
    });

    test('clears all filters', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      // Apply a filter
      const filterButton = page
        .getByRole('button', {name: /products$/i})
        .first();
      await filterButton.click();
      await expect(page).toHaveURL(/filter\./);

      // Clear all
      const clearButton = page.getByRole('button', {
        name: 'Clear All Filters',
      });
      await clearButton.click();

      await expect(page).not.toHaveURL(/filter\./);
      // Search term should still be preserved
      await expect(page).toHaveURL(new RegExp(`q=${SEARCH_TERM}`));
    });
  });

  test.describe('Article Search Results', () => {
    test('article links include blog handle in URL', async ({page}) => {
      // Use the same broad search term that returns products AND articles
      await page.goto(`/search?q=${SEARCH_TERM}`);

      // The preview store (hydrogen.shop) has articles — assert they appear
      await expect(
        page.getByRole('heading', {level: 2, name: 'Articles'}),
      ).toBeVisible();

      // Scope to the Articles section to avoid matching nav links like /blogs/journal
      const articleLink = page
        .getByRole('heading', {level: 2, name: 'Articles'})
        .locator('..')
        .getByRole('link')
        .first();

      await expect(articleLink).toBeVisible();

      const href = await articleLink.getAttribute('href');
      // URL should be /blogs/{blogHandle}/{articleHandle}, not /blogs/{articleHandle}
      // This means there should be at least 2 path segments after /blogs/
      const blogPath = href?.match(/\/blogs\/([^?]+)/)?.[1] ?? '';
      expect(blogPath.split('/').length).toBeGreaterThanOrEqual(2);
    });
  });
});
