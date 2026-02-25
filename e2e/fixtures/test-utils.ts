import {expect, Page} from '@playwright/test';

export const cart = {
  assertInCart: async (page: Page, productName: string) => {
    const lineItems = page.getByLabel('Line items');
    await expect(
      lineItems.getByRole('listitem').filter({hasText: productName}),
    ).toBeVisible();
  },
};
