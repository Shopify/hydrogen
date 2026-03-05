import {expect, type Locator, type Page} from '@playwright/test';

export class InfiniteScrollUtil {
  constructor(private page: Page) {}

  async navigateToCollection(handle: string) {
    await this.page.goto(`/collections/${handle}`);
    await expect(this.page).toHaveURL(new RegExp(`/collections/${handle}`));
  }

  getProducts() {
    return this.page.getByRole('heading', {level: 4});
  }

  getLoadMoreButton() {
    return this.page.getByRole('link', {name: /load more/i});
  }

  async assertProductCountGreaterThan(minCount: number) {
    const count = await this.getProductCount();
    expect(count).toBeGreaterThan(minCount);
  }

  async assertLoadMoreButtonVisible() {
    await expect(this.getLoadMoreButton()).toBeVisible();
  }

  async clickLoadMore() {
    const loadMoreButton = this.getLoadMoreButton();
    await expect(loadMoreButton).toBeVisible();
    await loadMoreButton.click();
  }

  async scrollIntoView(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  async assertUrlDoesNotContainParam(param: string) {
    const url = new URL(this.page.url());
    expect(url.searchParams.has(param)).toBe(false);
  }

  async getProductCount() {
    const products = this.getProducts();
    await expect(products.first()).toBeVisible();
    return products.count();
  }

  async waitForProductCountToChange(initialCount: number) {
    await expect
      .poll(async () => this.getProducts().count())
      .not.toBe(initialCount);
  }

  async waitForProductCountToIncrease(initialCount: number) {
    await expect
      .poll(async () => this.getProducts().count())
      .toBeGreaterThan(initialCount);
  }

  async getHistoryLength() {
    return this.page.evaluate(() => window.history.length);
  }

  async assertHistoryLength(expectedLength: number) {
    const actualLength = await this.getHistoryLength();
    expect(actualLength).toBe(expectedLength);
  }
}
