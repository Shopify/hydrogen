import {expect, type Page} from '@playwright/test';

export class InfiniteScrollUtil {
  constructor(private page: Page) {}

  async navigateToCollection(handle: string) {
    await this.page.goto(`/collections/${handle}`);
    await expect(this.page).toHaveURL(new RegExp(`/collections/${handle}`));
  }

  getProducts() {
    return this.page
      .getByRole('region', {name: 'Products'})
      .getByRole('heading', {level: 4});
  }

  getLoadMoreButton() {
    return this.page.getByRole('link', {name: /load more/i});
  }

  async assertLoadMoreButtonVisible() {
    await expect(this.getLoadMoreButton()).toBeVisible();
  }

  async clickLoadMore() {
    const loadMoreButton = this.getLoadMoreButton();
    await expect(loadMoreButton).toBeVisible();
    await loadMoreButton.click();
  }

  // Snapshot assertion (not web-first) — safe because callers invoke this
  // immediately after navigateToCollection, which already awaits toHaveURL.
  async assertUrlDoesNotContainParam(param: string) {
    const url = new URL(this.page.url());
    expect(url.searchParams.has(param)).toBe(false);
  }

  async waitForUrlToContainPaginationParam() {
    await expect(this.page).toHaveURL(
      (url) => url.searchParams.has('cursor') || url.searchParams.has('after'),
    );
  }

  getPreviousLink() {
    return this.page.getByRole('link', {name: /load previous/i});
  }

  /**
   * Captures the current paginated URL (which contains a cursor param)
   * for use in direct-navigation tests that simulate shared links.
   */
  getPaginatedUrl() {
    return this.page.url();
  }

  async getProductCount() {
    const products = this.getProducts();
    await expect(products.first()).toBeVisible();
    return products.count();
  }

  async assertProductCount(count: number) {
    await expect(this.getProducts()).toHaveCount(count);
  }

  /**
   * Waits for at least one new page of products to load. Use this instead of
   * assertProductCount when the final count is non-deterministic — the recipe's
   * preventScrollReset keeps the load-more button in the viewport, so the
   * Intersection Observer can fire multiple times and cascade through pages.
   */
  async waitForMoreProducts(previousCount: number) {
    await expect
      .poll(() => this.getProducts().count())
      .toBeGreaterThan(previousCount);
  }
}
