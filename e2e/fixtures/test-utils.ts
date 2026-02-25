import {expect, Page} from '@playwright/test';

export const cart = {
  assertInCart: async (page: Page, productName: string) => {
    const lineItems = page.getByLabel('Line items');
    await expect(
      lineItems.getByRole('listitem').filter({hasText: productName}),
    ).toBeVisible();
  },
  assertSubtotal: async (page: Page, formattedAmount: string) => {
    const cartTotals = page.getByLabel('Totals');
    const subtotal = cartTotals
      .getByRole('group')
      .filter({hasText: 'Subtotal'});
    await expect(
      subtotal.getByRole('definition').filter({hasText: formattedAmount}),
    ).toBeVisible();
  },
};
