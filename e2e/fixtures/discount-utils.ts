import {expect, Page} from '@playwright/test';

export class DiscountUtil {
  constructor(private page: Page) {}

  async applyCode(code: string) {
    const input = this.page.getByRole('textbox', {name: 'Discount code'});
    await input.fill(code);
    await this.page.getByRole('button', {name: 'Apply discount code'}).click();
  }

  async assertAppliedCode(code: string) {
    const discounts = this.page.getByLabel('Discount(s)');
    await expect(
      discounts.getByRole('group').filter({hasText: code}),
    ).toBeVisible();
  }

  async removeCode() {
    await this.page.getByRole('button', {name: 'Remove discount'}).click();
  }

  async assertNoDiscounts() {
    const discounts = this.page
      .locator('main:visible')
      .getByLabel('Discount(s)');
    await expect(discounts.getByRole('group')).not.toBeVisible();
  }
}
