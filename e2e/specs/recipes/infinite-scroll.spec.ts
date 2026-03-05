import {test, expect, setRecipeFixture} from '../../fixtures';
import {InfiniteScrollUtil} from '../../fixtures/infinite-scroll-utils';

setRecipeFixture({
  recipeName: 'infinite-scroll',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Infinite Scroll recipe, which implements automatic pagination
 * on collection pages using the Intersection Observer API.
 *
 * Tests cover:
 * - Initial product loading
 * - "Load more" button visibility and interaction
 * - Automatic loading when scrolling into view
 * - URL state management with replace mode (no history clutter)
 * - Scroll position preservation
 */

// Using backcountry or freeride collections which have many products for pagination testing
const TEST_COLLECTION = 'backcountry';

test.describe('Infinite Scroll Recipe', () => {
  test.describe('Initial Load', () => {
    test('displays collection with initial products', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      // Should have products visible
      await scroll.assertProductCountGreaterThan(0);

      // Collection heading should be visible
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    });

    test('shows load more button when more products exist', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      // Should show load more button (assuming "all" collection has pagination)
      await scroll.assertLoadMoreButtonVisible();
    });
  });

  test.describe('Manual Loading', () => {
    test('clicking load more button navigates and updates products', async ({
      page,
    }) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      // Get initial product count
      const initialCount = await scroll.getProductCount();
      expect(initialCount).toBeGreaterThan(0);

      // Click load more - this should trigger navigation
      await scroll.clickLoadMore();

      // Wait for product count to change (indicates products have loaded)
      await scroll.waitForProductCountToChange(initialCount);
    });

    test('updates URL with pagination parameters', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      // Initial load should not have pagination params
      await scroll.assertUrlDoesNotContainParam('cursor');

      // Click load more
      await scroll.clickLoadMore();

      // Wait for URL to change (indicates navigation happened)
      await expect
        .poll(
          () =>
            new URL(page.url()).searchParams.has('cursor') ||
            new URL(page.url()).searchParams.has('after'),
        )
        .toBe(true);
    });
  });

  test.describe('Automatic Loading (Intersection Observer)', () => {
    test('automatically loads when load more button scrolls into view', async ({
      page,
    }) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      const initialCount = await scroll.getProductCount();
      expect(initialCount).toBeGreaterThan(0);

      // Scroll the load more button into view to trigger intersection observer
      const loadMoreButton = scroll.getLoadMoreButton();
      await scroll.scrollIntoView(loadMoreButton);

      // Wait for product count to increase (indicates automatic loading triggered)
      // With infinite scroll, products accumulate, so count should be greater
      await scroll.waitForProductCountToIncrease(initialCount);
    });
  });

  test.describe('History Management', () => {
    test('uses replace mode to avoid cluttering browser history', async ({
      page,
    }) => {
      const scroll = new InfiniteScrollUtil(page);

      // Navigate to collection
      await scroll.navigateToCollection(TEST_COLLECTION);

      // Get initial history length and product count
      const initialHistoryLength = await scroll.getHistoryLength();
      const initialCount = await scroll.getProductCount();

      // Scroll load more into view to trigger automatic loading
      const loadMoreButton = scroll.getLoadMoreButton();
      await scroll.scrollIntoView(loadMoreButton);

      // Wait for products to load (indicates navigation happened)
      await scroll.waitForProductCountToChange(initialCount);

      // History length should be the same (replace mode, not push)
      await scroll.assertHistoryLength(initialHistoryLength);
    });
  });

  test.describe('Edge Cases', () => {
    test('handles collections with no pagination gracefully', async ({
      page,
    }) => {
      const scroll = new InfiniteScrollUtil(page);

      // Navigate to a potentially small collection (hydrogen in demo store)
      await page.goto('/collections/hydrogen');

      // Wait for at least one product to be visible (indicates page loaded)
      const products = scroll.getProducts();
      await expect(products.first()).toBeVisible();

      const count = await products.count();
      expect(count).toBeGreaterThan(0);

      // If no pagination needed, load more might not be visible
      // This is expected behavior, not an error
    });
  });
});
