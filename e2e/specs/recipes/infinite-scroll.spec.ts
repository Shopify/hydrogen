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
 * - "Load previous" link when landing on a paginated URL (shared link scenario)
 * - Automatic loading when scrolling into view
 * - URL state management with replace mode (no history clutter)
 * - Scroll position preservation
 */

// backcountry is stable in the fixture store and consistently exercises pagination.
const TEST_COLLECTION = 'backcountry';
// Must match the fixture store's page size for the backcountry collection.
const PRODUCTS_PER_PAGE = 8;

// Why two assertion strategies:
// The recipe uses preventScrollReset, so the load-more button stays in the
// viewport after each page load. The Intersection Observer therefore keeps
// firing and cascades through all remaining pages. The exact final count
// depends on timing, so tests that trigger a load use waitForMoreProducts
// (greater-than). Only the initial page load — where no IO cascade occurs —
// uses assertProductCount (exact).

// Short viewport ensures the load-more button starts below the fold,
// so scrollIntoViewIfNeeded actually triggers the Intersection Observer.
const SCROLL_TEST_VIEWPORT = {width: 1280, height: 400};

test.describe('Infinite Scroll Recipe', () => {
  test.describe('Initial Load', () => {
    test('displays collection with initial products', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      await scroll.assertProductCount(PRODUCTS_PER_PAGE);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    });

    test('shows load more button when more products exist', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      await scroll.assertLoadMoreButtonVisible();
    });
  });

  test.describe('Manual Loading', () => {
    test('clicking load more button navigates and updates products', async ({
      page,
    }) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      const initialCount = await scroll.getProductCount();
      expect(initialCount).toBe(PRODUCTS_PER_PAGE);

      await scroll.clickLoadMore();
      await scroll.waitForMoreProducts(initialCount);
    });

    test('updates URL with pagination parameters', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      await scroll.assertUrlDoesNotContainParam('cursor');
      await scroll.assertUrlDoesNotContainParam('after');

      await scroll.clickLoadMore();
      await scroll.waitForUrlToContainPaginationParam();
    });
  });

  test.describe('Direct URL Navigation', () => {
    test('shows previous link when landing on a paginated URL', async ({
      page,
    }) => {
      // Simulate a user receiving a shared link to "page 2" of a collection.
      // First, obtain a valid paginated URL by triggering one load-more cycle.
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      await scroll.clickLoadMore();
      await scroll.waitForUrlToContainPaginationParam();
      const paginatedUrl = scroll.getPaginatedUrl();

      // Fresh navigation — no accumulated location.state from prior SPA clicks.
      await page.goto(paginatedUrl);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();

      await expect(scroll.getPreviousLink()).toBeVisible();
    });
  });

  test.describe('Automatic Loading (Intersection Observer)', () => {
    test('automatically loads when load more button scrolls into view', async ({
      page,
    }) => {
      await page.setViewportSize(SCROLL_TEST_VIEWPORT);

      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      const initialCount = await scroll.getProductCount();
      expect(initialCount).toBe(PRODUCTS_PER_PAGE);

      const loadMoreButton = scroll.getLoadMoreButton();
      await loadMoreButton.scrollIntoViewIfNeeded();

      await scroll.waitForMoreProducts(initialCount);
    });
  });

  test.describe('History Management', () => {
    test('uses replace mode so back button skips pagination state', async ({
      page,
    }) => {
      await page.setViewportSize(SCROLL_TEST_VIEWPORT);
      const scroll = new InfiniteScrollUtil(page);

      // Build a two-entry history: homepage → collection page.
      await page.goto('/');
      await scroll.navigateToCollection(TEST_COLLECTION);

      const initialCount = await scroll.getProductCount();
      const loadMoreButton = scroll.getLoadMoreButton();
      await loadMoreButton.scrollIntoViewIfNeeded();
      await scroll.waitForMoreProducts(initialCount);

      // If replace mode works, back should skip all pagination URLs
      // and return directly to the homepage.
      await page.goBack();
      await expect(page).toHaveURL('/');
    });

    test('keeps scroll position when new products load', async ({page}) => {
      await page.setViewportSize(SCROLL_TEST_VIEWPORT);
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      // Scroll down so we have a non-zero baseline, then trigger loading.
      const loadMoreButton = scroll.getLoadMoreButton();
      await loadMoreButton.scrollIntoViewIfNeeded();

      const initialScrollY = await page.evaluate(() => window.scrollY);
      expect(initialScrollY).toBeGreaterThan(0);

      const initialCount = await scroll.getProductCount();
      await scroll.waitForMoreProducts(initialCount);

      const finalScrollY = await page.evaluate(() => window.scrollY);
      expect(finalScrollY).toBeGreaterThanOrEqual(initialScrollY);
    });
  });
});
