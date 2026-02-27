import {expect, Page} from '@playwright/test';

export class CartUtil {
  constructor(private page: Page) {}

  async navigateToCartPage() {
    await this.page.waitForLoadState('networkidle');
    await this.page.goto('/cart');
    await expect(this.page.getByRole('dialog')).not.toBeVisible();
    const lineItems = this.page
      .getByLabel('Line items')
      .locator('> li:visible');
    await expect(lineItems.first()).toBeVisible();
  }

  async closeCartAside() {
    const closeButton = this.page
      .getByRole('dialog')
      .getByRole('button', {name: 'Close'});
    await closeButton.click();
  }
}
