import {expect, Page} from '@playwright/test';

export const cart = {
  navigateToCartPage: async (page: Page) => {
    // Wait for any in-flight cart mutations to complete before navigation.
    // Without this, the cart page may fetch stale data and appear empty.
    await page.waitForLoadState('networkidle');
    await page.goto('/cart');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    const lineItems = page.getByLabel('Line items').locator('> li:visible');
    await expect(lineItems.first()).toBeVisible();
  },
  closeCartAside: async (page: Page) => {
    const closeButton = page
      .getByRole('dialog')
      .getByRole('button', {name: 'Close'});
    await closeButton.click();
  },
};

export const giftCard = {
  applyCode: async (page: Page, code: string) => {
    const input = page.getByRole('textbox', {name: 'Gift card code'});
    await input.fill(code);
    await page.getByRole('button', {name: 'Apply gift card code'}).click();
    await expect(input).toHaveValue('');
  },
  tryApplyCode: async (page: Page, code: string) => {
    const input = page.getByRole('textbox', {name: 'Gift card code'});
    await input.fill(code);
    await page.getByRole('button', {name: 'Apply gift card code'}).click();
  },
  assertAppliedCard: async (page: Page, lastFourChars: string) => {
    const giftCards = page.getByLabel('Applied Gift Card(s)');
    await expect(
      giftCards.getByRole('group').filter({hasText: `***${lastFourChars}`}),
    ).toBeVisible();
  },
  removeCard: async (page: Page, lastFourChars: string) => {
    const giftCards = page.getByLabel('Applied Gift Card(s)');
    const cardGroup = giftCards
      .getByRole('group')
      .filter({hasText: `***${lastFourChars}`});
    await cardGroup.getByRole('button', {name: 'Remove gift card'}).click();
  },
  assertCardRemoved: async (page: Page, lastFourChars: string) => {
    const giftCards = page.getByLabel('Applied Gift Card(s)');
    await expect(
      giftCards.getByRole('group').filter({hasText: `***${lastFourChars}`}),
    ).not.toBeVisible();
  },
  assertNoGiftCards: async (page: Page) => {
    const giftCards = page.getByLabel('Applied Gift Card(s)');
    await expect(giftCards.getByRole('group')).not.toBeVisible();
  },
};
