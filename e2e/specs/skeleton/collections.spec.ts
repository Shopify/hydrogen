import {test, expect, setTestStore} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

// The backcountry collection is stable in the preview store and has enough
// products to exercise pagination, sorting, and filtering.
const TEST_COLLECTION = 'backcountry';
const COLLECTION_URL = `/collections/${TEST_COLLECTION}`;

test.describe('Collections', () => {
  test.describe('Page Rendering', () => {
    test('displays collection heading and products', async ({page}) => {
      await page.goto(COLLECTION_URL);

      await expect(page.getByRole('heading', {level: 1})).toBeVisible();

      // Products should render (each product item has an h4 title)
      const productItems = page.getByRole('heading', {level: 4});
      await expect(productItems.first()).toBeVisible();
    });
  });

  test.describe('Sorting', () => {
    test('displays the sort dropdown on collection pages', async ({page}) => {
      await page.goto(COLLECTION_URL);

      const sortSelect = page.getByRole('combobox', {name: 'Sort by:'});
      await expect(sortSelect).toBeVisible();
    });

    test('changes sort order via the dropdown and updates the URL', async ({
      page,
    }) => {
      await page.goto(COLLECTION_URL);

      const sortSelect = page.getByRole('combobox', {name: 'Sort by:'});
      await sortSelect.selectOption('PRICE_LOW_TO_HIGH');

      await expect(page).toHaveURL(/sort_by=PRICE_LOW_TO_HIGH/);
    });

    test('removes sort_by param when selecting the default sort', async ({
      page,
    }) => {
      await page.goto(`${COLLECTION_URL}?sort_by=PRICE_LOW_TO_HIGH`);

      const sortSelect = page.getByRole('combobox', {name: 'Sort by:'});
      await expect(sortSelect).toHaveValue('PRICE_LOW_TO_HIGH');

      await sortSelect.selectOption('FEATURED');

      await expect(page).not.toHaveURL(/sort_by/);
    });

    test('preserves sort selection after page reload', async ({page}) => {
      await page.goto(`${COLLECTION_URL}?sort_by=PRICE_HIGH_TO_LOW`);

      const sortSelect = page.getByRole('combobox', {name: 'Sort by:'});
      await expect(sortSelect).toHaveValue('PRICE_HIGH_TO_LOW');

      await page.reload();

      await expect(sortSelect).toHaveValue('PRICE_HIGH_TO_LOW');
    });
  });

  test.describe('Filtering', () => {
    test('displays filter groups on collection pages', async ({page}) => {
      await page.goto(COLLECTION_URL);

      // The store should have at least one filter configured.
      // Each filter group renders an <h3> heading with the filter label.
      const filterGroup = page.getByRole('heading', {level: 3});
      await expect(filterGroup.first()).toBeVisible();
    });

    test('applies a filter and updates the URL', async ({page}) => {
      await page.goto(COLLECTION_URL);

      // Click the first available filter option
      const filterButton = page
        .getByRole('button', {name: /products$/i})
        .first();
      await expect(filterButton).toBeVisible();
      await filterButton.click();

      await expect(page).toHaveURL(/filter\./);
    });

    test('shows "Clear All Filters" button when a filter is active', async ({
      page,
    }) => {
      await page.goto(COLLECTION_URL);

      const clearButton = page.getByRole('button', {
        name: 'Clear All Filters',
      });
      await expect(clearButton).not.toBeVisible();

      // Apply a filter
      const filterButton = page
        .getByRole('button', {name: /products$/i})
        .first();
      await filterButton.click();

      await expect(clearButton).toBeVisible();
    });

    test('clears all filters when "Clear All Filters" is clicked', async ({
      page,
    }) => {
      await page.goto(COLLECTION_URL);

      // Apply a filter first
      const filterButton = page
        .getByRole('button', {name: /products$/i})
        .first();
      await filterButton.click();
      await expect(page).toHaveURL(/filter\./);

      // Clear all filters
      const clearButton = page.getByRole('button', {
        name: 'Clear All Filters',
      });
      await clearButton.click();

      await expect(page).not.toHaveURL(/filter\./);
    });

    test('sets aria-pressed on active filter buttons', async ({page}) => {
      await page.goto(COLLECTION_URL);

      const filterButton = page
        .getByRole('button', {name: /products$/i})
        .first();
      await expect(filterButton).toHaveAttribute('aria-pressed', 'false');

      await filterButton.click();

      await expect(filterButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('Filtering and Sorting together', () => {
    test('preserves filters when changing sort order', async ({page}) => {
      await page.goto(COLLECTION_URL);

      // Apply a filter
      const filterButton = page
        .getByRole('button', {name: /products$/i})
        .first();
      await filterButton.click();
      await expect(page).toHaveURL(/filter\./);

      // Change sort
      const sortSelect = page.getByRole('combobox', {name: 'Sort by:'});
      await sortSelect.selectOption('PRICE_LOW_TO_HIGH');

      // Both should be in the URL
      await expect(page).toHaveURL(/filter\./);
      await expect(page).toHaveURL(/sort_by=PRICE_LOW_TO_HIGH/);
    });

    test('preserves sort when applying a filter', async ({page}) => {
      await page.goto(`${COLLECTION_URL}?sort_by=PRICE_LOW_TO_HIGH`);

      // Apply a filter
      const filterButton = page
        .getByRole('button', {name: /products$/i})
        .first();
      await filterButton.click();

      // Both should be in the URL
      await expect(page).toHaveURL(/filter\./);
      await expect(page).toHaveURL(/sort_by=PRICE_LOW_TO_HIGH/);
    });
  });
});
