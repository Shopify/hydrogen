import {test, expect, setTestStore} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

// A broad search term that reliably returns products in the preview store.
const SEARCH_TERM = 'snowboard';

test.describe('Search', () => {
  test.describe('Basic Search', () => {
    test('renders search results without console errors', async ({page}) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`/search?q=${SEARCH_TERM}`);

      await expect(
        page.getByRole('heading', {level: 2, name: 'Products'}),
      ).toBeVisible();

      expect(consoleErrors).toHaveLength(0);
    });

    test('displays search heading and form', async ({page}) => {
      await page.goto('/search');

      await expect(
        page.getByRole('heading', {level: 1, name: 'Search'}),
      ).toBeVisible();
      await expect(page.getByPlaceholder('Search…')).toBeVisible();
      await expect(page.getByRole('button', {name: 'Search'})).toBeVisible();
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

      const sortSelect = page.getByLabel('Sort products');
      await expect(sortSelect).toBeVisible();
    });

    test('does not display sort dropdown with no results', async ({page}) => {
      await page.goto('/search?q=xyznonexistentproduct123');

      const sortSelect = page.getByLabel('Sort products');
      await expect(sortSelect).not.toBeVisible();
    });

    test('changes sort order and updates URL', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      const sortSelect = page.getByLabel('Sort products');
      await sortSelect.selectOption('PRICE_LOW_TO_HIGH');

      await expect(page).toHaveURL(/sort_by=PRICE_LOW_TO_HIGH/);
      // Search term should be preserved
      await expect(page).toHaveURL(new RegExp(`q=${SEARCH_TERM}`));
    });
  });

  test.describe('Search Filtering', () => {
    test('displays product filters when results exist', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      const filterGroup = page.locator('.collection-filter-group');
      await expect(filterGroup.first()).toBeVisible();
    });

    test('applies a filter and updates the URL', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      const filterButton = page.locator('.collection-filter-option').first();
      await expect(filterButton).toBeVisible();
      await filterButton.click();

      await expect(page).toHaveURL(/filter\./);
      // Search term should be preserved
      await expect(page).toHaveURL(new RegExp(`q=${SEARCH_TERM}`));
    });

    test('clears all filters', async ({page}) => {
      await page.goto(`/search?q=${SEARCH_TERM}`);

      // Apply a filter
      const filterButton = page.locator('.collection-filter-option').first();
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
      // Search for a term that returns articles
      await page.goto('/search?q=journal');

      const articlesSection = page.getByRole('heading', {
        level: 2,
        name: 'Articles',
      });

      // Only test article links if the store has articles
      if (await articlesSection.isVisible()) {
        const articleLink = page
          .locator('.search-results-item')
          .filter({
            has: page.locator('a[href*="/blogs/"]'),
          })
          .first()
          .getByRole('link');

        if (await articleLink.isVisible()) {
          const href = await articleLink.getAttribute('href');
          // URL should be /blogs/{blogHandle}/{articleHandle}, not /blogs/{articleHandle}
          // This means there should be at least 3 path segments after /blogs/
          const blogPath = href?.match(/\/blogs\/([^?]+)/)?.[1] ?? '';
          expect(blogPath.split('/').length).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });
});
