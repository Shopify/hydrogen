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

// backcountry is stable in the fixture store and consistently exercises pagination.
const TEST_COLLECTION = 'backcountry';

test.describe('Infinite Scroll Recipe', () => {
  test.describe('Initial Load', () => {
    test('displays collection with initial products', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      await scroll.assertProductCountGreaterThan(0);

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
      expect(initialCount).toBeGreaterThan(0);

      await scroll.clickLoadMore();

      // Infinite scroll should append products, not replace them.
      await scroll.waitForProductCountToIncrease(initialCount);
    });

    test('updates URL with pagination parameters', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      await scroll.assertUrlDoesNotContainParam('cursor');
      await scroll.assertUrlDoesNotContainParam('after');

      await scroll.clickLoadMore();

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

      const loadMoreButton = scroll.getLoadMoreButton();
      await expect(loadMoreButton).toBeVisible();

      await expect
        .poll(async () => {
          await page.mouse.wheel(0, 1200);
          return scroll.getProductCount();
        })
        .toBeGreaterThan(initialCount);
    });
  });

  test.describe('History Management', () => {
    test('uses replace mode to avoid cluttering browser history', async ({
      page,
    }) => {
      const scroll = new InfiniteScrollUtil(page);

      await scroll.navigateToCollection(TEST_COLLECTION);

      // Playwright starts each test with a new browser context, so this baseline is stable.
      // We assert relative history growth rather than an absolute value.
      const initialHistoryLength = await scroll.getHistoryLength();
      const initialCount = await scroll.getProductCount();

      await scroll.clickLoadMore();

      await scroll.waitForProductCountToIncrease(initialCount);

      await scroll.assertHistoryLength(initialHistoryLength);
    });

    test('keeps scroll position when new products load', async ({page}) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      const loadMoreButton = scroll.getLoadMoreButton();
      await loadMoreButton.scrollIntoViewIfNeeded();

      const initialCount = await scroll.getProductCount();
      const initialScrollY = await scroll.getScrollY();

      await scroll.clickLoadMore();
      await scroll.waitForProductCountToIncrease(initialCount);

      await expect
        .poll(() => scroll.getScrollY())
        .toBeGreaterThanOrEqual(initialScrollY);
    });
  });

  test.describe('Edge Cases', () => {
    test('handles collections with no pagination gracefully', async ({
      page,
    }) => {
      const scroll = new InfiniteScrollUtil(page);
      await scroll.navigateToCollection(TEST_COLLECTION);

      const initialCount = await scroll.getProductCount();
      let previousCount = initialCount;

      while (true) {
        const loadMoreButton = scroll.getLoadMoreButton();
        if ((await loadMoreButton.count()) === 0) {
          break;
        }

        await scroll.clickLoadMore();
        await scroll.waitForProductCountToIncrease(previousCount);
        previousCount = await scroll.getProductCount();
      }

      await expect(scroll.getLoadMoreButton()).toHaveCount(0);
      expect(previousCount).toBeGreaterThan(initialCount);
    });
  });
});
