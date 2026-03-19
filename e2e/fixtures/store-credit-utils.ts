import {expect, Page} from '@playwright/test';

export class StoreCreditUtil {
  constructor(private page: Page) {}

  getSection() {
    return this.page.getByRole('region', {name: 'Store credit'});
  }

  getBalance() {
    return this.getSection().getByRole('definition');
  }

  async assertVisible(formattedAmount: string) {
    await expect(this.getSection()).toBeVisible();
    await expect(this.getBalance()).toContainText(formattedAmount);
  }

  async assertNotRendered() {
    await expect(this.getSection()).toHaveCount(0);
  }
}
