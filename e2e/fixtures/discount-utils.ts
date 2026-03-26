import {expect, Page} from '@playwright/test';

export class DiscountUtil {
  constructor(private page: Page) {}

  async applyCode(code: string) {
    const input = this.page.getByRole('textbox', {name: 'Discount code'});
    await input.fill(code);
    await this.page.getByRole('button', {name: 'Apply discount code'}).click();

    // Wait for discount to be processed (short timeout for invalid codes)
    if (code.trim() !== '') {
      const discounts = this.page
        .getByLabel('Cart page')
        .getByLabel('Discounts');
      try {
        await discounts
          .getByRole('group')
          .waitFor({state: 'visible', timeout: 2000});
      } catch {
        // Invalid code - no discount applied, which is fine
      }
    }
  }

  async assertAppliedCode(code: string) {
    const discounts = this.page.getByLabel('Cart page').getByLabel('Discounts');
    await expect(
      discounts.getByRole('group').filter({hasText: code}),
    ).toBeVisible();
  }

  async removeCode() {
    await this.page.getByRole('button', {name: 'Remove discount'}).click();

    // Wait for discount to be removed
    const discounts = this.page.getByLabel('Cart page').getByLabel('Discounts');
    await expect(discounts.getByRole('group')).not.toBeVisible();
  }

  async assertNoDiscounts() {
    const discounts = this.page.getByLabel('Cart page').getByLabel('Discounts');
    await expect(discounts.getByRole('group')).not.toBeVisible();
  }

  async assertCodeNotPresent(code: string) {
    const discounts = this.page.getByText(code);
    await expect(discounts).toHaveCount(0);
  }
}
